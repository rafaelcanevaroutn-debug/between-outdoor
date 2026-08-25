import type {
  AnyGeneratedPiece,
  CalendarBatchResult,
  CalendarBatchSlotResult,
  CalendarCode,
  ClientOnboarding,
  KnowledgeBase,
  Niche,
  Salida,
  TikTokIntelligence,
  VideoKnowledgeFormat,
  VideoTypographyId,
} from '@/types'
import { resolveWeeklyBatch } from '@/lib/calendar-resolver'
import { generateAdaptiveCarrusel, type HolidayInput } from '@/lib/generators/carrusel-formato'
import { generateContentForSalida } from '@/lib/gemini'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { listImagesInFolder, listImagesWithCategories } from '@/lib/google-drive'
import { mapPieceToInsertRow } from '@/lib/contenido-insert'
import { dispatchVideoRenders, dispatchCarruselRenders, type MatiInsertedRow } from '@/lib/mati-dispatch'
import { loadAntiPatterns, loadKnowledge } from '@/lib/knowledge-loader'
import { generateSlotPieces, type SlotPieceOutcome } from '@/lib/orchestrators/generate-slot-pieces'
import { markGeneratedSlotsRenderPending, reconcileSlotRenderStatuses } from '@/lib/calendar-render-status'
import { generateVideoFamilia1b } from '@/lib/generators/video-familia-1b'
import { generateVideoFamilia1c } from '@/lib/generators/video-familia-1c'
import { generateVideoFamilia2 } from '@/lib/generators/video-familia-2'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import { generateVideoFamilia5 } from '@/lib/generators/video-familia-5'
import type { createAdminClient } from '@/lib/supabase/admin'
import { claimBatchIndex } from '@/lib/batch-rotation'

// Video-familias del batch — elegido a mano por el usuario en
// WeeklyBatchPanel, completamente aparte de los slots de carrusel
// (calendar_catalog.ts no tiene ningún concepto de "slot de video" hoy).
export interface WeeklyBatchVideoPiezaInput {
  subfamilia: VideoKnowledgeFormat
  salidaId: string
  tipografiasPermitidas: VideoTypographyId[]
  canalesHabilitados?: string[]
  publicationDate?: string
}

/**
 * Orquestador del batch semanal de calendario — conecta las
 * implementaciones REALES de generación (Gemini, Drive) con
 * `generateSlotPieces` (lib/orchestrators/generate-slot-pieces.ts, la
 * parte testeable/pura) y con la persistencia + render de Mati.
 *
 * Pensado para correr dentro de `after()` — no es sincrónico con la
 * respuesta HTTP (ver app/api/generate-batch/route.ts).
 */

// ─── Orquestación real contra Supabase — pensada para after() ────────

export interface RunWeeklyBatchParams {
  runId: string
  clientId: string
  admin: ReturnType<typeof createAdminClient>
  videoPiezas?: WeeklyBatchVideoPiezaInput[]
}

