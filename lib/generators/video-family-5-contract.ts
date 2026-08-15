import type { DiaItinerario, PuntoInteres, Salida } from '@/types'

export const VIDEO_FAMILY_5_LABELS = [
  'altitud',
  'desnivel',
  'distancia',
  'duración',
  'dificultad',
  'acceso',
] as const

export type VideoFamily5DataLabel = typeof VIDEO_FAMILY_5_LABELS[number]

export interface VideoFamily5Datum {
  etiqueta: VideoFamily5DataLabel
  valor: string
}

export interface VideoFamily5SourceCandidate {
  lugar: string
  datos: VideoFamily5Datum[]
}

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
