import type { createAdminClient } from '@/lib/supabase/admin'
import type { BrandIdentity, VideoKnowledgeFormat, RenderApprovalStatus } from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

export type MatiVideoSubfamily =
  | 'reflexivo'
  | 'pov'
  | 'meme'
  | 'conversacional'
  | 'lugar'
  | 'comercial'
  | 'listicle_storytelling'
  // Placeholder sin confirmar con Mati — nunca debería llegar a
  // buildFamiliesVideoPayload: rebuildApprovedVideoContract bloquea la
  // aprobación de Familia 5 antes de este punto (ver video-approved-contract.ts).
  // Existe solo porque MATI_VIDEO_SUBFAMILY_BY_INTERNAL exige una entrada
  // por cada VideoKnowledgeFormat.
  | 'consejo'

export const MATI_VIDEO_SUBFAMILY_BY_INTERNAL = {
  '2a': 'listicle_storytelling',
  '2b': 'listicle_storytelling',
  '3a': 'reflexivo',
  '3b': 'pov',
  '3c': 'meme',
  '3d': 'conversacional',
  '3e': 'lugar',
  '4': 'comercial',
  '5': 'consejo',
} as const satisfies Record<VideoKnowledgeFormat, MatiVideoSubfamily>

export interface FamiliesVideoRenderSource {
  id: string
  subfamilia: VideoKnowledgeFormat
  contract: Record<string, unknown>
  generationMetadata: Record<string, unknown>
  videoCrudo: string | null
  mes: string | null
  fechaInicio: string | null
  ownerProfile: {
    company_name: string | null
    full_name: string | null
  }
  brandIdentity: Pick<
    BrandIdentity,
    | 'mati_cliente_id'
    | 'color_primario'
    | 'color_texto'
    | 'font_body'
    | 'videos_folder_id'
  > | null
}

export interface MatiFamiliesVideoPayload {
  subfamilia: MatiVideoSubfamily
  cliente: string
  titulo: string
  mes: string
  subtitulo: string | null
  bullets: string[]
  cta: string | null
  color_primario: string
  color_texto: string
  fuente_titulo: string
  fuente_subtitulo: string
  carpeta: string
  carpetaId: string
  video_crudo: string
}

export type FamiliesVideoPayloadResult =
  | { ok: true; payload: MatiFamiliesVideoPayload }
  | { ok: false; error: string }

export interface FamiliesVideoDispatchContext {
  admin: AdminClient
  matiVideoUrl: string | null
  matiToken?: string
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  pollIntervalMs?: number
  maxPollAttempts?: number
  persistRenderState?: (
    status: RenderApprovalStatus,
    metadataPatch: Record<string, unknown>,
    renderFolderId?: string,
  ) => Promise<void>
}

const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 72

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    : []
}

function monthLabel(mes: string | null, fechaInicio: string | null): string {
  if (mes?.trim()) return mes.trim()
  if (!fechaInicio) return ''
  const month = new Date(fechaInicio).toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' })
  return month.charAt(0).toUpperCase() + month.slice(1)
}

