import type { Salida } from '@/types'
import { verifiedVideoPlaces } from './video-family-3-contract.ts'

function comparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/\s+/gu, ' ')
    .trim()
}

function factualCorpus(salida: Salida): string {
  const values = [
    salida.nombre,
    salida.destino,
    salida.nivel,
    salida.itinerario ?? '',
    salida.punto_encuentro ?? '',
    ...salida.itinerario_dias.flatMap(day => [day.titulo, day.descripcion, day.horario ?? '', day.hito ?? '']),
    ...salida.puntos_interes.flatMap(point => [
      point.nombre,
      point.descripcion,
      point.ubicacion ?? '',
      point.distancia ?? '',
      point.duracion ?? '',
      point.dificultad ?? '',
    ]),
  ]
  return comparable(values.filter(Boolean).join(' | '))
}

function numericClaims(value: string): string[] {
  return value.match(/\b\d+(?:[.,]\d+)?(?:\s*(?:km|m|metros?|horas?|hs|minutos?|min))?\b/giu) ?? []
}

function unsupportedNumericClaims(value: string, salida: Salida): string[] {
  const corpus = factualCorpus(salida)
  return numericClaims(value).filter(claim => !corpus.includes(comparable(claim)))
}

function mentionsSomeVerifiedPlace(value: string, salida: Salida): boolean {
  const normalized = comparable(value)
  return verifiedVideoPlaces(salida).some(place => {
    const candidate = comparable(place.value)
    return candidate.length >= 3 && normalized.includes(candidate)
  })
}

function hasVerifiedListicleEvidence(value: string, salida: Salida): boolean {
  if (mentionsSomeVerifiedPlace(value, salida)) return true
  const corpus = factualCorpus(salida)
  const normalized = comparable(value)
  return normalized.length >= 4 && corpus.includes(normalized)
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
  if (!/\b(?:mand|compart|guard|cuál|cual)\b/iu.test(cta)) {
    errors.push('cta debe invitar de forma suave a compartir, guardar o elegir')
  }

  for (const [index, item] of items.entries()) {
    const claims = unsupportedNumericClaims(item, salida)
    if (claims.length > 0) {
      errors.push(`item ${index + 1} contiene datos numéricos no verificados: ${claims.join(', ')}`)
    }
    if (!hasVerifiedListicleEvidence(item, salida)) {
      errors.push(`item ${index + 1} no contiene un lugar ni dato verificable de la salida`)
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
