export interface AdaptiveRawDraft {
  angulo?: unknown
  descripcion_post?: unknown
  cta_comentario?: unknown
  slides?: unknown
}

export interface OrganicNormalizationInput {
  destination: string
  exactDateRange: string
  capacity: number
  canonicalCta: string
  descriptionLimit: number
}

export type DirectedDescriptionFormat = 'organico' | 'conversacion'

export interface DirectedDescriptionInput {
  format: DirectedDescriptionFormat
  originalDescription: string
  rewrittenBody?: string | null
  destination: string
  exactDateRange?: string
  capacity?: number
  canonicalCta: string
  descriptionLimit: number
  verifiedPlaces?: string[]
}

const ABSTRACT_DESCRIPTION_PATTERN = /\breset\b|energ[ií]a|cambiar (?:la )?sinton[ií]a|vivir (?:el )?fin del mundo|cambiar (?:el )?chip|recarg\w*|reconect\w*|conexi[oó]n|transform\w*|volver a vos|arrancar distinto|otra vibra|desconect\w* de verdad|marca(?:r)? un antes y un despu[eé]s|cambiar de aire|tiene la respuesta|calendario[^.!?]{0,40}sin freno/i
const GENERATED_FACT_PATTERN = /\b20\d{2}\b|\b\d+(?:[.,]\d+)?\s*(?:km|m|hs?|horas?|min(?:utos?)?|d[ií]as?|noches?|personas?|lugares?)\b|\b(?:usd|ars|precio|capacidad|cupos?|incluye|transfer|alojamiento|seguro)\b/i

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function descriptionNeedsDirectedRewrite(value: string): boolean {
  return ABSTRACT_DESCRIPTION_PATTERN.test(value)
}

export function editableDescriptionBody(
  format: DirectedDescriptionFormat,
  description: string,
  canonicalCta: string,
): string {
  let body = description.trim()
  if (canonicalCta && body.toLocaleLowerCase('es-AR').endsWith(canonicalCta.toLocaleLowerCase('es-AR'))) {
    body = body.slice(0, body.length - canonicalCta.length).trimEnd()
  }
  if (format === 'organico') {
    const managedBlock = body.lastIndexOf('\n\nSalida:')
    if (managedBlock >= 0) body = body.slice(0, managedBlock)
  }
  return body.trim()
}

function cleanDirectedBody(value: string): string {
  return value
    .replace(/[*_#`]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(sentence => sentence
      && !/coment[aá]|escribinos|mandanos|ped[ií]\s+(?:la\s+)?info/i.test(sentence)
      && !ABSTRACT_DESCRIPTION_PATTERN.test(sentence)
      && !GENERATED_FACT_PATTERN.test(sentence))
    .join(' ')
    .trim()
}

function fallbackDirectedBody(input: DirectedDescriptionInput): string {
  const cleanOriginal = cleanDirectedBody(editableDescriptionBody(
    input.format,
    input.originalDescription,
    input.canonicalCta,
  ))
  if (cleanOriginal) return cleanOriginal

  if (input.format === 'organico') {
    const places = (input.verifiedPlaces ?? []).map(item => item.trim()).filter(Boolean).slice(0, 3)
    return places.length > 0
      ? `Una salida para caminar por ${input.destination}: ${places.join(', ')}.`
      : `Una salida para caminar por ${input.destination}.`
  }
  return `Una charla cotidiana terminó en un plan para caminar por ${input.destination}.`
}

function fitBody(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const shortened = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut)
    .replace(/[\s,;:\-–—]+$/u, '')
    .replace(/(?:^|\s)(?:y|o|e|u|de|con|para|a|en|por|sin)$/iu, '')
    .trim()
  return shortened && !/[.!?]$/u.test(shortened) ? `${shortened}.` : shortened
}

export function finalizeDirectedDescription(input: DirectedDescriptionInput): string {
  const rewritten = cleanDirectedBody(text(input.rewrittenBody))
  const safeBody = rewritten || fallbackDirectedBody(input)
  const managedFacts = input.format === 'organico'
    ? `Salida: ${input.exactDateRange}. Capacidad total: ${input.capacity} personas.\n\n`
    : ''
  const suffix = `${managedFacts}${input.canonicalCta}`
  const bodyLimit = Math.max(0, input.descriptionLimit - suffix.length - 2)
  const body = fitBody(safeBody, bodyLimit)
  return body ? `${body}\n\n${suffix}` : suffix
}

function managedOrganicFact(value: string): boolean {
  const date = /\b20\d{2}\b|\b\d{1,2}\s+(?:de\s+)?(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\b/i
  const capacity = /\b(?:capacidad|cupos?)\b|\b(?:solo|quedan|[uú]ltimos?|limitados?)\s+\d*\s*lugares?\b|\b\d+\s+(?:lugares?|personas)\b/i
  return date.test(value) || capacity.test(value)
}

function cleanOrganicNarrative(value: string, max: number): string {
  const sentences = value
    .replace(/[*_#`]/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(sentence => sentence && !/coment[aá]/i.test(sentence) && !managedOrganicFact(sentence))

  let result = ''
  for (const sentence of sentences) {
    const candidate = `${result}${result ? ' ' : ''}${sentence}`
    if (candidate.length > max) break
    result = candidate
  }

  if (result || max <= 0) return result
  const first = sentences[0] ?? ''
  if (first.length <= max) return first
  const cut = first.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const shortened = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut)
    .replace(/[\s,;:\-–—]+$/u, '')
    .trim()
  return shortened && !/[.!?]$/u.test(shortened) ? `${shortened}.` : shortened
}

export function normalizeOrganicDraft(
  raw: AdaptiveRawDraft,
  input: OrganicNormalizationInput,
): AdaptiveRawDraft {
  const slides = Array.isArray(raw.slides)
    ? raw.slides.map(item => item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item)
    : raw.slides

  if (Array.isArray(slides) && slides[1] && typeof slides[1] === 'object') {
    slides[1] = {
      ...(slides[1] as Record<string, unknown>),
      rol: 'datos',
      tipo: 'ficha',
      pill_text: null,
      texto_principal: input.destination,
      texto_apoyo: `${input.exactDateRange} · Capacidad total: ${input.capacity} personas`,
    }
  }

  const dataLine = `Salida: ${input.exactDateRange}. Capacidad total: ${input.capacity} personas.`
  const suffix = `${dataLine}\n\n${input.canonicalCta}`
  const narrativeLimit = Math.max(0, input.descriptionLimit - suffix.length - 2)
  const narrative = cleanOrganicNarrative(text(raw.descripcion_post), narrativeLimit)

  return {
    ...raw,
    descripcion_post: narrative ? `${narrative}\n\n${suffix}` : suffix,
    cta_comentario: input.canonicalCta,
    slides,
  }
}

export function mergeConversationEditorialReview(
  draft: AdaptiveRawDraft,
  review: AdaptiveRawDraft,
): AdaptiveRawDraft {
  if (!Array.isArray(review.slides)) {
    throw new Error('El editor de Conversación debe devolver slides revisados')
  }

  return {
    ...draft,
    slides: review.slides,
  }
}
