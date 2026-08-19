import {
  assertCreativeTemplate,
  replaceCreativeTemplateCss,
  type CreativeTemplateContract,
} from './template-contract.ts'
import {estimateOpenAIInputTokens, type OpenAICreativeBudget} from './openai-budget.ts'

export interface OpenAIConfig {
  apiKey: string
  model: string
  budget: OpenAICreativeBudget
  fetchImpl?: typeof fetch
}

export interface CreativeCandidate {
  name: string
  rationale: string
  html: string
}

export interface CreativeCritique {
  verdict: 'pass' | 'fix'
  issues: string[]
  correctedHtml: string
}

function configured(config: OpenAIConfig): void {
  if (!config.apiKey.trim()) throw new Error('OPENAI_API_KEY no está configurada')
  if (!config.model.trim()) throw new Error('OPENAI_CREATIVE_MODEL no está configurado')
  if (!config.budget) throw new Error('El presupuesto OpenAI no está configurado')
}

function responseText(value: unknown): string {
  if (!value || typeof value !== 'object') throw new Error('OpenAI respondió un body inválido')
  const root = value as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }> }
  for (const item of root.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'refusal') throw new Error(`OpenAI rechazó la solicitud: ${content.refusal ?? 'sin detalle'}`)
      if (content.type === 'output_text' && content.text) return content.text
    }
  }
  throw new Error('OpenAI no devolvió output_text')
}

async function structuredResponse(config: OpenAIConfig, input: unknown[], schemaName: string, schema: Record<string, unknown>, maxOutputTokens: number): Promise<unknown> {
  configured(config)
  const reservationId = config.budget.reserve({
    model: config.model,
    // Incluye instrucciones, imagen/base64 y schema; el estimador por bytes es
    // deliberadamente conservador para no subreservar una llamada real.
    estimatedInputTokens: estimateOpenAIInputTokens({input, schemaName, schema}),
    maxOutputTokens,
  })
  let response: Response
  let body: unknown
  try {
    response = await (config.fetchImpl ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({model: config.model, store: false, max_output_tokens: maxOutputTokens, input, text: {format: {type: 'json_schema', name: schemaName, strict: true, schema}}}),
      signal: AbortSignal.timeout(120_000),
    })
    body = await response.json()
  } catch (error) {
    config.budget.settleUnknown(reservationId)
    throw error
  }
  const usage = body && typeof body === 'object' && 'usage' in body
    ? (body as {usage?: {input_tokens?: number; output_tokens?: number; total_tokens?: number}}).usage
    : undefined
  if (!usage || typeof usage.input_tokens !== 'number' || typeof usage.output_tokens !== 'number') {
    config.budget.settleUnknown(reservationId)
    throw new Error('OpenAI no devolvió usage; se reservó el costo máximo y la tanda fue detenida')
  }
  config.budget.settle(reservationId, {inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, totalTokens: usage.total_tokens})
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? JSON.stringify((body as {error: unknown}).error).slice(0, 800) : `HTTP ${response.status}`
    throw new Error(`OpenAI falló: ${message}`)
  }
  return JSON.parse(responseText(body))
}

