export const RENDER_DISPATCH_ATTEMPTS = 3

const RETRY_DELAYS_MS = [750, 2_000] as const
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

export type RenderDispatchErrorCode =
  | 'renderer_unavailable'
  | 'renderer_timeout'
  | 'renderer_rejected'
  | 'renderer_invalid_response'

export class RenderDispatchError extends Error {
  readonly status: number | null
  readonly responseBody: string
  readonly attempts: number
  readonly safeCode: RenderDispatchErrorCode

  constructor(params: {
    message: string
    status?: number | null
    responseBody?: string
    attempts: number
    safeCode: RenderDispatchErrorCode
    cause?: unknown
  }) {
    super(params.message, {cause: params.cause})
    this.name = 'RenderDispatchError'
    this.status = params.status ?? null
    this.responseBody = params.responseBody ?? ''
    this.attempts = params.attempts
    this.safeCode = params.safeCode
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function networkErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = objectValue(error.cause)
  const causeParts = [
    typeof cause?.code === 'string' ? cause.code : null,
    typeof cause?.address === 'string' ? cause.address : null,
    typeof cause?.port === 'number' ? String(cause.port) : null,
  ].filter((value): value is string => Boolean(value))
  return causeParts.length > 0 ? `${error.message} (${causeParts.join(' · ')})` : error.message
}

function retryableNetworkError(error: unknown): boolean {
  const cause = error instanceof Error ? objectValue(error.cause) : null
  const code = typeof cause?.code === 'string' ? cause.code : ''
  return ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)
    || (error instanceof Error && error.message === 'fetch failed')
}

function safeCodeForStatus(status: number): RenderDispatchErrorCode {
  if (status === 408 || status === 504) return 'renderer_timeout'
  if (RETRYABLE_HTTP_STATUSES.has(status)) return 'renderer_unavailable'
  return 'renderer_rejected'
}

export async function dispatchRenderJob(params: {
  fetchImpl: typeof fetch
  url: string
  init: RequestInit
  label: string
  sleep?: (milliseconds: number) => Promise<void>
  expectedStatus?: number
  timeoutMs?: number
}): Promise<{response: Response; rawBody: string; attempts: number}> {
  const sleep = params.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
  const expectedStatus = params.expectedStatus ?? 202

  for (let attempt = 1; attempt <= RENDER_DISPATCH_ATTEMPTS; attempt++) {
    try {
      const response = await params.fetchImpl(params.url, {
        ...params.init,
        signal: params.init.signal ?? AbortSignal.timeout(params.timeoutMs ?? 15_000),
      })
      const rawBody = await response.text()
      if (response.status === expectedStatus) return {response, rawBody, attempts: attempt}

      const canRetry = attempt < RENDER_DISPATCH_ATTEMPTS && RETRYABLE_HTTP_STATUSES.has(response.status)
      console.warn(
        `[RENDER/DISPATCH] ${params.label} intento=${attempt}/${RENDER_DISPATCH_ATTEMPTS} status=${response.status}${canRetry ? ' reintento=si' : ' reintento=no'}`,
      )
      if (!canRetry) {
        throw new RenderDispatchError({
          message: `El renderer respondió HTTP ${response.status}`,
          status: response.status,
          responseBody: rawBody.slice(0, 1_000),
          attempts: attempt,
          safeCode: safeCodeForStatus(response.status),
        })
      }
    } catch (error) {
      if (error instanceof RenderDispatchError) throw error
      const canRetry = attempt < RENDER_DISPATCH_ATTEMPTS && retryableNetworkError(error)
      console.warn(
        `[RENDER/DISPATCH] ${params.label} intento=${attempt}/${RENDER_DISPATCH_ATTEMPTS} error=${networkErrorDetail(error)}${canRetry ? ' reintento=si' : ' reintento=no'}`,
      )
      if (!canRetry) {
        throw new RenderDispatchError({
          message: `No se pudo contactar al renderer: ${networkErrorDetail(error)}`,
          attempts: attempt,
          safeCode: error instanceof Error && error.name === 'TimeoutError'
            ? 'renderer_timeout'
            : 'renderer_unavailable',
          cause: error,
        })
      }
    }

    await sleep(RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS.at(-1)!)
  }

  throw new RenderDispatchError({
    message: 'El renderer no aceptó el trabajo después de los reintentos',
    attempts: RENDER_DISPATCH_ATTEMPTS,
    safeCode: 'renderer_unavailable',
  })
}

export function publicRenderError(kind: 'video' | 'banner' | 'carrusel'): string {
  if (kind === 'video') return 'No pudimos preparar el video. Podés reintentarlo.'
  if (kind === 'banner') return 'No pudimos preparar el diseño. Podés reintentarlo.'
  return 'No pudimos preparar el carrusel. Podés reintentarlo.'
}
