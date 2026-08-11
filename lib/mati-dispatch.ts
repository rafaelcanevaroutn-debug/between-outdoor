import type { createAdminClient } from '@/lib/supabase/admin'
import type { RenderApprovalStatus } from '@/types'

/**
 * Disparo de jobs de render hacia Mati (carrusel y video), extraído de
 * app/api/generate/route.ts para poder reusarlo desde el orquestador de
 * batch semanal (lib/orchestrators/weekly-batch.ts) sin duplicar la
 * lógica de polling. Comportamiento idéntico al que tenía inline.
 */

export interface MatiInsertedRow {
  id: string
  formato: string
  formato_carrusel: string | null
  objetivo_interaccion: string | null
  descripcion_post: string | null
  tema: string | null
  angulo: string | null
  slides_data: unknown
  video_crudo: string | null
  titulo: string | null
  subtitulo: string | null
  bullets: string[] | null
  cta: string | null
  mes: string | null
}

export interface MatiDispatchContext {
  admin: ReturnType<typeof createAdminClient>
  matiBase: string
  matiCarruselUrl: string | null
  matiVideoUrl: string | null
  matiCliente: string
  matiToken: string | undefined
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  pollIntervalMs?: number
  maxPollAttempts?: number
  persistCarruselRenderState?: (
    id: string,
    status: RenderApprovalStatus,
    metadataPatch: Record<string, unknown>,
    renderFolderId?: string,
  ) => Promise<void>
}

const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 72 // 6 minutos

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

async function persistCarruselState(
  ctx: MatiDispatchContext,
  id: string,
  status: RenderApprovalStatus,
  metadataPatch: Record<string, unknown>,
  renderFolderId?: string,
): Promise<void> {
  if (ctx.persistCarruselRenderState) {
    await ctx.persistCarruselRenderState(id, status, metadataPatch, renderFolderId)
    return
  }

  const { data: current } = await ctx.admin
    .from('contenido_generado')
    .select('generation_metadata')
    .eq('id', id)
    .maybeSingle()
  const currentMetadata = objectValue(current?.generation_metadata) ?? {}
  const update: Record<string, unknown> = {
    render_status: status,
    generation_metadata: { ...currentMetadata, ...metadataPatch },
    updated_at: new Date().toISOString(),
  }
  if (renderFolderId) update.render_folder_id = renderFolderId
  const { error } = await ctx.admin.from('contenido_generado').update(update).eq('id', id)
  if (error) throw new Error(`No se pudo persistir el estado ${status}: ${error.message}`)
}

async function failCarruselRender(
  ctx: MatiDispatchContext,
  id: string,
  error: string,
  metadataPatch: Record<string, unknown> = {},
): Promise<void> {
  console.error(`[MATI/CARRUSEL] ✗ id=${id} | ${error}`)
  await persistCarruselState(ctx, id, 'failed', {
    ...metadataPatch,
    carrusel_render_error: error,
    carrusel_render_failed_at: new Date().toISOString(),
  })
}