export function buildFamiliesVideoPayload(
  source: FamiliesVideoRenderSource,
): FamiliesVideoPayloadResult {
  const typographyId = stringValue(source.contract.tipografia_id)
  if (!typographyId) return { ok: false, error: 'El contrato aprobado no tiene tipografia_id' }

  let titulo: string | null = null
  let subtitulo: string | null = null
  let bullets: string[] = []
  let cta: string | null = null

  if (source.subfamilia === '2a') {
    titulo = stringValue(source.contract.titulo)
    bullets = stringArray(source.contract.items)
    cta = stringValue(source.contract.cta)
    if (!titulo || bullets.length === 0 || !cta) {
      return { ok: false, error: 'El contrato aprobado de Familia 2a está incompleto' }
    }
  } else if (source.subfamilia === '2b') {
    titulo = stringValue(source.contract.apertura)
    bullets = stringArray(source.contract.desarrollo)
    cta = stringValue(source.contract.cierre)
    if (!titulo || bullets.length === 0) {
      return { ok: false, error: 'El contrato aprobado de Familia 2b está incompleto' }
    }
  } else if (source.subfamilia === '4') {
    titulo = stringValue(source.contract.copy)
    subtitulo = stringValue(source.contract.dato_duro)
    if (!titulo || !subtitulo) return { ok: false, error: 'El contrato aprobado de Familia 4 requiere copy y dato_duro' }
    // El CTA comercial ya está integrado en copy y no se duplica en el campo cta.
    cta = null
  } else {
    titulo = stringValue(source.contract.copy)
    if (!titulo) return { ok: false, error: `El contrato aprobado de Familia ${source.subfamilia} no tiene copy` }
    cta = null
  }

  const videoCrudo = stringValue(source.videoCrudo)
  if (!videoCrudo) return { ok: false, error: 'La pieza aprobada no tiene video_crudo/carpeta persistido' }

  const metadataFolderId = stringValue(source.generationMetadata.video_folder_id)
  const folderId = metadataFolderId ?? stringValue(source.brandIdentity?.videos_folder_id)
  if (!folderId) {
    return { ok: false, error: 'La pieza aprobada no tiene carpetaId y el cliente no tiene videos_folder_id configurado' }
  }

  return {
    ok: true,
    payload: {
      subfamilia: MATI_VIDEO_SUBFAMILY_BY_INTERNAL[source.subfamilia],
      cliente: stringValue(source.brandIdentity?.mati_cliente_id)
        ?? stringValue(source.ownerProfile.company_name)
        ?? stringValue(source.ownerProfile.full_name)
        ?? 'cliente',
      titulo,
      mes: monthLabel(source.mes, source.fechaInicio),
      subtitulo,
      bullets,
      cta,
      color_primario: stringValue(source.brandIdentity?.color_primario) ?? '',
      color_texto: stringValue(source.brandIdentity?.color_texto) ?? '',
      fuente_titulo: typographyId,
      fuente_subtitulo: stringValue(source.brandIdentity?.font_body) ?? typographyId,
      carpeta: videoCrudo,
      carpetaId: folderId,
      video_crudo: videoCrudo,
    },
  }
}

async function updateRenderState(
  admin: AdminClient,
  id: string,
  status: RenderApprovalStatus,
  metadataPatch: Record<string, unknown>,
  renderFolderId?: string,
): Promise<void> {
  const { data: current } = await admin
    .from('contenido_generado')
    .select('generation_metadata')
    .eq('id', id)
    .maybeSingle()
  const currentMetadata = objectValue(current?.generation_metadata) ?? {}
  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    render_status: status,
    generation_metadata: { ...currentMetadata, ...metadataPatch },
    updated_at: now,
  }
  if (renderFolderId) update.render_folder_id = renderFolderId
  const { error } = await admin.from('contenido_generado').update(update).eq('id', id)
  if (error) throw new Error(`No se pudo persistir el estado ${status}: ${error.message}`)
}

async function failRender(
  ctx: FamiliesVideoDispatchContext,
  id: string,
  error: string,
  extraMetadata: Record<string, unknown> = {},
): Promise<void> {
  console.error(`[MATI/VIDEO-FAMILIAS] ✗ id=${id} | ${error}`)
  await persistState(ctx, id, 'failed', {
    ...extraMetadata,
    video_render_error: error,
    video_render_failed_at: new Date().toISOString(),
  })
}

async function persistState(
  ctx: FamiliesVideoDispatchContext,
  id: string,
  status: RenderApprovalStatus,
  metadataPatch: Record<string, unknown>,
  renderFolderId?: string,
): Promise<void> {
  if (ctx.persistRenderState) {
    await ctx.persistRenderState(status, metadataPatch, renderFolderId)
    return
  }
  await updateRenderState(ctx.admin, id, status, metadataPatch, renderFolderId)
}

