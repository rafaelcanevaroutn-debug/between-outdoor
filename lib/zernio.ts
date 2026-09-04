const ZERNIO_API_BASE = 'https://zernio.com/api/v1/'

export type ZernioPlatform = 'instagram' | 'tiktok' | 'facebook' | 'youtube'

export interface ZernioConfig {
  apiKey: string
}

export interface ZernioProfile {
  _id: string
  name: string
  description?: string | null
  color?: string | null
  isDefault?: boolean
  createdAt?: string
}

export interface ZernioAccount {
  _id?: string
  accountId?: string
  profileId?: string
  platform: ZernioPlatform | string
  username?: string | null
  displayName?: string | null
  isActive?: boolean
  status?: string
  [key: string]: unknown
}

export interface ZernioMediaItem {
  type: 'image' | 'video'
  url: string
  title?: string
}

export interface ZernioPostInput {
  title?: string
  content: string
  mediaItems: ZernioMediaItem[]
  platforms: {platform: ZernioPlatform; accountId: string}[]
  scheduledFor?: string
  publishNow?: boolean
  isDraft?: boolean
  timezone?: string
}

export interface ZernioPost {
  _id: string
  status: string
  scheduledFor?: string | null
  platforms?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export type ZernioAnalytics = Record<string, unknown>

export class ZernioApiError extends Error {
  readonly status: number
  readonly responseBody: string
  readonly code?: string

  constructor(
    message: string,
    status: number,
    responseBody: string,
    code?: string,
  ) {
    super(message)
    this.name = 'ZernioApiError'
    this.status = status
    this.responseBody = responseBody
    this.code = code
  }
}

export function zernioConfigFromEnv(env: Record<string, string | undefined> = process.env): ZernioConfig {
  const apiKey = env.ZERNIO_API_KEY?.trim() ?? ''
  if (!apiKey) throw new Error('Falta ZERNIO_API_KEY')
  return {apiKey}
}

export function buildZernioApiUrl(pathname: string, query: Record<string, string | undefined> = {}): URL {
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('..')) {
    throw new Error('Ruta Zernio inválida')
  }
  const url = new URL(pathname.slice(1), ZERNIO_API_BASE)
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    if (!key.trim() || !value.trim()) throw new Error(`Parámetro Zernio inválido: ${key || '(vacío)'}`)
    url.searchParams.set(key, value)
  }
  return url
}

