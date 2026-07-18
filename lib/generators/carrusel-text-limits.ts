import type { SlideCarrusel } from '@/types'

export type AdaptiveCarruselFormat = 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar'

const BASE_TEXT_LIMITS = {
  pill_text: 18,
  texto_principal: 60,
  texto_apoyo: 180,
  cta_comentario: 80,
  angulo: 100,
  hablante: 24,
} as const

export const EXEMPT_PILL_TEXT_HARD_LIMIT = 60

export const LIMITS_BY_FORMAT = {
  organico: { ...BASE_TEXT_LIMITS, descripcion_post: 650 },
  conversacion: { ...BASE_TEXT_LIMITS, descripcion_post: 300, dialogo_acumulado: 125 },
  itinerario: { ...BASE_TEXT_LIMITS, descripcion_post: 1000 },
  ascenso: { ...BASE_TEXT_LIMITS, descripcion_post: 500 },
  calendario: { ...BASE_TEXT_LIMITS, descripcion_post: 750 },
  lugar: { ...BASE_TEXT_LIMITS, descripcion_post: 750 },
} as const satisfies Record<AdaptiveCarruselFormat, Record<string, number>>

export interface AdaptiveTextLimitOutput {
  angulo: string
  descripcion: string
  cta: string | null
  slides: SlideCarrusel[]
}

export interface AdaptiveTextLimitContext {
  protectedLabels?: string[]
  protectedTerms?: string[]
}

export interface AdaptiveTextLimitViolation {
  field: string
  actual: number
  limit: number
  strategy: 'retry' | 'truncate'
  slideIndex?: number
  slideField?: 'texto_principal'
}

export interface AdaptiveTextLimitWarning {
  field: string
  actual: number
  limit: number
  message: string
}

export interface AdaptiveTextLimitValidation {
  violations: AdaptiveTextLimitViolation[]
  warnings: AdaptiveTextLimitWarning[]
}

export type AdaptiveTextLimitAction = 'accept' | 'retry' | 'truncate' | 'reject'

function comparable(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-AR').replace(/\s+/g, ' ').trim()
}

function sameText(left: string, right: string): boolean {
  return comparable(left) === comparable(right)
}

function containsProtectedTerm(value: string, terms: string[]): boolean {
  const normalized = comparable(value)
  return terms.some(term => {
    const candidate = comparable(term)
    return candidate.length >= 3 && normalized.includes(candidate)
  })
}

function containsTechnicalFact(value: string): boolean {
  return /\b\d+(?:[.,]\d+)?\s*(?:km|m|metros?|hs?|horas?|min(?:utos?)?|d[ií]as?|noches?)\b|\b(?:dificultad|desnivel|cupos?|precio|usd|ars|punto de encuentro|feriado)\b|\b20\d{2}\b/i.test(value)
}

function containsDate(value: string): boolean {
  return /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+(?:de\s+)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(value)
}

function canSafelyTruncatePrincipal(slide: SlideCarrusel, protectedTerms: string[], limit: number): boolean {
  const value = slide.texto_principal ?? ''
  if (value.length > Math.floor(limit * 1.2)) return false
  if (containsProtectedTerm(value, protectedTerms) || containsTechnicalFact(value) || containsDate(value)) return false
  return true
}

function addViolation(
  violations: AdaptiveTextLimitViolation[],
  field: string,
  value: string | null | undefined,
  limit: number,
  strategy: AdaptiveTextLimitViolation['strategy'],
  slideIndex?: number,
  slideField?: AdaptiveTextLimitViolation['slideField'],
): void {
  if (!value || value.length <= limit) return
  violations.push({ field, actual: value.length, limit, strategy, slideIndex, slideField })
}