export async function dispatchCarruselRenders(
  rows: MatiInsertedRow[],
  ctx: MatiDispatchContext,
  capturedCarpetaFotos?: string,
): Promise<void> {
  if (rows.length === 0) {
    console.log('[MATI/CARRUSEL] Sin filas con slides_data — nada que enviar')
    return
  }

  const { matiCarruselUrl, matiCliente, matiToken } = ctx
  const fetchImpl = ctx.fetchImpl ?? fetch
  const sleep = ctx.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
  const pollIntervalMs = ctx.pollIntervalMs ?? POLL_INTERVAL_MS
  const maxPollAttempts = ctx.maxPollAttempts ?? MAX_POLL_ATTEMPTS
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
  }

  console.log(`[MATI/CARRUSEL] ── LOTE ${rows.length} carrusel(es) (background) ────────────`)
  console.log(`[MATI/CARRUSEL] URL:     ${matiCarruselUrl}`)
  console.log(`[MATI/CARRUSEL] Auth:    ${matiToken ? 'Bearer ***' : 'sin token'}`)
  console.log(`[MATI/CARRUSEL] Cliente: "${matiCliente}"`)
  console.log('[MATI/CARRUSEL] ────────────────────────────────────────────────────')

  const matiResults = await Promise.allSettled(
    rows.map(async row => {
      try {
        if (!matiCarruselUrl) {
          await failCarruselRender(ctx, row.id, 'MATI_SKILL_URL no está configurada para carrusel')
          return
        }
        const slidesClean = (row.slides_data as { n_slide: number; rol: string; tipo?: string; pill_text?: string | null; subtitle_highlight?: string | null; texto_principal: string | null; texto_apoyo: string | null; indicacion_imagen?: string; hablante?: string | null }[])
          .map(s => ({
            n_slide:           s.n_slide,
            rol:               s.rol,
            ...(s.tipo ? { tipo: s.tipo } : {}),
            ...(s.pill_text || s.hablante ? { pill_text: s.pill_text || s.hablante } : {}),
            ...(s.subtitle_highlight ? { subtitle_highlight: s.subtitle_highlight } : {}),
            ...(s.texto_principal    ? { texto_principal:    s.texto_principal }    : {}),
            ...(s.texto_apoyo        ? { texto_apoyo:        s.texto_apoyo }        : {}),
            ...(s.indicacion_imagen  ? { indicacion_imagen:  s.indicacion_imagen }  : {}),
          }))

        const payload: Record<string, unknown> = {
          cliente:              matiCliente,
          formato_carrusel:     row.formato_carrusel,
          objetivo_interaccion: row.objetivo_interaccion,
          descripcion_post:     row.descripcion_post,
          angulo:               row.angulo,
          tema:                 row.tema,
          slides:               slidesClean,
        }
        // Solo mandar carpeta si el usuario la eligió explícitamente en el FolderPicker.
        // row.video_crudo puede contener defaults como 'paisaje', 'guia' etc. que son
        // inválidos para Mati — no usarlo como fallback.
        if (capturedCarpetaFotos) payload.carpeta = capturedCarpetaFotos

        console.log(`[MATI/CARRUSEL] ── PAYLOAD id=${row.id} ──────────────────────`)
        console.log(`[MATI/CARRUSEL] formato=${row.formato} | tema=${row.tema} | slides=${slidesClean.length} | carpeta=${capturedCarpetaFotos ?? '(none)'}`)
        console.log('[MATI/CARRUSEL] Body:', JSON.stringify(payload, null, 2))

        // ── 1. Enviar job (espera 202 + jobId) ──────────────────────
        let res: Response
        let rawBody: string
        try {
          res = await fetchImpl(matiCarruselUrl, { method: 'POST', headers, body: JSON.stringify(payload) })
          rawBody = await res.text()
        } catch (error) {
          await failCarruselRender(ctx, row.id, `Error enviando el job: ${error instanceof Error ? error.message : error}`)
          return
        }

        console.log(`[MATI/CARRUSEL] id=${row.id} | HTTP ${res.status} | body: ${rawBody.slice(0, 500)}`)

        if (res.status !== 202) {
          console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | HTTP ${res.status} — esperaba 202`)
          console.error(`[MATI/CARRUSEL] Respuesta: ${rawBody}`)
          if (res.status === 400) console.error('[MATI/CARRUSEL] 400 Bad Request — revisar campos del payload')
          if (res.status === 401 || res.status === 403) console.error('[MATI/CARRUSEL] Auth rechazada — revisar MATI_SKILL_TOKEN')
          if (res.status === 404) console.error('[MATI/CARRUSEL] 404 — cliente no existe en Drive o endpoint incorrecto')
          if (res.status >= 500) console.error('[MATI/CARRUSEL] Error del servidor de Mati')
          await failCarruselRender(ctx, row.id, `Mati respondió HTTP ${res.status}; esperaba 202`, {
            carrusel_render_response: rawBody.slice(0, 500),
          })
          return
        }

        let jobData: { jobId?: string }
        try {
          jobData = JSON.parse(rawBody)
        } catch {
          console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | 202 OK pero body no es JSON válido: ${rawBody}`)
          await failCarruselRender(ctx, row.id, 'Mati respondió 202 con body inválido')
          return
        }

        const jobId = jobData.jobId
        if (!jobId) {
          console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | 202 OK pero no vino jobId en la respuesta`)
          await failCarruselRender(ctx, row.id, 'Mati respondió 202 sin un jobId válido')
          return
        }

        console.log(`[MATI/CARRUSEL] ✓ id=${row.id} | jobId=${jobId} | comenzando polling cada ${POLL_INTERVAL_MS / 1000}s`)
        await persistCarruselState(ctx, row.id, 'rendering', {
          carrusel_render_job_id: jobId,
          carrusel_render_started_at: new Date().toISOString(),
          carrusel_render_error: null,
        })

        // ── 2. Polling de estado ─────────────────────────────────────
        const statusUrl = `${ctx.matiBase}/api/status/${jobId}`
        const statusHeaders = matiToken ? { Authorization: `Bearer ${matiToken}` } : undefined

        for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
          await sleep(pollIntervalMs)

          let statusData: { state?: string; result?: { driveFolderId?: string }; error?: string }
          try {
            const statusRes = await fetchImpl(statusUrl, { headers: statusHeaders })
            if (!statusRes.ok) continue
            statusData = await statusRes.json()
          } catch (err) {
            console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | jobId=${jobId} | intento ${attempt} — error al consultar estado: ${err instanceof Error ? err.message : err}`)
            continue
          }

          const { state, result, error: jobError } = statusData
          console.log(`[MATI/CARRUSEL] id=${row.id} | jobId=${jobId} | intento ${attempt}/${MAX_POLL_ATTEMPTS} | state=${state ?? '(sin state)'}`)

          if (state === 'completed') {
            const driveFolderId = result?.driveFolderId ?? null
            console.log(`[MATI/CARRUSEL] ✓ id=${row.id} | jobId=${jobId} | completed | driveFolderId=${driveFolderId ?? '(no devuelto)'}`)
            if (driveFolderId) {
              await persistCarruselState(ctx, row.id, 'rendered', {
                carrusel_render_job_id: jobId,
                carrusel_render_completed_at: new Date().toISOString(),
                carrusel_render_error: null,
              }, driveFolderId)
            } else {
              await failCarruselRender(ctx, row.id, 'El job terminó sin driveFolderId', {
                carrusel_render_job_id: jobId,
              })
            }
            return
          }

          if (state === 'failed') {
            console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | jobId=${jobId} | failed | error: ${jobError ?? '(sin detalle)'}`)
            await failCarruselRender(ctx, row.id, jobError || 'Mati informó que el job falló', {
              carrusel_render_job_id: jobId,
            })
            return
          }

          // pending / processing — seguir esperando
        }

        console.warn(`[MATI/CARRUSEL] ⚠ id=${row.id} | jobId=${jobId} | timeout — no completó en ${(maxPollAttempts * pollIntervalMs) / 60_000} minutos`)
        await failCarruselRender(ctx, row.id, 'Timeout esperando el render de Mati', {
          carrusel_render_job_id: jobId,
        })
      } catch (err) {
        console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | Error inesperado: ${err instanceof Error ? err.message : err}`)
        try {
          await failCarruselRender(ctx, row.id, `Error inesperado: ${err instanceof Error ? err.message : err}`)
        } catch (persistError) {
          console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | no se pudo persistir failed: ${persistError instanceof Error ? persistError.message : persistError}`)
        }
      }
    })
  )

  const okCount  = matiResults.filter(r => r.status === 'fulfilled').length
  const errCount = matiResults.filter(r => r.status === 'rejected').length
  console.log(`[MATI/CARRUSEL] Lote completo — ✓ ${okCount} OK | ✗ ${errCount} errores`)
}

export async function dispatchVideoRenders(
  rows: MatiInsertedRow[],
  ctx: MatiDispatchContext,
  opts: { capturedCarpetaVideos?: string; capturedCarpetaVideosId?: string; fallbackFechaInicio?: string } = {},
): Promise<void> {
  if (rows.length === 0) {
    console.log('[MATI/VIDEO] Sin filas de video — nada que enviar')
    return
  }

  const { admin, matiVideoUrl, matiBase, matiCliente, matiToken } = ctx
  const { capturedCarpetaVideos, capturedCarpetaVideosId, fallbackFechaInicio } = opts
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
  }

  console.log(`[MATI/VIDEO] ── LOTE ${rows.length} video(s) (background) ────────────`)
  console.log(`[MATI/VIDEO] URL:     ${matiVideoUrl}`)
  console.log(`[MATI/VIDEO] Auth:    ${matiToken ? 'Bearer ***' : 'sin token'}`)
  console.log(`[MATI/VIDEO] Cliente: "${matiCliente}"`)
  console.log('[MATI/VIDEO] ────────────────────────────────────────────────────')

  const matiResults = await Promise.allSettled(
    rows.map(async row => {
      try {
        let mesCapitalized = row.mes || ''
        if (!mesCapitalized && fallbackFechaInicio) {
          const monthName = new Date(fallbackFechaInicio).toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' })
          mesCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)
        }

        const payload: Record<string, unknown> = {
          cliente:   matiCliente,
          titulo:    row.titulo || '',
          mes:       mesCapitalized,
          subtitulo: row.subtitulo || '',
          bullets:   row.bullets || '',
          cta:       row.cta || '',
          tema:      row.tema || '',
        }
        if (capturedCarpetaVideos) payload.carpeta = capturedCarpetaVideos
        if (capturedCarpetaVideosId) payload.carpetaId = capturedCarpetaVideosId

        console.log(`[MATI/VIDEO] ── PAYLOAD id=${row.id} ──────────────────────`)
        console.log(`[MATI/VIDEO] formato=${row.formato} | carpeta=${capturedCarpetaVideos ?? '(none)'}`)
        console.log('[MATI/VIDEO] Body:', JSON.stringify(payload, null, 2))

        const res = await fetch(matiVideoUrl as string, { method: 'POST', headers, body: JSON.stringify(payload) })
        const rawBody = await res.text()

        console.log(`[MATI/VIDEO] id=${row.id} | HTTP ${res.status} | body: ${rawBody.slice(0, 500)}`)

        if (res.status !== 202) {
          console.error(`[MATI/VIDEO] ✗ id=${row.id} | HTTP ${res.status} — esperaba 202`)
          return
        }

        let jobData: { jobId?: string }
        try {
          jobData = JSON.parse(rawBody)
        } catch {
          console.error(`[MATI/VIDEO] ✗ id=${row.id} | 202 OK pero body no es JSON válido: ${rawBody}`)
          return
        }

        const jobId = jobData.jobId
        if (!jobId) return

        console.log(`[MATI/VIDEO] ✓ id=${row.id} | jobId=${jobId} | comenzando polling cada 5s`)

        const matiVideoBase = (process.env.MATI_SKILL_VIDEOS_URL ?? matiBase).replace(/\/api\/[^/]+$/, '')
        const statusUrl = `${matiVideoBase}/api/status/${jobId}`
        const statusHeaders = matiToken ? { Authorization: `Bearer ${matiToken}` } : undefined

        for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

          let statusData: { state?: string; result?: { driveFolderId?: string }; error?: string }
          try {
            const statusRes = await fetch(statusUrl, { headers: statusHeaders })
            statusData = await statusRes.json()
          } catch {
            continue
          }

          const { state, result, error: jobError } = statusData
          if (state === 'completed') {
            const driveFolderId = result?.driveFolderId ?? null
            console.log(`[MATI/VIDEO] ✓ id=${row.id} | completed | driveFolderId=${driveFolderId ?? '(no devuelto)'}`)
            if (driveFolderId) {
              await admin.from('contenido_generado').update({ render_folder_id: driveFolderId }).eq('id', row.id)
            }
            return
          }
          if (state === 'failed') {
            console.error(`[MATI/VIDEO] ✗ id=${row.id} | failed | error: ${jobError ?? '(sin detalle)'}`)
            return
          }
        }
        console.warn(`[MATI/VIDEO] ⚠ id=${row.id} | jobId=${jobId} | timeout`)
      } catch (err) {
        console.error(`[MATI/VIDEO] ✗ id=${row.id} | Error inesperado: ${err instanceof Error ? err.message : err}`)
      }
    })
  )

  const okCount  = matiResults.filter(r => r.status === 'fulfilled').length
  const errCount = matiResults.filter(r => r.status === 'rejected').length
  console.log(`[MATI/VIDEO] Lote completo — ✓ ${okCount} OK | ✗ ${errCount} errores`)
}
