import type { ClientOnboarding, Salida } from '@/types'
import { normalizeCampaignContext, resolveContentProfile } from '../commercial-content-profiles.ts'

// Lugares verificados de una salida — compartido entre Familia 2 (listicle
// de 2a, constreñido a esta lista) y Familia 3 (3e, valida contra esta
// misma lista). Única fuente de verdad para "qué lugar es verificable".

export interface VerifiedVideoPlace {
  value: string
  source: string
  order: number
}

export function comparableVideoText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/\s+/gu, ' ')
    .trim()
}

function uniquePlaces(places: VerifiedVideoPlace[]): VerifiedVideoPlace[] {
  const seen = new Set<string>()
  return places.filter(place => {
    const key = comparableVideoText(place.value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function verifiedVideoPlaces(salida: Salida): VerifiedVideoPlace[] {
  const places: VerifiedVideoPlace[] = []
  let order = 0

  if (salida.destino?.trim()) {
    places.push({ value: salida.destino.trim(), source: 'salida.destino', order: order++ })
  }

  for (const point of salida.puntos_interes ?? []) {
    const name = point.nombre?.trim()
    const location = point.ubicacion?.trim()
    if (name) places.push({ value: name, source: `puntos_interes:${name}`, order: order++ })
    if (location) places.push({ value: location, source: `ubicacion:${name || location}`, order: order++ })
    if (name && location) {
      places.push({ value: `${name}, ${location}`, source: `puntos_interes:${name}+ubicacion`, order: order - 2 })
      places.push({ value: `${name} — ${location}`, source: `puntos_interes:${name}+ubicacion`, order: order - 2 })
      places.push({ value: `${name}\n${location}`, source: `puntos_interes:${name}+ubicacion`, order: order - 2 })
    }
  }

  return uniquePlaces(places)
}

/**
 * En una campaña local el banco puede estar vinculado a otra salida por
 * razones operativas. Sólo ese perfil necesita reemplazar los lugares de la
 * salida técnica por los destinos comerciales de la campaña. Los viajes
 * concretos —incluida una dupla o marca personal— siempre toman la geografía
 * de la salida seleccionada para no contaminar un viaje con otro de la cuenta.
 */
export function verifiedVideoPlacesForProfile(
  salida: Salida,
  onboarding: ClientOnboarding | null,
): VerifiedVideoPlace[] {
  const profile = resolveContentProfile(onboarding, salida)
  const destinations = normalizeCampaignContext(onboarding?.campaign_context).destinos ?? []
  if (profile !== 'grupo_recurrente_local' || destinations.length === 0) return verifiedVideoPlaces(salida)
  return uniquePlaces(destinations.map((value, order) => ({
    value,
    source: 'campaign_context.destinos',
    order,
  })))
}

// Un lugar "atómico" es un nombre o ubicación simple, sin combinarlo con
// otro (los combos "nombre, ubicación" / "nombre — ubicación" que arma
// verifiedVideoPlaces para rutas de Familia 3e). Familia 2a solo puede usar
// atómicos: un bullet es un único lugar, no una ruta.
export function isAtomicVerifiedPlace(place: VerifiedVideoPlace): boolean {
  return !/[,\n—]/u.test(place.value)
}
