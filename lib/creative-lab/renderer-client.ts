import type {CreativeTemplateContract} from './template-contract.ts'

export interface CreativeRendererBranding {
  primary: string
  secondary: string
  background: string
  text: string
  font_title: 'Inter' | 'Playfair Display'
  font_body: 'Inter' | 'Playfair Display'
}

export interface CreativeRendererConfig {
  baseUrl: string
  token?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

function previewUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/u, '').replace(/\/api\/[^/]+$/u, '')
  if (!trimmed) throw new Error('MATI_SKILL_URL no está configurada')
  return `${trimmed}/api/render-preview`
}

export async function renderCreativePreview(params: {
  contract: CreativeTemplateContract
  html: string
  mockData: Record<string, string>
  branding: CreativeRendererBranding
  config: CreativeRendererConfig
  strictLayout?: boolean
}): Promise<Uint8Array> {
  const response = await (params.config.fetchImpl ?? fetch)(previewUrl(params.config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.config.token?.trim() ? {Authorization: `Bearer ${params.config.token.trim()}`} : {}),
    },
    body: JSON.stringify({
      template: params.contract,
      html: params.html,
      mock_data: params.mockData,
      branding: params.branding,
      strict_layout: params.strictLayout ?? true,
    }),
    signal: AbortSignal.timeout(params.config.timeoutMs ?? 45_000),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1_000)
    throw new Error(`Renderer de laboratorio falló (HTTP ${response.status}): ${detail}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('image/png')) {
    throw new Error(`Renderer devolvió un formato inesperado: ${contentType || 'sin content-type'}`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error('Renderer devolvió un PNG inválido')
  }
  return bytes
}
