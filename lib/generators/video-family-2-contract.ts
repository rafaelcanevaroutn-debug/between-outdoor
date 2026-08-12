import type { Salida } from '@/types'
import {
  comparableVideoText as comparable,
  isAtomicVerifiedPlace,
  verifiedVideoPlaces,
  type VerifiedVideoPlace,
} from './video-verified-places.ts'
import { unsupportedNumericClaims } from './video-factual-corpus.ts'
import { MAX_BULLETS, TARGET_BULLETS, WINDOW_MAX_CHARACTERS } from './video-sequence-limits.ts'

// Candidatos habilitados para un bullet de listicle (2a): lugares
// verificados atómicos (no rutas combinadas) que además entran en la
// ventana de WINDOW_MAX_CHARACTERS. Un lugar real más largo que eso no es
// "un bullet corto que perdió el dato" — directamente no es candidato: se
// filtra acá, antes de pedirle nada a Gemini, en vez de dejar que free-genere
// texto y después validar si por casualidad calzó.
export const MIN_LISTICLE_CANDIDATES = 3

export function listicleCandidatePlaces(salida: Salida): VerifiedVideoPlace[] {
  return verifiedVideoPlaces(salida)
    .filter(isAtomicVerifiedPlace)
    .filter(place => place.value.length <= WINDOW_MAX_CHARACTERS)
}

export interface VideoListicleEligibility {
  eligible: boolean
  candidateCount: number
  minRequired: number
}

export function evaluateListicleEligibility(salida: Salida): VideoListicleEligibility {
  const candidateCount = listicleCandidatePlaces(salida).length
  return { eligible: candidateCount >= MIN_LISTICLE_CANDIDATES, candidateCount, minRequired: MIN_LISTICLE_CANDIDATES }
}

// Cantidad fija de bullets para un listicle dado, calculada por el sistema
// — nunca elegida por Gemini. Nunca pide más de lo que hay candidatos, ni
// más del tope duro de Mati.
export function resolveListicleBulletCount(candidateCount: number): number {
  return Math.max(0, Math.min(candidateCount, TARGET_BULLETS, MAX_BULLETS))
}

function isExactCandidateMatch(item: string, candidates: VerifiedVideoPlace[]): boolean {
  const normalized = comparable(item)
  return candidates.some(place => comparable(place.value) === normalized)
}

export function normalizeListicleItems(rawItems: unknown[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const raw of rawItems) {
    if (typeof raw !== 'string') continue
    const item = raw.replace(/^\s*\d+\s*[.)-]\s*/u, '').replace(/\s+/gu, ' ').trim()
    const key = comparable(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    normalized.push(item)
  }
  return normalized
}

export function declaredListicleCount(title: string): number | null {
  const match = title.trim().match(/^(\d+)\b/u)
  return match ? Number.parseInt(match[1], 10) : null
}

export function validateVideoListicle({
  titulo,
  items,
  cta,
  salida,
}: {
  titulo: string
  items: string[]
  cta: string
  salida: Salida
}): string[] {
  const errors: string[] = []
  const declared = declaredListicleCount(titulo)

  if (declared === null) errors.push('titulo debe empezar con un número arábigo')
  if (declared !== null && declared !== items.length) {
    errors.push(`titulo promete ${declared} items pero el contrato contiene ${items.length}`)
  }
  if (items.length === 0) errors.push('items no puede estar vacío')
  if (new Set(items.map(comparable)).size !== items.length) errors.push('items contiene duplicados')
  if (/\b(?:reserv|cupos?|precio|whatsapp|mp|últimos lugares)\b/iu.test(cta)) {
    errors.push('cta debe ser editorial y no comercial')
  }
  // Sin \b de cierre a propósito: el \b de ASCII no reconoce vocales
  // acentuadas como parte de la palabra, así que "compart\b" matchea
  // "compartí" (con tilde) pero no "compartilo" (con pronombre enclítico,
  // la forma más natural en voz vos) — abrir el matcheo al prefijo cubre
  // cualquier conjugación/pronombre pegado sin tener que enumerarlas.
  // Whitelist cerrada — no ampliar sin confirmar antes. Sin \b de cierre
  // en todo el grupo (ni siquiera en cuál/cual): agregarlo de vuelta
  // reintroduciría el mismo bug para mand/compart/guard/eleg/sum/etiquet/
  // descubr/cont que motivó sacarlo.
  if (!/\b(?:mand|compart|guard|eleg|sum|etiquet|descubr|cont|cuál|cual)/iu.test(cta)) {
    errors.push('cta debe invitar de forma suave a compartir, guardar o elegir')
  }

  const candidates = listicleCandidatePlaces(salida)
  for (const [index, item] of items.entries()) {
    if (!isExactCandidateMatch(item, candidates)) {
      errors.push(`item ${index + 1} no es exactamente uno de los lugares verificados habilitados (≤${WINDOW_MAX_CHARACTERS} caracteres) para este listicle`)
    }
  }
  return errors
}

export function normalizeStorytellingSegments(rawSegments: unknown[]): string[] {
  return rawSegments
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.replace(/\s+/gu, ' ').trim())
    .filter(Boolean)
}

export function validateVideoStorytelling({
  apertura,
  desarrollo,
  cierre,
  salida,
}: {
  apertura: string
  desarrollo: string[]
  cierre?: string
  salida: Salida
}): string[] {
  const errors: string[] = []
  if (!apertura.trim()) errors.push('apertura no puede estar vacía')
  if (desarrollo.length === 0) errors.push('desarrollo necesita al menos un segmento')
  const completeText = [apertura, ...desarrollo, cierre ?? ''].join(' ')
  const claims = unsupportedNumericClaims(completeText, salida)
  if (claims.length > 0) {
    errors.push(`narración contiene datos numéricos no verificados: ${claims.join(', ')}`)
  }
  if (/\b(?:maravilloso|fantástico|increíble|imperdible|único|reservá|últimos cupos|whatsapp|precio)\b/iu.test(completeText)) {
    errors.push('narración contiene sobreventa, superlativos o CTA comercial')
  }

  const perspective = {
    singular: /\b(?:venía|vine|arranqué|llegué|seguí|caminé)\b/iu.test(completeText),
    plural: /\b(?:veníamos|vinimos|arrancamos|llegamos|seguimos|caminamos|salimos)\b/iu.test(completeText),
  }
  if (perspective.singular && perspective.plural) {
    errors.push('narración cambia entre primera persona singular y plural')
  }
  return errors
}
