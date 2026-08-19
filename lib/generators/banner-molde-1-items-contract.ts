import type { Salida } from '@/types'
import {
  isAtomicVerifiedPlace,
  verifiedVideoPlaces,
  type VerifiedVideoPlace,
} from './video-verified-places.ts'

export const MIN_BANNER_ITEMS = 2
export const MAX_BANNER_ITEMS = 3

export interface BannerMolde1ItemsEligibility {
  eligible: boolean
  candidateCount: number
  minRequired: number
}

// Reusa la misma fuente factual y la misma condición de atomicidad de 2a,
// pero aplica el cap de ancho del banner. No llama listicleCandidatePlaces:
// esa función ya descarta nombres por WINDOW_MAX_CHARACTERS (tiempo de video).
export function bannerMolde1ItemCandidates(
  salida: Salida,
  itemMaxCharacters: number,
): VerifiedVideoPlace[] {
  return verifiedVideoPlaces(salida)
    .filter(isAtomicVerifiedPlace)
    .filter(place => place.value.length <= itemMaxCharacters)
}

export function evaluateBannerMolde1ItemsEligibility(
  salida: Salida,
  itemMaxCharacters: number,
): BannerMolde1ItemsEligibility {
  const candidateCount = bannerMolde1ItemCandidates(salida, itemMaxCharacters).length
  return {
    eligible: candidateCount >= MIN_BANNER_ITEMS,
    candidateCount,
    minRequired: MIN_BANNER_ITEMS,
  }
}