export async function generateCreativeCandidates(params: {
  contract: CreativeTemplateContract
  brief: string
  brandGuidelines: string
  rubric: string
  approvedExamples?: string[]
  rejectedExamples?: string[]
  count: number
  config: OpenAIConfig
}): Promise<CreativeCandidate[]> {
  if (!Number.isInteger(params.count) || params.count < 1 || params.count > 8) throw new Error('count debe estar entre 1 y 8')
  const schema = {
    type: 'object', additionalProperties: false, required: ['candidates'],
    properties: {candidates: {type: 'array', minItems: params.count, maxItems: params.count, items: {
      type: 'object', additionalProperties: false, required: ['name', 'rationale', 'html'],
      properties: {name: {type: 'string'}, rationale: {type: 'string'}, html: {type: 'string'}},
    }}},
  }
  const requiredSlots = Object.entries(params.contract.slots)
    .filter(([, slot]) => slot.required)
    .map(([name]) => name)
  const optionalSlots = Object.entries(params.contract.slots)
    .filter(([, slot]) => !slot.required)
    .map(([name]) => name)
  const rules = `Sos diseñador de contenido estático premium. Devolvé HTML/CSS completo y autónomo, sin JavaScript ni red externa. Usá exactamente un único <style data-template-css> y ningún otro bloque style. Cada slot obligatorio debe aparecer EXACTAMENTE una vez: ${requiredSlots.join(', ')}. Los únicos slots opcionales permitidos son: ${optionalSlots.join(', ') || 'ninguno'}. No inventes slots. Cada slot image_url debe ser un elemento <img data-slot="nombre">. La raíz .slide debe empezar en 0,0, medir el lienzo exacto y usar overflow:hidden. Colores y fuentes sólo mediante los branding_tokens. No incluyas datos reales: sólo placeholders dentro de los slots. Antes de responder, contá uno por uno los slots obligatorios en el HTML y corregí cualquier omisión o duplicado. Cada candidato debe ser visualmente distinto.`
  const user = JSON.stringify({contract: params.contract, brief: params.brief, brand_guidelines: params.brandGuidelines, rubric: params.rubric, approved_examples: params.approvedExamples ?? [], rejected_examples: params.rejectedExamples ?? []})
  const parsed = await structuredResponse(params.config, [{role: 'system', content: rules}, {role: 'user', content: user}], 'creative_template_candidates', schema, 24_000) as {candidates?: CreativeCandidate[]}
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length !== params.count) throw new Error('OpenAI devolvió una cantidad incorrecta de candidatos')
  for (const candidate of parsed.candidates) assertCreativeTemplate(params.contract, candidate.html)
  return parsed.candidates
}

export async function critiqueCreativeCandidate(params: {
  contract: CreativeTemplateContract
  html: string
  pngBase64: string
  rubric: string
  config: OpenAIConfig
}): Promise<CreativeCritique> {
  assertCreativeTemplate(params.contract, params.html)
  if (!/^[a-z0-9+/=]+$/iu.test(params.pngBase64) || params.pngBase64.length > 15_000_000) throw new Error('PNG de crítica inválido')
  const schema = {
    type: 'object', additionalProperties: false, required: ['verdict', 'issues', 'corrected_css'],
    properties: {verdict: {type: 'string', enum: ['pass', 'fix']}, issues: {type: 'array', items: {type: 'string'}}, corrected_css: {type: 'string'}},
  }
  const prompt = `Evaluá la captura con esta rúbrica: ${params.rubric}. Revisá jerarquía, legibilidad, contraste, aire, consistencia, composición y cualquier recorte o desborde visible. El contrato y los slots ya fueron validados; el overflow se validará de forma estricta después de tu corrección. Si requiere cambios, devolvé únicamente el CSS completo para reemplazar el bloque style[data-template-css]; no cambies HTML, copy ni slots. Si pasa, corrected_css debe ser una cadena vacía.`
  const parsed = await structuredResponse(params.config, [{role: 'user', content: [
    {type: 'input_text', text: `${prompt}\nContrato: ${JSON.stringify(params.contract)}\nHTML actual: ${params.html}`},
    {type: 'input_image', image_url: `data:image/png;base64,${params.pngBase64}`, detail: 'high'},
  ]}], 'creative_template_critique', schema, 8_000) as {verdict?: 'pass' | 'fix'; issues?: string[]; corrected_css?: string}
  if (!parsed.verdict || !Array.isArray(parsed.issues) || typeof parsed.corrected_css !== 'string') throw new Error('Crítica estructurada inválida')
  const correctedHtml = parsed.verdict === 'fix' ? replaceCreativeTemplateCss(params.html, parsed.corrected_css) : params.html
  assertCreativeTemplate(params.contract, correctedHtml)
  return {verdict: parsed.verdict, issues: parsed.issues, correctedHtml}
}
