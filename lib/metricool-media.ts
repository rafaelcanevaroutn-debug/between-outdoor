import {createHmac, timingSafeEqual} from 'node:crypto'
import {listRenderSlides} from './google-drive.ts'

interface MetricoolMediaPiece {
  id: string
  formato: string | null
  render_status: string | null
  render_folder_id: string | null
  generation_metadata: Record<string, unknown> | null
}

function signingSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.SOCIAL_MEDIA_SIGNING_SECRET?.trim() || env.METRICOOL_MEDIA_SIGNING_SECRET?.trim() || ''
  if (secret.length < 32) throw new Error('SOCIAL_MEDIA_SIGNING_SECRET debe tener al menos 32 caracteres')
  return secret
}

function signaturePayload(contentId: string, index: number): string {
  if (!/^[0-9a-f-]{36}$/iu.test(contentId) || !Number.isSafeInteger(index) || index < 0 || index > 20) {
    throw new Error('Referencia multimedia inválida')
  }
  return `${contentId}:${index}`
}

export function signMetricoolMedia(contentId: string, index: number, env: Record<string, string | undefined> = process.env): string {
  return createHmac('sha256', signingSecret(env)).update(signaturePayload(contentId, index)).digest('hex')
}

export function verifyMetricoolMediaSignature(
  contentId: string,
  index: number,
  signature: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!/^[0-9a-f]{64}$/iu.test(signature)) return false
  const expected = signMetricoolMedia(contentId, index, env)
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
}

export function metricoolPublicAppUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.BETWEEN_PUBLIC_APP_URL?.trim() ?? ''
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('BETWEEN_PUBLIC_APP_URL no está configurada')
  }
  if (url.protocol !== 'https:') throw new Error('BETWEEN_PUBLIC_APP_URL debe usar HTTPS')
  return url.origin
}

export function buildMetricoolMediaUrl(params: {
  contentId: string
  index: number
  env?: Record<string, string | undefined>
}): string {
  const env = params.env ?? process.env
  const url = new URL(`/api/metricool/media/${params.contentId}/${params.index}`, metricoolPublicAppUrl(env))
  url.searchParams.set('signature', signMetricoolMedia(params.contentId, params.index, env))
  return url.toString()
}

function metadataRenderFileIds(metadata: Record<string, unknown> | null): string[] {
  const raw = metadata?.carrusel_render_files
  if (!Array.isArray(raw)) return []
  return raw.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
}

export async function resolveMetricoolDriveFileIds(piece: MetricoolMediaPiece): Promise<string[]> {
  if (piece.render_status !== 'rendered' || !piece.render_folder_id) {
    throw new Error('La pieza todavía no tiene un render final')
  }
  if (piece.formato === 'video' || piece.formato === 'banner') return [piece.render_folder_id]
  const persisted = metadataRenderFileIds(piece.generation_metadata)
  if (persisted.length > 0) return persisted
  const slides = await listRenderSlides(piece.render_folder_id)
  if (slides.length === 0) throw new Error('El carrusel no tiene slides renderizados')
  return slides.map(slide => slide.fileId)
}

export async function buildMetricoolMediaUrls(
  piece: MetricoolMediaPiece,
  env: Record<string, string | undefined> = process.env,
): Promise<string[]> {
  const fileIds = await resolveMetricoolDriveFileIds(piece)
  return fileIds.map((_, index) => buildMetricoolMediaUrl({contentId: piece.id, index, env}))
}

export function buildSocialMediaUrl(params: {
  contentId: string
  index: number
  env?: Record<string, string | undefined>
}): string {
  const env = params.env ?? process.env
  const url = new URL(`/api/social/media/${params.contentId}/${params.index}`, metricoolPublicAppUrl(env))
  url.searchParams.set('signature', signMetricoolMedia(params.contentId, params.index, env))
  return url.toString()
}

export async function buildSocialMediaUrls(
  piece: MetricoolMediaPiece,
  env: Record<string, string | undefined> = process.env,
): Promise<string[]> {
  const fileIds = await resolveMetricoolDriveFileIds(piece)
  return fileIds.map((_, index) => buildSocialMediaUrl({contentId: piece.id, index, env}))
}
