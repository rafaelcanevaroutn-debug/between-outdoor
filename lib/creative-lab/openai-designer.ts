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

export interface CreativeVisualReference {
  label: string
  dataUrl: string
}

interface CreativeCssCandidate {
  name: string
  rationale: string
  css: string
}

function validatedVisualReferences(references: CreativeVisualReference[] = []): CreativeVisualReference[] {
  if (references.length > 3) throw new Error('Se admiten como máximo 3 referencias visuales por generación')
  let totalBytes = 0
  return references.map(reference => {
    const label = reference.label.trim()
    if (!label) throw new Error('Cada referencia visual necesita una etiqueta')
    if (!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/iu.test(reference.dataUrl)) {
      throw new Error(`Referencia visual inválida: ${label}`)
    }
    totalBytes += reference.dataUrl.length
    if (reference.dataUrl.length > 4_000_000 || totalBytes > 8_000_000) {
      throw new Error('Las referencias visuales superan el límite seguro')
    }
    return {label, dataUrl: reference.dataUrl}
  })
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

function visualUserContent(text: string, references: CreativeVisualReference[] = []): Array<Record<string, string>> {
  const content: Array<Record<string, string>> = [{type: 'input_text', text}]
  for (const reference of validatedVisualReferences(references)) {
    content.push({type: 'input_text', text: `Referencia visual aprobada: ${reference.label}`})
    content.push({type: 'input_image', image_url: reference.dataUrl, detail: 'high'})
  }
  return content
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
  visualReferences?: CreativeVisualReference[]
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
  const slotBlueprint = Object.entries(params.contract.slots).map(([name, slot]) => slot.type === 'image_url'
    ? `<img data-slot="${name}" alt="">`
    : `<span data-slot="${name}"></span>`).join(' ')
  const rules = `Sos director de arte senior de contenido estático premium. Devolvé HTML/CSS completo y autónomo, sin JavaScript ni red externa. Usá exactamente un único <style data-template-css> y ningún otro bloque style. Cada slot obligatorio debe aparecer EXACTAMENTE una vez: ${requiredSlots.join(', ')}. Los únicos slots opcionales permitidos son: ${optionalSlots.join(', ') || 'ninguno'}. No inventes, renombres, prefijes ni agregues sufijos a los slots. Plano literal de elementos permitidos (podés cambiar span por otra etiqueta de texto, pero conservá cada data-slot exacto; los img son obligatorios): ${slotBlueprint}. Cada slot image_url debe ser un elemento <img data-slot="nombre">. Nunca pongas data-slot en wrappers, pseudo-elementos o duplicados. Toda información variable debe vivir en esos slots: no escribas placeholders visibles como [NÚMERO], [PAÍS], [ETIQUETA] ni textos entre corchetes fuera de ellos. La raíz .slide debe empezar en 0,0, medir el lienzo exacto y usar overflow:hidden. Colores y fuentes sólo mediante los branding_tokens. No incluyas datos reales: sólo placeholders dentro de los slots. Las capturas adjuntas son una vara de dirección de arte, proporción, tipografía y detalle: reinterpretalas para el contrato actual, sin copiar su texto ni convertirlas en una imagen de fondo. Evitá caer por defecto en foto a sangre + bloque oscuro + riel lateral salvo que la dirección asignada lo requiera. Priorizá una idea compositiva reconocible y una jerarquía tan cuidada como las referencias. Antes de responder, buscá literalmente data-slot en tu HTML y comprobá uno por uno que todos los obligatorios del plano aparecen una vez y que no existe ningún nombre distinto. Cada candidato debe ser visualmente distinto.`
  const user = JSON.stringify({contract: params.contract, brief: params.brief, brand_guidelines: params.brandGuidelines, rubric: params.rubric, approved_examples: params.approvedExamples ?? [], rejected_examples: params.rejectedExamples ?? []})
  const userContent = visualUserContent(user, params.visualReferences)
  const parsed = await structuredResponse(params.config, [{role: 'system', content: rules}, {role: 'user', content: userContent}], 'creative_template_candidates', schema, 24_000) as {candidates?: CreativeCandidate[]}
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length !== params.count) throw new Error('OpenAI devolvió una cantidad incorrecta de candidatos')
  for (const candidate of parsed.candidates) assertCreativeTemplate(params.contract, candidate.html)
  return parsed.candidates
}

export async function generateCreativeCandidatesFromSkeleton(params: {
  contract: CreativeTemplateContract
  htmlSkeleton: string
  brief: string
  brandGuidelines: string
  rubric: string
  approvedExamples?: string[]
  rejectedExamples?: string[]
  visualReferences?: CreativeVisualReference[]
  count: number
  config: OpenAIConfig
}): Promise<CreativeCandidate[]> {
  assertCreativeTemplate(params.contract, params.htmlSkeleton)
  if (!Number.isInteger(params.count) || params.count < 1 || params.count > 4) throw new Error('count debe estar entre 1 y 4')
  const schema = {
    type: 'object', additionalProperties: false, required: ['candidates'],
    properties: {candidates: {type: 'array', minItems: params.count, maxItems: params.count, items: {
      type: 'object', additionalProperties: false, required: ['name', 'rationale', 'css'],
      properties: {name: {type: 'string'}, rationale: {type: 'string'}, css: {type: 'string'}},
    }}},
  }
  const rules = `Sos director de arte senior. El HTML y sus slots están BLOQUEADOS: no devuelvas HTML ni intentes cambiarlos. Escribí únicamente el CSS completo que reemplazará style[data-template-css]. Podés transformar radicalmente la composición usando grid, flex, position, pseudo-elementos, proporción y tipografía sobre las clases existentes. No uses red, @import, url(), contenido textual en pseudo-elementos ni selectores data-slot inventados. Debés usar los seis tokens var(--brand-primary), var(--brand-secondary), var(--brand-bg), var(--brand-text), var(--font-title) y var(--font-body). La raíz .slide debe medir el lienzo exacto, empezar en 0,0 y tener overflow:hidden. Toda pieza debe ser reproducible con el mismo DOM. Las capturas son vara de dirección de arte, no imágenes para copiar.`
  const user = JSON.stringify({contract: params.contract, locked_html: params.htmlSkeleton, brief: params.brief, brand_guidelines: params.brandGuidelines, rubric: params.rubric, approved_examples: params.approvedExamples ?? [], rejected_examples: params.rejectedExamples ?? []})
  const parsed = await structuredResponse(params.config, [{role: 'system', content: rules}, {role: 'user', content: visualUserContent(user, params.visualReferences)}], 'creative_template_css_candidates', schema, 12_000) as {candidates?: CreativeCssCandidate[]}
  if (!Array.isArray(parsed.candidates) || parsed.candidates.length !== params.count) throw new Error('OpenAI devolvió una cantidad incorrecta de candidatos CSS')
  return parsed.candidates.map(candidate => {
    const html = replaceCreativeTemplateCss(params.htmlSkeleton, candidate.css)
    assertCreativeTemplate(params.contract, html)
    return {name: candidate.name, rationale: candidate.rationale, html}
  })
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