export async function runWeeklyBatch({
  runId,
  clientId,
  admin,
  videoPiezas,
}: RunWeeklyBatchParams): Promise<void> {
  const nowIso = () => new Date().toISOString()

  try {
    await admin.from('calendar_batch_runs').update({ status: 'running', updated_at: nowIso() }).eq('id', runId)

    const { data: profile } = await admin.from('profiles').select('*').eq('id', clientId).single()
    if (!profile) throw new Error('Perfil del cliente no encontrado')

    const { data: salidaRows } = await admin.from('salidas').select('*').eq('user_id', clientId)
    const salidas = (salidaRows ?? []) as Salida[]
    const salidasById = new Map(salidas.map(s => [s.id, s]))

    const resolvedSlots = resolveWeeklyBatch({ calendarCode: profile.calendario_asignado as CalendarCode, salidas })
    const editorialBatchIndex = resolvedSlots.some(slot => slot.formatoCarrusel === 'editorial')
      ? await claimBatchIndex(admin, clientId, 'carrusel')
      : undefined

    const [{ data: clientOnboarding }, { data: brandIdentity }, { data: knowledgeBase }] = await Promise.all([
      admin.from('client_onboarding').select('*').eq('user_id', clientId).single(),
      admin.from('brand_identity').select('*').eq('user_id', clientId).single(),
      admin.from('knowledge_base').select('*').eq('niche', profile.niche).eq('activo', true).limit(10),
    ])

    const nichoExacto = (profile.niche as string).toLowerCase().trim()
    const { data: tiktokRaw } = await admin
      .from('tiktok_intelligence')
      .select('*')
      .eq('nicho', nichoExacto)
      .eq('es_referencia', true)
      .order('likes', { ascending: false })
      .limit(8)
    const tiktokExamples = ((tiktokRaw ?? []) as TikTokIntelligence[]).sort(
      (a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3),
    )

    const vozSlugCandidate = brandIdentity?.mati_cliente_id?.trim()
    const vozSlug = vozSlugCandidate && /^[a-z0-9_-]+$/i.test(vozSlugCandidate) ? vozSlugCandidate : undefined

    // Resolvemos las imágenes de cada salida necesaria (para carrusel)
    const hasPhotosBySalidaId = new Map<string, boolean>()
    const imageFilesBySalidaId = new Map<string, string[]>()
    const carpetaNombreBySalidaId = new Map<string, string | null>()

    const uniqueSalidaIdsForCarrusel = [...new Set(resolvedSlots.map(s => s.salidaId).filter(Boolean))] as string[]

    await Promise.all(uniqueSalidaIdsForCarrusel.map(async (salidaId) => {
      const salida = salidasById.get(salidaId)
      if (!salida) return

      const fotosId = salida.carpeta_fotos_id
      const fotosNombre = salida.carpeta_fotos_nombre

      if (fotosNombre) {
        carpetaNombreBySalidaId.set(salidaId, fotosNombre)
      }

      if (fotosId) {
        try {
          const categorizedImages = await listImagesWithCategories(fotosId)
          const filesWithCategory = categorizedImages
            .filter(img => img.mimeType.startsWith('image/'))
            .map(img => `[${img.category}] ${img.name}`)

          const imageFiles = [...new Set(filesWithCategory)].sort((a, b) => {
            const priority = (name: string) => (name.toLocaleLowerCase('es-AR').includes('pexels-') ? 0 : /\.(?:jpe?g|png|webp)$/i.test(name) ? 1 : 2)
            return priority(a) - priority(b) || a.localeCompare(b)
          })

          if (imageFiles.length > 0) {
            hasPhotosBySalidaId.set(salidaId, true)
            imageFilesBySalidaId.set(salidaId, imageFiles)
          } else {
            hasPhotosBySalidaId.set(salidaId, false)
          }
        } catch (e) {
          console.error('Error listando fotos para la salida %s:', salidaId, e)
          hasPhotosBySalidaId.set(salidaId, false)
        }
      } else {
        hasPhotosBySalidaId.set(salidaId, false)
      }
    }))

    const today = nowIso().slice(0, 10)
    const proximaFutura = salidas
      .filter(s => s.fecha_inicio >= today)
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0] ?? null

    // El slot "Calendario" usa la lógica real (varias salidas + feriados),
    // no la simplificación de una sola salida que usa el resolver.
    let calendarEnrichment: { futureSalidas: Salida[]; holidays: HolidayInput[] } | null = null
    if (resolvedSlots.some(s => s.formatoCarrusel === 'calendario') && proximaFutura) {
      const paisCodigo = proximaFutura.pais_codigo ?? 'AR'
      const [{ data: futureRows }, { data: holidayRows }] = await Promise.all([
        admin.from('salidas').select('*').eq('user_id', clientId).eq('pais_codigo', paisCodigo).gte('fecha_inicio', today).order('fecha_inicio').limit(3),
        admin.from('feriados').select('fecha, nombre, tipo, fuente').eq('pais', paisCodigo).gte('fecha', today).order('fecha'),
      ])
      calendarEnrichment = { futureSalidas: (futureRows ?? []) as Salida[], holidays: holidayRows ?? [] }
    }

    // Semilla de avoidConversationLines: historial reciente de conversación
    // de TODO el cliente (no una sola salida, como hace /api/generate hoy).
    const { data: recentConversation } = await admin
      .from('contenido_generado')
      .select('slides_data')
      .eq('user_id', clientId)
      .eq('formato_carrusel', 'conversacion')
      .order('created_at', { ascending: false })
      .limit(5)
    const avoidConversationLinesSeed = (recentConversation ?? []).flatMap(row => {
      if (!Array.isArray(row.slides_data)) return []
      return row.slides_data.flatMap((slide: unknown) => {
        if (!slide || typeof slide !== 'object') return []
        const text = (slide as { texto_principal?: unknown }).texto_principal
        return typeof text === 'string' && text.trim() ? [text.trim()] : []
      })
    })

    const outcomes = await generateSlotPieces(
      {
        slots: resolvedSlots,
        salidasById,
        niche: profile.niche as Niche,
        clientName: profile.company_name || profile.full_name || 'Cliente',
        clientOnboarding: (clientOnboarding as ClientOnboarding) ?? null,
        hasPhotosBySalidaId,
        imageFilesBySalidaId,
        carpetaNombreBySalidaId,
        calendarEnrichment,
        avoidConversationLinesSeed,
        knowledgeBase: (knowledgeBase || []) as KnowledgeBase[],
        tiktokExamples,
        objetivoGeneracion: 'vender_salida',
        antiPatternsText: loadAntiPatterns(),
        formatoTexts: {
          patronesText: profile.niche === 'trekking' ? loadKnowledge('nichos/trekking/patrones.md') : '',
          storytellingText: loadKnowledge('formatos/carrusel_storytelling.md'),
          reflexionText: loadKnowledge('formatos/reflexion.md'),
        },
        editorialBatchIndex,
      },
      { generateAdaptiveCarrusel, generateContentForSalida, evaluateCarruselEligibility },
    )

    // Persistencia aditiva — nunca borra contenido existente (a diferencia
    // de /api/generate, que borra todo lo de una salida antes de insertar;
    // acá varios slots pueden compartir la misma salida en el mismo batch).
    const successOutcomes = outcomes.filter(
      (o): o is SlotPieceOutcome & { piece: AnyGeneratedPiece } => o.outcome === 'generated' && Boolean(o.piece),
    )
    const toInsert = successOutcomes.map(o => {
      const salidaId = o.slot.salidaId as string
      return mapPieceToInsertRow(o.piece, {
        salidaId,
        userId: clientId,
        formatoCarrusel: o.slot.formatoCarrusel,
        objetivoInteraccion: 'convertir',
        carpetaFotos: carpetaNombreBySalidaId.get(salidaId) ?? '',
        destino: salidasById.get(salidaId)?.destino,
      })
    })

    let inserted: MatiInsertedRow[] = []
    if (toInsert.length > 0) {
      const { data, error } = await admin
        .from('contenido_generado')
        .insert(toInsert)
        .select('id, formato, formato_carrusel, objetivo_interaccion, descripcion_post, tema, angulo, slides_data, video_crudo, titulo, subtitulo, bullets, cta, mes')
      if (error) throw new Error(`Error insertando contenido_generado: ${error.message}`)
      // Supabase devuelve las filas de RETURNING en el mismo orden que el
      // array insertado — es seguro emparejar por índice con successOutcomes.
      inserted = (data ?? []) as MatiInsertedRow[]
    }

    const slots = markGeneratedSlotsRenderPending(outcomes.map(o => {
      const insertedIndex = successOutcomes.indexOf(o as SlotPieceOutcome & { piece: AnyGeneratedPiece })
      return {
        index: o.slot.index,
        label: o.slot.label,
        formatoCarrusel: o.slot.formatoCarrusel,
        salidaId: o.slot.salidaId,
        outcome: o.outcome,
        ...(o.reason ? { reason: o.reason } : {}),
        ...(insertedIndex >= 0 && inserted[insertedIndex] ? { contenidoId: inserted[insertedIndex].id } : {}),
      }
    }) satisfies CalendarBatchSlotResult[])

    // Video-familias opcional del batch — bloque aparte del pipeline de
    // carrusel de arriba, corre siempre (incluso si el carrusel generó
    // cero piezas esta semana). Cada pieza ya inserta con
    // render_status='pending_review' vía mapPieceToInsertRow, igual que
    // el flujo individual — nunca pasa por dispatchVideoRenders (eso es
    // solo para video legacy) ni se auto-dispara a Mati.
    let videoGenerated = 0
    let videoFailed = 0
    if (videoPiezas && videoPiezas.length > 0) {
      const commonVideoBase = {
        niche: profile.niche as Niche,
        clientName: profile.company_name || profile.full_name || 'Cliente',
        clientOnboarding: (clientOnboarding as ClientOnboarding) ?? null,
        vozSlug,
      }
      const videoRowsToInsert: Record<string, unknown>[] = []
      for (const pieza of videoPiezas) {
        const salidaVideo = salidasById.get(pieza.salidaId)
        if (!salidaVideo) {
          videoFailed += 1
          console.error(`[BATCH/VIDEO] salida ${pieza.salidaId} no pertenece a este cliente — se salta`)
          continue
        }
        const carpetaVideoNombre = salidaVideo.carpeta_videos_nombre ?? ''
        try {
          let piece: AnyGeneratedPiece
          if (pieza.subfamilia === '2a') {
            piece = await generateVideoFamilia2({ ...commonVideoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '2a', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '2b') {
            piece = await generateVideoFamilia2({ ...commonVideoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '2b', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '2c') {
            piece = await generateVideoFamilia2({ ...commonVideoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '2c', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '4') {
            piece = await generateVideoFamilia4({
              ...commonVideoBase,
              carpeta: carpetaVideoNombre,
              salida: salidaVideo,
              tipografiasPermitidas: pieza.tipografiasPermitidas,
              canalesHabilitados: pieza.canalesHabilitados ?? [],
              publicationDate: pieza.publicationDate,
            })
          } else if (pieza.subfamilia === '1a') {
            throw new Error('Familia 1a (Discurso) no está disponible en el batch semanal todavía')
          } else if (pieza.subfamilia === '1b') {
            piece = await generateVideoFamilia1b({ ...commonVideoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '1b', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '1c') {
            piece = await generateVideoFamilia1c({ subfamilia: '1c', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '5') {
            const generated = await generateVideoFamilia5({
              ...commonVideoBase,
              carpeta: carpetaVideoNombre,
              salida: salidaVideo,
              tipografiasPermitidas: pieza.tipografiasPermitidas,
              canalesHabilitados: pieza.canalesHabilitados ?? [],
              publicationDate: pieza.publicationDate,
            })
            if (!generated) continue
            piece = generated
          } else {
            piece = await generateVideoFamilia3({ ...commonVideoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: pieza.subfamilia, tipografiasPermitidas: pieza.tipografiasPermitidas })
          }
          videoRowsToInsert.push(mapPieceToInsertRow(piece, {
            salidaId: pieza.salidaId,
            userId: clientId,
            carpetaFotos: carpetaVideoNombre,
            carpetaFotosId: salidaVideo.carpeta_videos_id ?? undefined,
          }))
          videoGenerated += 1
        } catch (err) {
          videoFailed += 1
          console.error(`[BATCH/VIDEO] Error generando ${pieza.subfamilia} para salida ${pieza.salidaId}:`, err)
        }
      }
      if (videoRowsToInsert.length > 0) {
        const { error: videoInsertError } = await admin.from('contenido_generado').insert(videoRowsToInsert)
        if (videoInsertError) {
          console.error('[BATCH/VIDEO] Error insertando piezas de video:', videoInsertError.message)
        }
      }
    }

    let result: CalendarBatchResult = {
      calendarCode: profile.calendario_asignado as CalendarCode,
      generated: successOutcomes.length,
      failed: outcomes.length - successOutcomes.length,
      slots,
      ...(videoPiezas && videoPiezas.length > 0 ? { videoGenerated, videoFailed } : {}),
    }

    await admin
      .from('calendar_batch_runs')
      .update({ status: inserted.length === 0 ? 'completed' : 'running', result, updated_at: nowIso() })
      .eq('id', runId)

    if (inserted.length === 0) return

    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+$/, '')
    const matiCarruselUrl = matiBase ? `${matiBase}/api/generar-carrusel` : null
    const matiVideoUrl = process.env.MATI_SKILL_VIDEOS_URL || (matiBase ? `${matiBase}/api/generar-video` : null)
    const matiCliente = brandIdentity?.mati_cliente_id || profile?.company_name || profile?.full_name || 'cliente'
    const matiToken = process.env.MATI_SKILL_TOKEN?.trim()

    if (!matiBase && !process.env.MATI_SKILL_VIDEOS_URL) {
      console.warn('[MATI] MATI_SKILL_URL y MATI_SKILL_VIDEOS_URL no configuradas — saltando renderizado')
    } else {
      const matiCtx = { admin, matiBase, matiCarruselUrl, matiVideoUrl, matiCliente, matiToken }
      const videoRows = inserted.filter(r => r.formato === 'video')

      const carruselRows = inserted.filter(r => (r.formato === 'carrusel' || r.formato === 'carrusel_promo') && r.slides_data)

      // Ya estamos dentro del after() del batch (ver route.ts) — corremos el
      // dispatch directo, sin anidar otro after() (no es el contexto para eso).
      if (videoRows.length > 0) {
        await dispatchVideoRenders(videoRows, matiCtx)
      }

      // Enviamos carruseles también
      if (carruselRows.length > 0) {
        // En el batch resolvemos la carpeta por salida. El generador ya guardó
        // el nombre de la carpeta en video_crudo. Podemos usar ese valor o undefined
        // y dejar que dispatchCarruselRenders tome el video_crudo (wait, dispatchCarruselRenders
        // usa el capturedCarpetaFotos si se le pasa, de lo contrario no lo manda, lo que
        // está bien porque el crudo no es confiable). Pero en el batch, resolvemos
        // carpetaNombreBySalidaId. Lo pasaremos como undefined para que use el default.
        await dispatchCarruselRenders(carruselRows, matiCtx)
      }
    }

    const contenidoIds = inserted.map(row => row.id)
    const { data: renderedRows, error: renderLookupError } = await admin
      .from('contenido_generado')
      .select('id, render_folder_id')
      .in('id', contenidoIds)
    if (renderLookupError) {
      throw new Error(`Error reconciliando renders del batch: ${renderLookupError.message}`)
    }

    const renderedContenidoIds = new Set(
      (renderedRows ?? [])
        .filter(row => Boolean(row.render_folder_id))
        .map(row => row.id as string),
    )
    result = {
      ...result,
      slots: reconcileSlotRenderStatuses(result.slots, renderedContenidoIds),
    }

    await admin
      .from('calendar_batch_runs')
      .update({ status: 'completed', result, updated_at: nowIso() })
      .eq('id', runId)
  } catch (err) {
    console.error('[BATCH] Error corriendo el batch semanal:', err)
    await admin
      .from('calendar_batch_runs')
      .update({ status: 'error', error: err instanceof Error ? err.message : String(err), updated_at: nowIso() })
      .eq('id', runId)
  }
}
