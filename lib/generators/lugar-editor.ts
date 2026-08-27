export interface LugarEditorPoint {
  etiqueta: string
  descripcion: string
  distancia?: string | null
  duracion?: string | null
  dificultad?: string | null
}

export interface LugarEditorSlide {
  n_slide: number
  rol: string
  tipo?: string
  pill_text?: string | null
  texto_principal?: string | null
  texto_apoyo?: string | null
  indicacion_imagen?: string
  hablante?: string | null
}

export interface LugarEditorInput {
  descripcion: string
  rawCta: string | null
  destino: string
  fechaInicio: string | null
  fechaFin: string | null
  recurringSchedule?: string | null
  activityEvidence?: string
  slides: LugarEditorSlide[]
  points: LugarEditorPoint[]
}

const CTA_PATTERN = /[¡!]?\s*coment[aá]\s+[^.!?\n]+\s+y\s+te\s+enviamos\s+toda\s+la\s+informaci[oó]n[.!]?/gi
const CTA_INTENT_PATTERN = /(?:^|\s)(?:coment[aá]|escribinos|mandanos|ped[ií]\s+(?:la\s+)?info|solicit[aá]\s+(?:la\s+)?info)(?=\s|[.!?,]|$)/i
const SENSORY_PATTERN = /tan cerca|sent[ií]s|fr[ií]o del hielo|pod[eé]s sentir|al alcance de la mano|tocar el hielo/i
const SALES_PATTERN = /precio|usd|cupos|reserv[aá]|inscrib|sumate|te esperamos|nuestra (?:salida|expedici[oó]n)|si te sum[aá]s/i
const CUMBRE_CLAIM_PATTERN = /\b(?:tu(?:s)?|nuestra(?:s)?|pr[oó]xima(?:s)?|subir|alcanzar|hacer|conquistar|llegar\s+a)\b[^.!?\n]{0,40}\bcumbres?\b|\bcumbres?\b[^.!?\n]{0,30}\b(?:te|nos)\s+esperan\b/i
const CUMBRE_EVIDENCE_PATTERN = /\b(?:ascens\w*|sub(?:ir|ida|imos)|hacer\s+(?:la\s+)?cumbre|alcanz\w*\s+(?:la\s+)?cumbre)\b/i
const ASCENSO_CLAIM_PATTERN = /\bascens(?:o|os|i[oó]n|iones)\b/i
const ASCENSO_EVIDENCE_PATTERN = /\b(?:ascens\w*|sub(?:ir|ida|imos))\b/i
const ESCALADA_CLAIM_PATTERN = /\b(?:escalada|escalar|escalamos|escalan?)\b/i
const ESCALADA_EVIDENCE_PATTERN = /\bescal\w*\b/i

function hasUnsupportedActivityClaim(value: string, evidence: string): boolean {
  return (CUMBRE_CLAIM_PATTERN.test(value) && !CUMBRE_EVIDENCE_PATTERN.test(evidence))
    || (ASCENSO_CLAIM_PATTERN.test(value) && !ASCENSO_EVIDENCE_PATTERN.test(evidence))
    || (ESCALADA_CLAIM_PATTERN.test(value) && !ESCALADA_EVIDENCE_PATTERN.test(evidence))
}

function cleanLanguage(value: string): string {
  return value
    .replace(/te (?:va a|van a) volar la cabeza/gi, 'muestran otra escala del paisaje')
    .replace(/\bm[aá]s\s+buscad[ao]\b/gi, 'clásica')
    .replace(/\bm[aá]s accesible\b/gi, 'accesible')
    .replace(/\b(?:imponentes?|majestuos[oa]s?)\b/gi, '')
    .replace(/\bs[ií] o s[ií]\b/gi, '')
    .replace(/\bjoya escondida\b/gi, '')
    .replace(/\bexperiencia [uú]nica\b/gi, 'recorrido')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
}

function exactDateRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const format = (value: string) => new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
  return `${format(start)} al ${format(end)}`
}

function canonicalCta(rawCta: string | null, destino: string): string {
  if (rawCta && /^comentá\s+.+\s+y\s+te\s+enviamos\s+toda\s+la\s+información\.?$/i.test(rawCta.trim())) return rawCta.trim()
  const keyword = destino.replace(/^(?:el|la|los|las)\s+/i, '').split(/[,–—-]/)[0].trim().toLocaleUpperCase('es-AR')
  return `Comentá ${keyword || 'INFO'} y te enviamos toda la información.`
}

function difficultyLevels(value: string): string {
  const levels = value.match(/\b(?:baja|media|moderada|intermedia|alta|exigente|fácil)\b/gi)
  return levels?.length ? [...new Set(levels.map(level => level.toLocaleLowerCase('es-AR')))].join('–') : value.trim()
}

