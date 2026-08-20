import type { Salida } from '@/types'
import {
  comparableVideoText,
  verifiedVideoPlaces,
} from './video-verified-places.ts'
import { COMMERCIAL_LANGUAGE_PATTERN } from './video-commercial-patterns.ts'

export function estimateVideoFamilia1aDuration(discurso: string): number {
  const wordCount = discurso.trim().split(/\s+/u).filter(Boolean).length
  return Math.ceil((wordCount / 2.5) + 2.0)
}

export function normalizeVideoFamily1aDiscourse(rawDiscourse: string): string {
  return rawDiscourse
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

const DATE_PATTERN = /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|20\d{2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/iu
const ROUTE_ACTION_PATTERN = /\b(?:salimos|partimos|subimos|bajamos|llegamos|cruzamos|caminamos)\b/giu
const TERRAIN_PATTERN = /\b(?:sendero|refugio|campamento|itinerario|desnivel|msnm|kil[oó]metros?|km)\b/iu
const LIST_PATTERN = /^(?:[-*•]|\d+[.)])\s+/mu
const EXPLICIT_CLICHE_PATTERN = /\b(?:segu[ií] tus sueños|todo lo que dese[áa]s est[áa] del otro lado del miedo)\b/iu

function narrativeMovements(discurso: string): string[] {
  return discurso
    .split(/(?:[.!?…]+(?:[”"']+)?\s+|\n+)/u)
    .map(segment => segment.trim())
    .filter(Boolean)
}

function mentionsVerifiedPlace(discurso: string, salida: Salida): boolean {
  const comparableDiscourse = comparableVideoText(discurso)
  return verifiedVideoPlaces(salida).some(place => {
    const comparablePlace = comparableVideoText(place.value)
    return comparablePlace.length >= 3 && comparableDiscourse.includes(comparablePlace)
  })
}

function narratesConcreteRoute(discurso: string): boolean {
  const routeActions = discurso.match(ROUTE_ACTION_PATTERN) ?? []
  return routeActions.length >= 2 || TERRAIN_PATTERN.test(discurso)
}

export function validateVideoFamily1aDiscourse({
  discurso,
  salida,
}: {
  discurso: string
  salida: Salida
}): string[] {
  const errors: string[] = []

  if (!discurso) errors.push('discurso está vacío')
  if (narrativeMovements(discurso).length < 3) {
    errors.push('discurso no tiene los tres movimientos del arco: entrada, desarrollo y desenlace')
  }
  if (LIST_PATTERN.test(discurso)) {
    errors.push('discurso es una lista y no una sola pieza narrativa coherente')
  }
  if (COMMERCIAL_LANGUAGE_PATTERN.test(discurso) || DATE_PATTERN.test(discurso)) {
    errors.push('discurso contiene un dato comercial, fecha o CTA prohibido')
  }
  if (narratesConcreteRoute(discurso) || mentionsVerifiedPlace(discurso, salida)) {
    errors.push('discurso narra una salida, un lugar o un recorrido concreto')
  }
  if (EXPLICIT_CLICHE_PATTERN.test(discurso)) {
    errors.push('discurso repite un cliché motivacional prohibido por la guía')
  }

  return errors
}
