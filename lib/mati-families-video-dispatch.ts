import type { createAdminClient } from '@/lib/supabase/admin'
import type { BrandIdentity, VideoKnowledgeFormat, RenderApprovalStatus } from '@/types'
import {
  adaptReflexiveContentToStillImageWithMusic,
  createReflexiveVideoContent,
  pendingMatiContainerContractError,
  readPersistedRenderContainer,
} from './video-render-container.ts'

type AdminClient = ReturnType<typeof createAdminClient>

export type MatiVideoSubfamily =
  | 'reflexivo'
  | 'pov'
  | 'meme'
  | 'conversacional'
  | 'lugar'
  | 'comercial'
  | 'listicle_storytelling'
  | 'discurso'
  | 'barras_senal'
  | 'relato'
  | 'ficha'

export const MATI_VIDEO_SUBFAMILY_BY_INTERNAL = {
  '1a': 'discurso',
  '1b': 'barras_senal',
  '1c': 'relato',
  '2a': 'listicle_storytelling',
  '2b': 'listicle_storytelling',
  // 2c (Consejos) confirmado por Mati con el mismo slug y plantilla que
  // 2a/2b — mecanismo de render idéntico a nivel de estructura de datos
  // (secuencia de ventanas), el progress indicator (1/3, 2/3...) es solo
  // visual del template.
  '2c': 'listicle_storytelling',
  '3a': 'reflexivo',
  '3b': 'pov',
  '3c': 'meme',
  '3d': 'conversacional',
  '3e': 'lugar',
  '4': 'comercial',
  '5': 'ficha',
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
  referenceId?: string
  callbackUrl?: string
  subfamilia: MatiVideoSubfamily
  cliente: string
  titulo?: string
  title?: string
  mes: string
  subtitulo?: string | null
  subtitle?: string
  bullets: string[]
  cta: string | null
  color_primario: string
  color_texto: string
  fuente_titulo: string
  fuente_subtitulo: string
  carpeta: string
  carpetaId: string
  carpetaMusicaId?: string
  video_crudo?: string
  plantilla?: string
  imagen_estatica?: string
  tono_musical?: 'reflexivo' | 'comico' | 'epico'
  duracion_segundos?: 10
  animacion_texto?: 'kinetic_center'
  layout?: 'standard' | 'local_fixed_info'
}

export type FamiliesVideoPayloadResult =
  | { ok: true; payload: MatiFamiliesVideoPayload }
  | { ok: false; error: string }

export interface FamiliesVideoDispatchContext {
  admin: AdminClient
  matiVideoUrl: string | null
  matiToken?: string
  callbackUrl?: string | null
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  pollIntervalMs?: number
  maxPollAttempts?: number
  resolveVideoFolder?: (
    folderId: string,
    folderName: string,
  ) => Promise<{ folderId: string; folderName: string }>
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

function structuredData(value: unknown): Array<{ etiqueta: string; valor: string }> {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    const datum = objectValue(item)
    const etiqueta = stringValue(datum?.etiqueta)
    const valor = stringValue(datum?.valor)
    return etiqueta && valor ? [{ etiqueta, valor }] : []
  })
}

function capitalizeLabel(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-AR') + value.slice(1)
}

function monthLabel(mes: string | null, fechaInicio: string | null): string {
  if (mes?.trim()) return mes.trim()
  if (!fechaInicio) return ''
  const month = new Date(fechaInicio).toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' })
  return month.charAt(0).toUpperCase() + month.slice(1)
}

function resolveMusicFolderId(source: FamiliesVideoRenderSource): string | null {
  const explicitFolderId = stringValue(source.generationMetadata.music_folder_id)
  if (explicitFolderId) return explicitFolderId

  const zone = stringValue(source.generationMetadata.zona_geografica)
  const rawMap = process.env.MATI_MUSIC_FOLDER_MAP_JSON
  if (!zone || !rawMap) return null

  try {
    const parsed = JSON.parse(rawMap) as Record<string, unknown>
    const mappedFolderId = stringValue(parsed[zone])
    if (!mappedFolderId) return null

    // Alternancia estable: una pieza conserva siempre la misma decisión al
    // reintentarse, evitando que la música cambie por un Math.random().
    const checksum = [...source.id].reduce((sum, character) => sum + character.charCodeAt(0), 0)
    return checksum % 2 === 0 ? mappedFolderId : null
  } catch {
    console.warn('[MATI/VIDEO-FAMILIAS] MATI_MUSIC_FOLDER_MAP_JSON no contiene un JSON válido')
    return null
  }
}