export function validateAdaptiveTextLimits(
  format: AdaptiveCarruselFormat,
  output: AdaptiveTextLimitOutput,
  context: AdaptiveTextLimitContext = {},
): AdaptiveTextLimitValidation {
  const limits = LIMITS_BY_FORMAT[format]
  const protectedLabels = context.protectedLabels ?? []
  const protectedTerms = [...new Set([...(context.protectedTerms ?? []), ...protectedLabels, output.cta ?? ''].filter(Boolean))]
  const violations: AdaptiveTextLimitViolation[] = []
  const warnings: AdaptiveTextLimitWarning[] = []

  addViolation(violations, 'angulo', output.angulo, limits.angulo, 'truncate')
  addViolation(
    violations,
    'descripcion_post',
    output.descripcion,
    limits.descripcion_post,
    'truncate',
  )
  addViolation(violations, 'cta_comentario', output.cta, limits.cta_comentario, 'retry')

  output.slides.forEach((slide, index) => {
    const prefix = `slides[${index + 1}]`
    const pill = slide.pill_text ?? null
    if (pill && pill.length > limits.pill_text) {
      const exactProtectedLabel = protectedLabels.some(label => sameText(label, pill))
      if (exactProtectedLabel) {
        if (pill.length > EXEMPT_PILL_TEXT_HARD_LIMIT) {
          warnings.push({
            field: `${prefix}.pill_text`,
            actual: pill.length,
            limit: EXEMPT_PILL_TEXT_HARD_LIMIT,
            message: `Etiqueta verificada supera ${EXEMPT_PILL_TEXT_HARD_LIMIT} caracteres; se conserva completa para revisión con Mati.`,
          })
        }
      } else {
        addViolation(violations, `${prefix}.pill_text`, pill, limits.pill_text, 'retry')
      }
    }

    const principalLimit = format === 'conversacion' && slide.tipo === 'dialogo'
      ? LIMITS_BY_FORMAT.conversacion.dialogo_acumulado
      : limits.texto_principal
    addViolation(
      violations,
      `${prefix}.texto_principal`,
      slide.texto_principal,
      principalLimit,
      canSafelyTruncatePrincipal(slide, protectedTerms, principalLimit) ? 'truncate' : 'retry',
      index,
      'texto_principal',
    )
    addViolation(violations, `${prefix}.texto_apoyo`, slide.texto_apoyo, limits.texto_apoyo, 'retry')
    addViolation(violations, `${prefix}.hablante`, slide.hablante, limits.hablante, 'retry')
  })

  return { violations, warnings }
}

export function decideAdaptiveTextLimitAction(
  validation: AdaptiveTextLimitValidation,
  attempt: number,
  maxAttempts: number,
): AdaptiveTextLimitAction {
  if (validation.violations.length === 0) return 'accept'
  if (attempt < maxAttempts) return 'retry'
  return 'reject'
}

export function truncateAtWord(value: string, limit: number): string {
  if (value.length <= limit) return value
  const cut = value.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()
}

function cleanTruncatedEnding(value: string): string {
  let cleaned = value.trimEnd()
  let previous = ''
  while (cleaned !== previous) {
    previous = cleaned
    cleaned = cleaned.replace(/[\s,;:\-–—]+$/u, '').trimEnd()
    const sentencePunctuation = cleaned.match(/[.!?]+$/u)?.[0] ?? ''
    const connectorCandidate = sentencePunctuation
      ? cleaned.slice(0, -sentencePunctuation.length).trimEnd()
      : cleaned
    const withoutConnector = connectorCandidate
      .replace(/(?:^|\s)(?:y|o|e|u|de|con|para|a|en|por|sin)$/iu, '')
      .trimEnd()
    if (withoutConnector !== connectorCandidate) cleaned = withoutConnector
  }
  return cleaned
}