export async function dispatchFamiliesVideoRender(
  source: FamiliesVideoRenderSource,
  ctx: FamiliesVideoDispatchContext,
): Promise<void> {
  const { matiVideoUrl, matiToken } = ctx
  const fetchImpl = ctx.fetchImpl ?? fetch
  const sleep = ctx.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
  const pollIntervalMs = ctx.pollIntervalMs ?? POLL_INTERVAL_MS
  const maxPollAttempts = ctx.maxPollAttempts ?? MAX_POLL_ATTEMPTS
  const built = buildFamiliesVideoPayload(source)
  if (!built.ok) {
    await failRender(ctx, source.id, built.error)
    return
  }
  if (!matiVideoUrl) {
    await failRender(ctx, source.id, 'MATI_SKILL_VIDEOS_URL no está configurada')
    return
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
  }

  console.log(`[MATI/VIDEO-FAMILIAS] ── PAYLOAD id=${source.id} | subfamilia=${source.subfamilia} ──`)
  console.log(`[MATI/VIDEO-FAMILIAS] URL: ${matiVideoUrl}`)
  console.log('[MATI/VIDEO-FAMILIAS] Body:', JSON.stringify(built.payload, null, 2))

  let rawBody: string
  let responseStatus: number
  try {
    const response = await fetchImpl(matiVideoUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(built.payload),
    })
    responseStatus = response.status
    rawBody = await response.text()
  } catch (error) {
    await failRender(ctx, source.id, `Error enviando el job: ${error instanceof Error ? error.message : error}`)
    return
  }

  if (responseStatus !== 202) {
    await failRender(ctx, source.id, `Mati respondió HTTP ${responseStatus}; esperaba 202`, {
      video_render_response: rawBody.slice(0, 500),
    })
    return
  }

  let jobId: string | null = null
  try {
    const parsed = JSON.parse(rawBody) as { jobId?: unknown }
    jobId = stringValue(parsed.jobId)
  } catch {
    // Se informa abajo con un único camino de error persistido.
  }
  if (!jobId) {
    await failRender(ctx, source.id, 'Mati respondió 202 sin un jobId válido')
    return
  }

  await persistState(ctx, source.id, 'rendering', {
    video_render_job_id: jobId,
    video_render_started_at: new Date().toISOString(),
    video_render_error: null,
  })

  const matiBase = matiVideoUrl.replace(/\/api\/[^/]+\/?$/u, '')
  const statusUrl = `${matiBase}/api/status/${jobId}`
  const statusHeaders = matiToken ? { Authorization: `Bearer ${matiToken}` } : undefined

  for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
    await sleep(pollIntervalMs)
    let statusData: { state?: string; result?: { driveFolderId?: string }; error?: string }
    try {
      const statusResponse = await fetchImpl(statusUrl, { headers: statusHeaders })
      if (!statusResponse.ok) continue
      statusData = await statusResponse.json()
    } catch {
      continue
    }

    if (statusData.state === 'completed') {
      const driveFolderId = stringValue(statusData.result?.driveFolderId)
      if (!driveFolderId) {
        await failRender(ctx, source.id, 'El job terminó sin driveFolderId', { video_render_job_id: jobId })
        return
      }
      await persistState(ctx, source.id, 'rendered', {
        video_render_job_id: jobId,
        video_render_completed_at: new Date().toISOString(),
        video_render_error: null,
      }, driveFolderId)
      console.log(`[MATI/VIDEO-FAMILIAS] ✓ id=${source.id} | jobId=${jobId} | driveFolderId=${driveFolderId}`)
      return
    }

    if (statusData.state === 'failed') {
      await failRender(ctx, source.id, statusData.error || 'Mati informó que el job falló', {
        video_render_job_id: jobId,
      })
      return
    }
  }

  await failRender(ctx, source.id, 'Timeout esperando el render de Mati', {
    video_render_job_id: jobId,
  })
}
