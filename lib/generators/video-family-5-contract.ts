import type {
  DiaItinerario,
  PuntoInteres,
  Salida,
  VideoFichaDato,
  VideoFichaEtiqueta,
} from '@/types'
import { verifiedVideoPlaces } from './video-verified-places.ts'

export const VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS = 18

export const VIDEO_FAMILY_5_LABELS = [
  'altitud',
  'desnivel',
  'distancia',
  'duración',
  'dificultad',
  'acceso',
] as const

export type VideoFamily5DataLabel = VideoFichaEtiqueta
export type VideoFamily5Datum = VideoFichaDato

export interface VideoFamily5SourceCandidate {
  lugar: string
  datos: VideoFamily5Datum[]
}

export type VideoFamilia5Fallback = '4' | '3e' | 'discard'

const GENERIC_PLACE_WORDS = new Set([
  'caminata', 'caminamos', 'recorrido', 'recorremos', 'sendero', 'trekking',
  'hacia', 'por', 'de', 'del', 'la', 'las', 'los', 'y',
])

function comparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
}

function compactNumber(value: string): string {
  return value.replace(/\s+/gu, '').trim()
}

function numericValues(value: string): string[] {
  return value.match(/\d[\d.,]*/gu)?.map(compactNumber) ?? []
}

function hasRoundTrip(value: string): boolean {
  return /\b(?:ida\s+y\s+vuelta|i\/v)\b/iu.test(value)
}

function canonicalMagnitude(
  raw: string,
  unit: 'msnm' | 'm' | 'km' | 'h' | 'min',
  allowRange: boolean,
  allowRoundTrip: boolean,
): string | null {
  const numbers = numericValues(raw)
  if (numbers.length === 0) return null
  const magnitude = allowRange && numbers.length >= 2
    ? `${numbers[0]}-${numbers[1]}`
    : numbers[0]
  return `${magnitude} ${unit}${allowRoundTrip && hasRoundTrip(raw) ? ' i/v' : ''}`
}

export function normalizeVideoFamily5Difficulty(raw: string): string | null {
  const levels = [...raw.matchAll(/\b(fácil|facil|baja|moderada|media|intermedia|exigente|alta)\b/giu)]
    .map(match => comparable(match[1]))
    .map(level => {
      if (level === 'facil' || level === 'baja') return 'Baja' as const
      if (level === 'moderada' || level === 'media' || level === 'intermedia') return 'Media' as const
      return 'Alta' as const
    })
    .filter((level, index, all) => index === 0 || level !== all[index - 1])
  if (levels.length === 1) return levels[0]
  if (levels.length !== 2) return null
  const order = { Baja: 0, Media: 1, Alta: 2 } as const
  return Math.abs(order[levels[0]] - order[levels[1]]) === 1
    ? `${levels[0]}-${levels[1]}`
    : null
}

export function canonicalizeVideoFamily5Datum(
  datum: VideoFamily5Datum,
): VideoFamily5Datum | null {
  let valor: string | null
  if (datum.etiqueta === 'altitud') {
    valor = canonicalMagnitude(datum.valor, 'msnm', false, false)
  } else if (datum.etiqueta === 'desnivel') {
    valor = canonicalMagnitude(datum.valor, 'm', false, false)
  } else if (datum.etiqueta === 'distancia') {
    valor = canonicalMagnitude(datum.valor, 'km', true, true)
  } else if (datum.etiqueta === 'duración') {
    const unit = /\b(?:min|minutos?)\b/iu.test(datum.valor) ? 'min' : 'h'
    valor = canonicalMagnitude(datum.valor, unit, true, true)
  } else if (datum.etiqueta === 'dificultad') {
    valor = normalizeVideoFamily5Difficulty(datum.valor)
  } else {
    valor = datum.valor.replace(/\s+/gu, ' ').trim()
  }
  return valor ? { etiqueta: datum.etiqueta, valor } : null
}

export function canonicalizeVideoFamily5Candidate(
  candidate: VideoFamily5SourceCandidate,
): VideoFamily5SourceCandidate {
  return {
    lugar: candidate.lugar,
    datos: candidate.datos
      .map(canonicalizeVideoFamily5Datum)
      .filter((datum): datum is VideoFamily5Datum => datum !== null),
  }
}