function compactMeasurement(value: string, unit: 'distance' | 'duration'): string {
  return value
    .replace(/[.]+$/, '')
    .replace(/\bentre\s+(\d+)\s+y\s+(\d+)\s+horas?\b/i, '$1–$2 h')
    .replace(/\b(\d+)\s+horas?\b/gi, '$1 h')
    .replace(/\b(\d+)\s+minutos?\b/gi, '$1 min')
    .replace(/\s*\((?:ida|ida y vuelta)\)\s*/gi, ' ')
    .replace(unit === 'duration' ? /\s+ida y vuelta\b/gi : /\s+desde\s+[^·,.]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function technicalLine(point: LugarEditorPoint): string {
  const parts = [
    point.distancia ? compactMeasurement(point.distancia, 'distance') : null,
    point.duracion ? compactMeasurement(point.duracion, 'duration') : null,
  ].filter(Boolean) as string[]
  if (point.dificultad?.trim()) parts.push(`Dificultad: ${difficultyLevels(point.dificultad)}`)
  return parts.join(' · ')
}

function safePrincipal(value: string | null | undefined, point: LugarEditorPoint): string {
  const cleaned = cleanLanguage(value ?? '')
  const ambiguous = /hom[oó]nimo|el mismo|este lugar/i.test(cleaned)
  if (cleaned && cleaned.length <= 60 && !SENSORY_PATTERN.test(cleaned) && !SALES_PATTERN.test(cleaned) && !ambiguous) return cleaned
  const verified = cleanLanguage(point.descripcion.split(/(?<=[.!?])\s+/)[0]?.replace(/[.!?]+$/, '') ?? '')
  if (verified && verified.length <= 60 && !SENSORY_PATTERN.test(verified)) return verified
  return `Conocé ${point.etiqueta}.`
}

function cleanDescription(value: string, cta: string, activityEvidence: string): string {
  const withoutGeneratedData = value
    .replace(cta, '')
    .replace(CTA_PATTERN, '')
    .replace(/[^.!?\n]*\b20\d{2}\b[^.!?\n]*[.!?]?/g, '')
  const sentences = withoutGeneratedData
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => cleanLanguage(sentence))
    .filter(sentence => sentence
      && !SALES_PATTERN.test(sentence)
      && !CTA_INTENT_PATTERN.test(sentence)
      && !hasUnsupportedActivityClaim(sentence, activityEvidence)
      && !/^nivel\s*:/i.test(sentence))
  let result = ''
  for (const sentence of sentences) {
    const candidate = `${result}${result ? ' ' : ''}${sentence}`
    if (candidate.length > 500) break
    result = candidate
  }
  return result || 'Una guía breve para conocer el destino a través de sus recorridos.'
}

export function editLugarContent(input: LugarEditorInput): { descripcion: string; cta: string; slides: LugarEditorSlide[] } {
  if (input.slides.length !== 5) throw new Error('Lugar debe tener exactamente 5 slides')
  if (input.points.length !== 3) throw new Error('Lugar debe tener exactamente 3 puntos verificados')
  const cta = canonicalCta(input.rawCta, input.destino)
  const date = exactDateRange(input.fechaInicio, input.fechaFin)
  const scheduleLine = date
    ? `Salida: ${date}.`
    : `${input.recurringSchedule?.trim() || 'Salidas recurrentes'}.`
  const activityEvidence = input.activityEvidence ?? ''
  const slides = input.slides.map(slide => ({ ...slide }))

  slides[0].rol = 'portada'
  slides[0].texto_principal = cleanLanguage(slides[0].texto_principal ?? '')
  slides[0].texto_apoyo = null

  input.points.forEach((point, index) => {
    const slide = slides[index + 1]
    slide.rol = 'desarrollo'
    slide.tipo = 'texto'
    slide.pill_text = point.etiqueta
    slide.texto_principal = safePrincipal(slide.texto_principal, point)
    slide.texto_apoyo = technicalLine(point)
  })

  const closing = slides[4]
  closing.rol = 'cierre'
  closing.tipo = 'texto'
  closing.pill_text = null
  closing.texto_principal = cleanLanguage(closing.texto_principal ?? `Conocé ${input.destino}.`)
  if (!closing.texto_principal || SALES_PATTERN.test(closing.texto_principal) || hasUnsupportedActivityClaim(closing.texto_principal, activityEvidence)) {
    closing.texto_principal = `Conocé ${input.destino}.`
  }
  closing.texto_apoyo = `${scheduleLine}\n${cta}`

  const editorialBody = cleanDescription(input.descripcion, cta, activityEvidence)
  const descripcion = `${editorialBody}\n\n${scheduleLine}\n\n${cta}`
  return { descripcion, cta, slides }
}
