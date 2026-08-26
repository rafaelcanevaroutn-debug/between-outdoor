const METRICOOL_API_BASE = 'https://app.metricool.com/api/'
const POSITIVE_INTEGER = /^[1-9]\d*$/u

export interface MetricoolConfig {
  token: string
  userId: number
  blogId: number
}

export interface MetricoolCalendarQuery {
  start: string
  end: string
  timezone: string
}

export type MetricoolNetwork = 'instagram' | 'facebook' | 'tiktok'

export interface MetricoolScheduledPostInput {
  publicationDate: {
    dateTime: string
    timezone: string
  }
  text: string
  providers: {network: MetricoolNetwork}[]
  media?: string[]
  autoPublish?: boolean
  draft?: boolean
  shortener?: boolean
  saveExternalMediaFiles?: boolean
  instagramData?: {
    autoPublish?: boolean
    type?: 'POST' | 'REEL' | 'STORY'
    showReelOnFeed?: boolean
  }
}

export interface MetricoolScheduledPostResult {
  id?: number
  uuid?: string
  draft?: boolean
  providers?: {network?: string; status?: string; publicUrl?: string; detailedStatus?: string}[]
  [key: string]: unknown
}

export type MetricoolPublicationState = 'draft' | 'scheduled' | 'published' | 'failed'

export class MetricoolApiError extends Error {
  readonly status: number
  readonly responseBody: string

  constructor(message: string, status: number, responseBody: string) {
    super(message)
    this.name = 'MetricoolApiError'
    this.status = status
    this.responseBody = responseBody
  }
}

export function metricoolConfigFromEnv(env: Record<string, string | undefined> = process.env): MetricoolConfig {
  const token = env.METRICOOL_API_TOKEN?.trim() ?? ''
  const userId = env.METRICOOL_USER_ID?.trim() ?? ''
  const blogId = env.METRICOOL_BLOG_ID?.trim() ?? ''
  if (!token || !POSITIVE_INTEGER.test(userId) || !POSITIVE_INTEGER.test(blogId)) {
    throw new Error('Metricool requiere METRICOOL_API_TOKEN, METRICOOL_USER_ID y METRICOOL_BLOG_ID válidos')
  }
  return {token, userId: Number(userId), blogId: Number(blogId)}
}

export function buildMetricoolApiUrl(pathname: string, config: MetricoolConfig, query: Record<string, string> = {}): URL {
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('..')) throw new Error('Ruta Metricool inválida')
  if (!config.token.trim() || !Number.isSafeInteger(config.userId) || config.userId < 1 || !Number.isSafeInteger(config.blogId) || config.blogId < 1) {
    throw new Error('Configuración Metricool inválida')
  }
  const url = new URL(pathname.slice(1), METRICOOL_API_BASE)
  url.searchParams.set('userId', String(config.userId))
  url.searchParams.set('blogId', String(config.blogId))
  for (const [key, value] of Object.entries(query)) {
    if (!key.trim() || !value.trim()) throw new Error(`Parámetro Metricool inválido: ${key || '(vacío)'}`)
    url.searchParams.set(key, value)
  }
  return url
}

async function metricoolRequest(params: {
  config: MetricoolConfig
  pathname: string
  query?: Record<string, string>
  method?: 'GET' | 'POST'
  body?: unknown
  fetchImpl?: typeof fetch
}): Promise<unknown> {
  const url = buildMetricoolApiUrl(params.pathname, params.config, params.query)
  const response = await (params.fetchImpl ?? fetch)(url, {
    method: params.method ?? 'GET',
    headers: {'X-Mc-Auth': params.config.token, 'Content-Type': 'application/json'},
    ...(params.body === undefined ? {} : {body: JSON.stringify(params.body)}),
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  })
  const rawBody = await response.text()
  if (!response.ok) {
    throw new MetricoolApiError(`Metricool respondió HTTP ${response.status}`, response.status, rawBody.slice(0, 1_000))
  }
  if (!rawBody.trim()) return null
  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    throw new Error('Metricool no devolvió JSON')
  }
}

export async function listMetricoolScheduledPosts(params: {
  config: MetricoolConfig
  query: MetricoolCalendarQuery
  fetchImpl?: typeof fetch
}): Promise<unknown> {
  const {start, end, timezone} = params.query
  if (!start.trim() || !end.trim() || !timezone.trim()) throw new Error('El rango y la zona horaria de Metricool son obligatorios')
  if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end)) || Date.parse(start) > Date.parse(end)) {
    throw new Error('Rango de calendario Metricool inválido')
  }
  return metricoolRequest({
    config: params.config,
    pathname: '/v2/scheduler/posts',
    query: {start, end, timezone},
    fetchImpl: params.fetchImpl,
  })
}