export function eligibleVideoFamilia5Candidates(
  candidates: VideoFamily5SourceCandidate[],
): VideoFamily5SourceCandidate[] {
  return candidates.filter(candidate => {
    const canonical = canonicalizeVideoFamily5Candidate(candidate)
    return canonical.datos.length >= 3 && canonical.datos.length <= 6
  })
}

function hasVerifiedCommercialDatum(salida: Salida): boolean {
  const hasPrice = Number.isFinite(salida.precio_usd) && salida.precio_usd > 0
  const hasCapacity = Number.isInteger(salida.cupos) && salida.cupos > 0
  const date = salida.fecha_inicio.match(/^(\d{4}-\d{2}-\d{2})/u)?.[1]
  const parsedDate = date ? new Date(`${date}T00:00:00Z`) : null
  const hasDate = Boolean(
    date
    && parsedDate
    && !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date,
  )
  return hasPrice || hasCapacity || hasDate
}

export function resolveVideoFamilia5Fallback(salida: Salida): VideoFamilia5Fallback {
  if (hasVerifiedCommercialDatum(salida)) return '4'
  if (verifiedVideoPlaces(salida).length > 0) return '3e'
  return 'discard'
}

function exactSourceSubstring(source: string, value: string): boolean {
  return source.toLocaleLowerCase('es-AR').includes(value.toLocaleLowerCase('es-AR'))
}

function isSupportedAccess(value: string, source: string): boolean {
  const from = value.match(/^Desde (.+)$/u)
  if (from) return exactSourceSubstring(source, from[1])
  const distance = value.match(/^(\d[\d.,]* km) de (.+)$/u)
  if (!distance) return false
  return exactSourceSubstring(source, distance[1])
    && exactSourceSubstring(source, distance[2])
}

export function validateVideoFamily5Output({
  lugar,
  datos,
  candidates,
}: {
  lugar: string
  datos: VideoFamily5Datum[]
  candidates: VideoFamily5SourceCandidate[]
}): string[] {
  const errors: string[] = []
  const placeIdentity = lugar.replace(/^📍\s*/u, '')
  const candidate = candidates.find(item => item.lugar === placeIdentity)
  if (!candidate) return ['lugar no coincide exactamente con un lugar verificado']
  if (datos.length < 3 || datos.length > 6) errors.push('datos debe contener entre 3 y 6 elementos')

  const seen = new Set<string>()
  const canonicalSource = canonicalizeVideoFamily5Candidate(candidate)
  for (const datum of datos) {
    if (!VIDEO_FAMILY_5_LABELS.includes(datum.etiqueta)) {
      errors.push(`etiqueta no permitida: ${String(datum.etiqueta)}`)
      continue
    }
    if (seen.has(datum.etiqueta)) errors.push(`etiqueta duplicada: ${datum.etiqueta}`)
    seen.add(datum.etiqueta)
    if (datum.valor !== datum.valor.trim()) errors.push(`${datum.etiqueta} debe venir trimmeado`)
    if (datum.valor.trim().length > VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS) {
      errors.push(`${datum.etiqueta} supera ${VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS} caracteres`)
    }
    if (/\p{Extended_Pictographic}/u.test(datum.valor)) errors.push(`${datum.etiqueta} no admite emoji`)

    if (datum.etiqueta === 'acceso') {
      const sourceAccess = candidate.datos.find(item => item.etiqueta === 'acceso')?.valor
      if (!sourceAccess || !isSupportedAccess(datum.valor, sourceAccess)) {
        errors.push('acceso no usa un ancla literal y verificada de la fuente')
      }
      continue
    }
    const expected = canonicalSource.datos.find(item => item.etiqueta === datum.etiqueta)?.valor
    if (!expected || datum.valor !== expected) {
      errors.push(`${datum.etiqueta} no coincide con la forma canónica de la fuente`)
    }
  }
  return errors
}

function identityTokens(value: string): Set<string> {
  return new Set(
    comparable(value)
      .split(' ')
      .filter(token => token.length >= 3 && !GENERIC_PLACE_WORDS.has(token)),
  )
}

