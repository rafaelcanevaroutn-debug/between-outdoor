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
  const url = buildMetricoolApiUrl('/v2/scheduler/posts', params.config, {start, end, timezone})
  const response = await (params.fetchImpl ?? fetch)(url, {
    method: 'GET',
    headers: {'X-Mc-Auth': params.config.token, 'Content-Type': 'application/json'},
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Metricool respondió HTTP ${response.status}`)
  const contentType = response.headers.get('content-type')?.split(';')[0].toLowerCase()
  if (contentType !== 'application/json') throw new Error('Metricool no devolvió JSON')
  return response.json()
}