function assertScheduledPost(input: MetricoolScheduledPostInput) {
  if (!input.text.trim()) throw new Error('El texto de la publicación es obligatorio')
  if (!input.publicationDate.dateTime.trim() || !input.publicationDate.timezone.trim()) {
    throw new Error('La fecha y zona horaria de publicación son obligatorias')
  }
  if (Number.isNaN(Date.parse(input.publicationDate.dateTime))) throw new Error('Fecha de publicación inválida')
  if (!Array.isArray(input.providers) || input.providers.length === 0) throw new Error('Elegí al menos una red social')
  const allowed = new Set<MetricoolNetwork>(['instagram', 'facebook', 'tiktok'])
  if (input.providers.some(provider => !allowed.has(provider.network))) throw new Error('Red social no soportada por Between')
  if (input.media && (input.media.length === 0 || input.media.some(url => !/^https:\/\//u.test(url)))) {
    throw new Error('Metricool requiere URLs públicas HTTPS para el contenido multimedia')
  }
}

export async function createMetricoolScheduledPost(params: {
  config: MetricoolConfig
  post: MetricoolScheduledPostInput
  idempotencyKey: string
  fetchImpl?: typeof fetch
}): Promise<MetricoolScheduledPostResult> {
  assertScheduledPost(params.post)
  if (!/^[a-zA-Z0-9_-]{8,120}$/u.test(params.idempotencyKey)) throw new Error('Clave idempotente inválida')
  const response = await metricoolRequest({
    config: params.config,
    pathname: '/v2/scheduler/posts',
    query: {jobId: params.idempotencyKey},
    method: 'POST',
    body: params.post,
    fetchImpl: params.fetchImpl,
  })
  if (!response || typeof response !== 'object') throw new Error('Metricool no devolvió la publicación creada')
  const wrapped = response as {data?: unknown}
  const data = wrapped.data ?? response
  if (!data || typeof data !== 'object') throw new Error('Respuesta de publicación Metricool inválida')
  return data as MetricoolScheduledPostResult
}

export async function getMetricoolScheduledPost(params: {
  config: MetricoolConfig
  postId: number
  fetchImpl?: typeof fetch
}): Promise<MetricoolScheduledPostResult> {
  if (!Number.isSafeInteger(params.postId) || params.postId < 1) throw new Error('ID de publicación Metricool inválido')
  const response = await metricoolRequest({
    config: params.config,
    pathname: `/v2/scheduler/posts/${params.postId}`,
    fetchImpl: params.fetchImpl,
  })
  if (!response || typeof response !== 'object') throw new Error('Metricool no devolvió la publicación')
  const wrapped = response as {data?: unknown}
  const data = wrapped.data ?? response
  if (!data || typeof data !== 'object') throw new Error('Respuesta de publicación Metricool inválida')
  return data as MetricoolScheduledPostResult
}

export function metricoolPublicationState(post: MetricoolScheduledPostResult): MetricoolPublicationState {
  const statuses = (post.providers ?? [])
    .map(provider => provider.status?.toUpperCase())
    .filter((status): status is string => Boolean(status))
  if (statuses.includes('ERROR')) return 'failed'
  if (statuses.length > 0 && statuses.every(status => status === 'PUBLISHED')) return 'published'
  if (post.draft === true || statuses.includes('DRAFT')) return 'draft'
  return 'scheduled'
}

function normalizedMediaValue(response: unknown): string | null {
  if (typeof response === 'string' && response.trim()) return response.trim()
  if (!response || typeof response !== 'object') return null
  const record = response as Record<string, unknown>
  for (const candidate of [record.url, record.mediaId, record.data]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>
      for (const nestedCandidate of [nested.url, nested.mediaId]) {
        if (typeof nestedCandidate === 'string' && nestedCandidate.trim()) return nestedCandidate.trim()
      }
    }
  }
  return null
}

export async function normalizeMetricoolMediaUrl(params: {
  config: MetricoolConfig
  publicUrl: string
  fetchImpl?: typeof fetch
}): Promise<string> {
  if (!/^https:\/\//u.test(params.publicUrl)) throw new Error('La URL multimedia debe ser HTTPS y pública')
  const response = await metricoolRequest({
    config: params.config,
    pathname: '/actions/normalize/image/url',
    query: {url: params.publicUrl},
    fetchImpl: params.fetchImpl,
  })
  const normalized = normalizedMediaValue(response)
  if (!normalized) throw new Error('Metricool no devolvió una referencia multimedia utilizable')
  return normalized
}