function matchingItineraryDay(
  point: PuntoInteres,
  days: DiaItinerario[],
): DiaItinerario | null {
  const pointTokens = identityTokens(point.nombre)
  let best: { day: DiaItinerario; score: number } | null = null
  for (const day of days) {
    const dayTokens = identityTokens(`${day.titulo} ${day.descripcion}`)
    const score = [...pointTokens].filter(token => dayTokens.has(token)).length
    if (score > 0 && (!best || score > best.score)) best = { day, score }
  }
  return best?.day ?? null
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].replace(/\s+/gu, ' ').trim()
  }
  return null
}

function extractAltitude(text: string): string | null {
  return firstMatch(text, [
    /\b(\d[\d.,]*\s*msnm)\b/iu,
    /\b(\d[\d.,]*\s*metros?\s+sobre\s+el\s+nivel\s+del\s+mar)\b/iu,
  ])
}

function extractElevationGain(text: string): string | null {
  return firstMatch(text, [
    /\b(\d[\d.,]*\s*(?:metros?|m)\s+de\s+(?:desnivel|ascenso)(?:\s*\+)?)/iu,
    /\b(?:desnivel|ascenso)(?:\s+positivo)?\s+(?:de\s+)?(\d[\d.,]*\s*(?:m|metros?))\b/iu,
  ])
}

function extractDistance(text: string): string | null {
  return firstMatch(text, [
    /\b((?:aproximadamente\s+)?\d[\d.,]*\s*(?:km|kilómetros?)(?:\s+a\s+\d[\d.,]*\s*(?:km|kilómetros?))?(?:\s*\(?(?:ida\s+y\s+vuelta|i\/v)\)?)?)/iu,
  ])
}

function extractDuration(text: string): string | null {
  return firstMatch(text, [
    /\b((?:entre\s+)?\d[\d.,]*\s*(?:a|y|-)\s*\d[\d.,]*\s*(?:horas?|h|minutos?|min)(?:\s*\(?(?:ida\s+y\s+vuelta|ida)\)?)?)/iu,
    /\b(\d[\d.,]*\s*(?:horas?|h|minutos?|min)(?:\s*\(?(?:ida\s+y\s+vuelta|ida)\)?)?)/iu,
  ])
}

function extractDifficulty(text: string): string | null {
  return firstMatch(text, [
    /\b((?:fácil|facil|baja|moderada|media|intermedia|exigente|alta)(?:\s+a\s+(?:fácil|facil|baja|moderada|media|intermedia|exigente|alta))?)/iu,
  ])
}

function addDatum(
  data: VideoFamily5Datum[],
  etiqueta: VideoFamily5DataLabel,
  value: string | null | undefined,
): void {
  const valor = value?.replace(/\s+/gu, ' ').trim()
  if (valor) data.push({ etiqueta, valor })
}

/**
 * Extrae únicamente datos declarados por la salida. En conflictos, los datos
 * del itinerario prevalecen para distancia/dificultad/desnivel y el punto de
 * interés prevalece para duración/acceso, tal como fija el spec de Ficha.
 */
export function extractVideoFamily5SourceCandidates(
  salida: Pick<Salida, 'puntos_interes' | 'itinerario_dias'>,
): VideoFamily5SourceCandidate[] {
  return salida.puntos_interes
    .filter(point => point.nombre?.trim())
    .map(point => {
      const day = matchingItineraryDay(point, salida.itinerario_dias)
      const itineraryText = day ? `${day.titulo} ${day.descripcion}` : ''
      const pointText = [
        point.descripcion,
        point.distancia,
        point.duracion,
        point.dificultad,
        point.ubicacion,
      ].filter(Boolean).join(' ')
      const data: VideoFamily5Datum[] = []

      addDatum(data, 'altitud', extractAltitude(itineraryText) ?? extractAltitude(pointText))
      addDatum(data, 'desnivel', extractElevationGain(itineraryText) ?? extractElevationGain(pointText))
      addDatum(data, 'distancia', extractDistance(itineraryText) ?? extractDistance(point.distancia ?? ''))
      addDatum(data, 'duración', extractDuration(point.duracion ?? '') ?? extractDuration(itineraryText))
      addDatum(data, 'dificultad', extractDifficulty(itineraryText) ?? extractDifficulty(point.dificultad ?? ''))
      addDatum(data, 'acceso', point.ubicacion)

      return { lugar: point.nombre.trim(), datos: data }
    })
}