async function zernioRequest<T>(params: {
  config: ZernioConfig
  pathname: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string | undefined>
  body?: unknown
  requestId?: string
  fetchImpl?: typeof fetch
}): Promise<T> {
  const fetchImpl = params.fetchImpl ?? fetch
  const url = buildZernioApiUrl(params.pathname, params.query)
  const response = await fetchImpl(url, {
    method: params.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${params.config.apiKey}`,
      Accept: 'application/json',
      ...(params.body !== undefined ? {'Content-Type': 'application/json'} : {}),
      ...(params.requestId ? {'x-request-id': params.requestId} : {}),
    },
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
    cache: 'no-store',
  })
  const rawBody = await response.text()
  let payload: unknown = null
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = null
    }
  }
  if (!response.ok) {
    const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
    const detail = typeof record?.error === 'string' ? record.error : `Zernio respondió HTTP ${response.status}`
    throw new ZernioApiError(detail, response.status, rawBody.slice(0, 1_000), typeof record?.code === 'string' ? record.code : undefined)
  }
  if (payload === null) throw new Error('Zernio no devolvió JSON')
  return payload as T
}

export async function createZernioProfile(params: {
  config: ZernioConfig
  name: string
  description?: string
  color?: string
  fetchImpl?: typeof fetch
}): Promise<ZernioProfile> {
  const name = params.name.trim()
  if (!name) throw new Error('El nombre del perfil Zernio es obligatorio')
  const response = await zernioRequest<{profile: ZernioProfile}>({
    config: params.config,
    pathname: '/profiles',
    method: 'POST',
    body: {name, ...(params.description?.trim() ? {description: params.description.trim()} : {}), ...(params.color ? {color: params.color} : {})},
    fetchImpl: params.fetchImpl,
  })
  if (!response.profile?._id) throw new Error('Zernio no devolvió el perfil creado')
  return response.profile
}

export async function listZernioProfiles(params: {
  config: ZernioConfig
  fetchImpl?: typeof fetch
}): Promise<ZernioProfile[]> {
  const response = await zernioRequest<{profiles?: ZernioProfile[]; data?: ZernioProfile[]}>({
    config: params.config,
    pathname: '/profiles',
    fetchImpl: params.fetchImpl,
  })
  return Array.isArray(response.profiles) ? response.profiles : Array.isArray(response.data) ? response.data : []
}

export async function listZernioAccounts(params: {
  config: ZernioConfig
  profileId: string
  fetchImpl?: typeof fetch
}): Promise<ZernioAccount[]> {
  if (!params.profileId.trim()) throw new Error('profileId es obligatorio')
  const response = await zernioRequest<{accounts?: ZernioAccount[]; data?: ZernioAccount[]}>({
    config: params.config,
    pathname: '/accounts',
    query: {profileId: params.profileId},
    fetchImpl: params.fetchImpl,
  })
  const accounts = Array.isArray(response.accounts) ? response.accounts : Array.isArray(response.data) ? response.data : []
  return accounts
}

export async function getZernioConnectUrl(params: {
  config: ZernioConfig
  platform: ZernioPlatform
  profileId: string
  redirectUrl: string
  fetchImpl?: typeof fetch
}): Promise<string> {
  if (!params.profileId.trim()) throw new Error('profileId es obligatorio')
  const redirect = new URL(params.redirectUrl)
  if (!['http:', 'https:'].includes(redirect.protocol)) throw new Error('redirectUrl inválida')
  const response = await zernioRequest<{authUrl: string}>({
    config: params.config,
    pathname: `/connect/${params.platform}`,
    query: {profileId: params.profileId, redirect_url: redirect.toString()},
    fetchImpl: params.fetchImpl,
  })
  const authUrl = response.authUrl?.trim()
  if (!authUrl || !/^https:\/\//iu.test(authUrl)) throw new Error('Zernio no devolvió una URL OAuth válida')
  return authUrl
}

export async function createZernioPost(params: {
  config: ZernioConfig
  post: ZernioPostInput
  requestId: string
  fetchImpl?: typeof fetch
}): Promise<ZernioPost> {
  if (process.env.NODE_ENV === 'development' || process.env.BETWEEN_PUBLIC_APP_URL?.includes('dummy')) {
    console.log('[ZERNIO MOCK] Simulando publicación exitosa en entorno de desarrollo:', params.post)
    return {
      _id: `mock-zernio-post-${Date.now()}`,
      status: 'SCHEDULED',
      scheduledFor: params.post.scheduledFor,
      platforms: params.post.platforms.map(p => ({
        platform: p.platform,
        accountId: p.accountId,
        status: 'SCHEDULED'
      }))
    }
  }

  if (!params.post.content.trim()) throw new Error('El copy de la publicación es obligatorio')
  if (params.post.platforms.length === 0) throw new Error('La publicación necesita al menos una cuenta social')
  if (params.post.mediaItems.some(item => !/^https:\/\//iu.test(item.url))) {
    throw new Error('Zernio requiere URLs públicas HTTPS para los renders')
  }
  const response = await zernioRequest<{post: ZernioPost}>({
    config: params.config,
    pathname: '/posts',
    method: 'POST',
    body: params.post,
    requestId: params.requestId,
    fetchImpl: params.fetchImpl,
  })
  if (!response.post?._id) throw new Error('Zernio no devolvió la publicación creada')
  return response.post
}

export async function getZernioPost(params: {
  config: ZernioConfig
  postId: string
  fetchImpl?: typeof fetch
}): Promise<ZernioPost> {
  if (!params.postId.trim()) throw new Error('postId es obligatorio')
  const response = await zernioRequest<{post: ZernioPost}>({
    config: params.config,
    pathname: `/posts/${encodeURIComponent(params.postId)}`,
    fetchImpl: params.fetchImpl,
  })
  if (!response.post?._id) throw new Error('Zernio no devolvió la publicación')
  return response.post
}

export async function cancelZernioPost(params: {
  config: ZernioConfig
  postId: string
  fetchImpl?: typeof fetch
}): Promise<void> {
  if (process.env.NODE_ENV === 'development' || process.env.BETWEEN_PUBLIC_APP_URL?.includes('dummy')) {
    console.log('[ZERNIO MOCK] Simulando cancelación de publicación en entorno de desarrollo:', params.postId)
    return
  }
  if (!params.postId.trim()) throw new Error('postId es obligatorio')
  await zernioRequest({
    config: params.config,
    pathname: `/posts/${encodeURIComponent(params.postId)}`,
    method: 'DELETE',
    fetchImpl: params.fetchImpl,
  })
}

export async function listZernioPosts(params: {
  config: ZernioConfig
  profileId: string
  startDate: string
  endDate: string
  fetchImpl?: typeof fetch
}): Promise<ZernioPost[]> {
  if (!params.profileId.trim()) throw new Error('profileId es obligatorio')
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(params.startDate) || !/^\d{4}-\d{2}-\d{2}$/u.test(params.endDate)) {
    throw new Error('Las fechas deben usar YYYY-MM-DD')
  }
  const response = await zernioRequest<any>({
    config: params.config,
    pathname: '/posts',
    query: {profileId: params.profileId, startDate: params.startDate, endDate: params.endDate},
    fetchImpl: params.fetchImpl,
  })
  console.log('RAW ZERNIO /posts response:', JSON.stringify(response, null, 2))
  return Array.isArray(response.posts) ? response.posts : Array.isArray(response.data) ? response.data : Array.isArray(response.items) ? response.items : []
}

export async function getZernioPostAnalytics(params: {
  config: ZernioConfig
  postId: string
  fetchImpl?: typeof fetch
}): Promise<ZernioAnalytics> {
  if (!params.postId.trim()) throw new Error('postId es obligatorio')
  return zernioRequest<ZernioAnalytics>({
    config: params.config,
    pathname: `/analytics/${encodeURIComponent(params.postId)}`,
    fetchImpl: params.fetchImpl,
  })
}

export async function getZernioAccountAnalytics(params: {
  config: ZernioConfig
  accountId: string
  startDate: string
  endDate: string
  fetchImpl?: typeof fetch
}): Promise<ZernioAnalytics> {
  if (!params.accountId.trim()) throw new Error('accountId es obligatorio')
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(params.startDate) || !/^\d{4}-\d{2}-\d{2}$/u.test(params.endDate)) {
    throw new Error('Las fechas de analíticas deben usar YYYY-MM-DD')
  }
  return zernioRequest<ZernioAnalytics>({
    config: params.config,
    pathname: `/analytics/account/${encodeURIComponent(params.accountId)}`,
    query: {startDate: params.startDate, endDate: params.endDate},
    fetchImpl: params.fetchImpl,
  })
}

export async function createZernioWebhook(params: {
  config: ZernioConfig
  name: string
  url: string
  secret: string
  events: string[]
  fetchImpl?: typeof fetch
}): Promise<Record<string, unknown>> {
  if (!params.secret.trim() || params.events.length === 0) throw new Error('El webhook necesita secreto y eventos')
  return zernioRequest({
    config: params.config,
    pathname: '/webhooks/settings',
    method: 'POST',
    body: {name: params.name, url: params.url, secret: params.secret, events: params.events, isActive: true},
    fetchImpl: params.fetchImpl,
  })
}

export function zernioPublicationState(status: string): 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled' {
  const normalized = status.toLowerCase()
  if (normalized === 'published' || normalized === 'partial') return 'published'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'cancelled') return 'cancelled'
  if (normalized === 'draft') return 'draft'
  return 'scheduled'
}