export function truncateDescriptionPreservingCta(value: string, cta: string | null, limit: number): string {
  const description = value.trim()
  if (description.length <= limit) return description

  const exactCta = cta?.trim() ?? ''
  if (!exactCta) {
    return cleanTruncatedEnding(truncateAtWord(description, limit))
  }

  const descriptionLower = description.toLocaleLowerCase('es-AR')
  const ctaLower = exactCta.toLocaleLowerCase('es-AR')
  const body = descriptionLower.endsWith(ctaLower)
    ? description.slice(0, description.length - exactCta.length).trimEnd()
    : description
  const separator = '\n\n'
  const punctuationReserve = 1
  const bodyLimit = limit - separator.length - exactCta.length - punctuationReserve

  if (bodyLimit <= 0) return exactCta.slice(0, limit)

  let truncatedBody = cleanTruncatedEnding(truncateAtWord(body, bodyLimit))
  if (truncatedBody && !/[.!?]$/u.test(truncatedBody)) truncatedBody += '.'

  return truncatedBody ? `${truncatedBody}${separator}${exactCta}` : exactCta
}

export function truncateSafeAdaptiveFields(
  output: AdaptiveTextLimitOutput,
  violations: AdaptiveTextLimitViolation[],
): AdaptiveTextLimitOutput {
  const next: AdaptiveTextLimitOutput = {
    ...output,
    slides: output.slides.map(slide => ({ ...slide })),
  }
  for (const violation of violations) {
    if (violation.strategy !== 'truncate') continue
    if (violation.field === 'angulo') {
      next.angulo = cleanTruncatedEnding(truncateAtWord(next.angulo, violation.limit))
      continue
    }
    if (violation.field === 'descripcion_post') {
      next.descripcion = truncateDescriptionPreservingCta(next.descripcion, next.cta, violation.limit)
      console.warn(`[CARRUSEL/limits] descripcion_post truncada de ${violation.actual} a ${next.descripcion.length} caracteres; CTA preservado.`)
      continue
    }
    if (violation.slideIndex !== undefined && violation.slideField === 'texto_principal') {
      const slide = next.slides[violation.slideIndex]
      if (slide?.texto_principal) {
        slide.texto_principal = cleanTruncatedEnding(truncateAtWord(slide.texto_principal, violation.limit))
      }
    }
  }
  return next
}

export interface AdaptiveTextLimitResolution {
  output: AdaptiveTextLimitOutput
  validation: AdaptiveTextLimitValidation
  applied: AdaptiveTextLimitViolation[]
  action: AdaptiveTextLimitAction
}

export function resolveAdaptiveTextLimits(
  output: AdaptiveTextLimitOutput,
  validation: AdaptiveTextLimitValidation,
  attempt: number,
  maxAttempts: number,
): AdaptiveTextLimitResolution {
  const isFinalAttempt = attempt >= maxAttempts
  const applied = validation.violations.filter(violation => (
    violation.field === 'angulo'
    || (isFinalAttempt && violation.strategy === 'truncate')
  ))
  const appliedSet = new Set(applied)
  const remainingValidation: AdaptiveTextLimitValidation = {
    violations: validation.violations.filter(violation => !appliedSet.has(violation)),
    warnings: validation.warnings,
  }
  const resolvedOutput = applied.length > 0
    ? truncateSafeAdaptiveFields(output, applied)
    : output

  return {
    output: resolvedOutput,
    validation: remainingValidation,
    applied,
    action: decideAdaptiveTextLimitAction(remainingValidation, attempt, maxAttempts),
  }
}

export function formatAdaptiveTextLimitError(validation: AdaptiveTextLimitValidation): string {
  return validation.violations
    .map(item => `${item.field} tiene ${item.actual} caracteres; máximo ${item.limit}. ${item.strategy === 'retry' ? 'Reescribilo más corto sin omitir CTA, fechas, etiquetas ni datos verificados.' : 'Reescribilo más corto conservando el sentido.'}`)
    .join(' ')
}

export function logAdaptiveTextLimitWarnings(format: AdaptiveCarruselFormat, warnings: AdaptiveTextLimitWarning[]): void {
  warnings.forEach(warning => console.warn(`[CARRUSEL/${format}] ${warning.field}: ${warning.message} (${warning.actual}/${warning.limit})`))
}