export function buildFamiliesVideoPayload(
  source: FamiliesVideoRenderSource,
): FamiliesVideoPayloadResult {
  const typographyId = stringValue(source.contract.tipografia_id)
  if (!typographyId) return { ok: false, error: 'El contrato aprobado no tiene tipografia_id' }

  const pendingContainerError = pendingMatiContainerContractError(source.generationMetadata)
  if (pendingContainerError && !readPersistedRenderContainer(source.generationMetadata.render_container)) {
    return { ok: false, error: pendingContainerError }
  }

  const renderContainer = readPersistedRenderContainer(source.generationMetadata.render_container)
  let stillRenderFields: Pick<MatiFamiliesVideoPayload, 'plantilla' | 'imagen_estatica' | 'tono_musical' | 'duracion_segundos' | 'animacion_texto'> | null = null
  if (renderContainer?.kind === 'still_image_with_music') {
    if (source.subfamilia !== '3a') {
      return { ok: false, error: 'still_image_with_music solo admite contenido 3a/reflexivo' }
    }
    const copy = stringValue(source.contract.copy)
    if (!copy) return { ok: false, error: 'El contrato aprobado de Familia 3a no tiene copy' }
    const pending = adaptReflexiveContentToStillImageWithMusic(
      createReflexiveVideoContent(copy, typographyId),
      renderContainer,
    )
    stillRenderFields = pending.rendererPayloadFields
  }

  let titulo: string | null = null
  let title: string | null = null
  let subtitulo: string | null = null
  let subtitle: string | null = null
  let bullets: string[] = []
  let cta: string | null = null

  if (source.subfamilia === '5') {
    title = stringValue(source.contract.lugar)
    subtitle = stringValue(source.contract.subtitle)
    const datos = structuredData(source.contract.datos)
    bullets = datos.map(datum => `${capitalizeLabel(datum.etiqueta)}: ${datum.valor}`)
    if (!title || bullets.length < 3) {
      return { ok: false, error: 'El contrato aprobado de Familia 5 requiere lugar y al menos tres datos estructurados' }
    }
  } else if (source.subfamilia === '1a') {
    title = stringValue(source.contract.discurso)
    if (!title) return { ok: false, error: 'El contrato aprobado de Familia 1a no tiene discurso' }
  } else if (source.subfamilia === '2a' || source.subfamilia === '2c') {
    titulo = stringValue(source.contract.titulo)
    bullets = stringArray(source.contract.items)
    cta = stringValue(source.contract.cta)
    if (!titulo || bullets.length === 0 || !cta) {
      return { ok: false, error: `El contrato aprobado de Familia ${source.subfamilia} está incompleto` }
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
    const localFixedLayout = source.contract.layout === 'local_fixed_info'
    bullets = localFixedLayout ? stringArray(source.contract.items) : []
    cta = localFixedLayout ? stringValue(source.contract.cta) : null
    if (localFixedLayout && !cta) return { ok: false, error: 'El video informativo local requiere CTA' }
  } else if (source.subfamilia === '1c') {
    titulo = ''
    cta = null
  } else {
    titulo = stringValue(source.contract.copy)
    if (!titulo) return { ok: false, error: `El contrato aprobado de Familia ${source.subfamilia} no tiene copy` }
    cta = null
  }

  const videoCrudo = stringValue(source.videoCrudo)
  if (!videoCrudo && !stillRenderFields) return { ok: false, error: 'La pieza aprobada no tiene video_crudo/carpeta persistido' }

  const metadataFolderId = stringValue(source.generationMetadata.video_folder_id)
  const folderId = metadataFolderId ?? stringValue(source.brandIdentity?.videos_folder_id)
  if (!folderId) {
    return { ok: false, error: 'La pieza aprobada no tiene carpetaId y el cliente no tiene videos_folder_id configurado' }
  }

  const carpetaMusicaId = resolveMusicFolderId(source)

  return {
    ok: true,
    payload: {
      subfamilia: MATI_VIDEO_SUBFAMILY_BY_INTERNAL[source.subfamilia],
      cliente: stringValue(source.brandIdentity?.mati_cliente_id)
        ?? stringValue(source.ownerProfile.company_name)
        ?? stringValue(source.ownerProfile.full_name)
        ?? 'cliente',
      ...(title ? { title } : { titulo: titulo as string }),
      mes: monthLabel(source.mes, source.fechaInicio),
      ...(title ? (subtitle ? { subtitle } : {}) : { subtitulo }),
      bullets,
      cta,
      color_primario: stringValue(source.brandIdentity?.color_primario) ?? '',
      color_texto: stringValue(source.brandIdentity?.color_texto) ?? '',
      fuente_titulo: typographyId,
      fuente_subtitulo: stringValue(source.brandIdentity?.font_body) ?? typographyId,
      carpeta: videoCrudo ?? '',
      carpetaId: folderId,
      ...(carpetaMusicaId ? { carpetaMusicaId } : {}),
      plantilla: stillRenderFields?.plantilla ?? (
        source.subfamilia === '2a' || source.subfamilia === '2b' || source.subfamilia === '2c' ? 'TemplateNativeSequential'
        : source.subfamilia === '4' ? 'TemplateNativeCommercial'
        : source.subfamilia === '1b' ? 'TemplateFamilia1Motion'
        : source.subfamilia === '1a' || source.subfamilia === '1c' ? ''
        : source.subfamilia === '5' ? 'TemplateNativeDisplay'
        : undefined),
      ...(stillRenderFields ? {
        imagen_estatica: stillRenderFields.imagen_estatica,
        tono_musical: stillRenderFields.tono_musical,
        duracion_segundos: stillRenderFields.duracion_segundos,
        animacion_texto: stillRenderFields.animacion_texto,
      } : {}),
      ...(source.subfamilia === '4' && source.contract.layout === 'local_fixed_info'
        ? { layout: 'local_fixed_info' as const }
        : {}),
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

  // Resolver subcarpeta con videos si la carpeta raíz no tiene videos directos
  let resolvedCarpetaId = built.payload.carpetaId
  let resolvedCarpetaName = built.payload.carpeta
  try {
    const resolver = ctx.resolveVideoFolder ?? (async (folderId: string, folderName: string) => {
      const { resolveEffectiveVideoFolder } = await import('./google-drive.ts')
      return resolveEffectiveVideoFolder(folderId, folderName)
    })
    const resolved = await resolver(built.payload.carpetaId, built.payload.carpeta)
    resolvedCarpetaId = resolved.folderId
    resolvedCarpetaName = resolved.folderName
  } catch (err) {
    console.warn(`[MATI/VIDEO-FAMILIAS] Error resolviendo subcarpetas de video para ${source.id}:`, err)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
  }
  const payload: MatiFamiliesVideoPayload = {
    ...built.payload,
    carpetaId: resolvedCarpetaId,
    carpeta: resolvedCarpetaName,
    ...(ctx.callbackUrl ? {referenceId: source.id, callbackUrl: ctx.callbackUrl} : {}),
  }

  console.log(`[MATI/VIDEO-FAMILIAS] ── PAYLOAD id=${source.id} | subfamilia=${source.subfamilia} ──`)
  console.log(`[MATI/VIDEO-FAMILIAS] URL: ${matiVideoUrl}`)
  console.log('[MATI/VIDEO-FAMILIAS] Body:', JSON.stringify(payload, null, 2))

  let rawBody: string
  let responseStatus: number
  try {
    const response = await fetchImpl(matiVideoUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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

  if (ctx.callbackUrl) {
    console.log(`[MATI/VIDEO-FAMILIAS] id=${source.id} | jobId=${jobId} | seguimiento delegado al webhook`)
    return
  }

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

  console.log(`[MATI/VIDEO-FAMILIAS] Polling alcanzado (${maxPollAttempts} intentos), la pieza sigue en estado 'rendering' para jobId=${jobId}`)
}
