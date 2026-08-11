// Fondos placeholder por formato_carrusel — sin foto real todavía.
// Agrupados en 3 familias inspiradas en la biogeografía del cliente
// (ver lib/knowledge/global/lineamiento.md): Norte (tierra/cardón),
// Cuyo (violeta/gris de montaña seca), Sur (verde frío/lenga).
// No hay hoy un vínculo real salida→región en el schema, así que la
// asignación es por formato_carrusel, no por cliente.
import type { FormatoCarrusel } from '@/types'

export type RegionBiogeografica = 'norte' | 'cuyo' | 'sur'

export interface GradientePreset {
  region: RegionBiogeografica
  background: string
  mountain: string
}

export const GRADIENTES_POR_FORMATO: Record<FormatoCarrusel, GradientePreset> = {
  editorial: {
    region: 'norte',
    background: 'linear-gradient(160deg, #8B3A2B 0%, #C2703D 45%, #6B4226 100%)',
    mountain: 'linear-gradient(180deg, rgba(74,43,26,0) 0%, #4A2B1A 100%)',
  },
  lugar: {
    region: 'norte',
    background: 'linear-gradient(160deg, #A8542F 0%, #D08B4F 45%, #7A4324 100%)',
    mountain: 'linear-gradient(180deg, rgba(58,31,15,0) 0%, #3A1F0F 100%)',
  },
  itinerario: {
    region: 'cuyo',
    background: 'linear-gradient(160deg, #3D2F47 0%, #7C6A8E 45%, #4A3B52 100%)',
    mountain: 'linear-gradient(180deg, rgba(30,24,35,0) 0%, #1E1823 100%)',
  },
  ascenso: {
    region: 'cuyo',
    background: 'linear-gradient(160deg, #443752 0%, #8B7C9E 45%, #362A40 100%)',
    mountain: 'linear-gradient(180deg, rgba(26,20,32,0) 0%, #1A1420 100%)',
  },
  organico: {
    region: 'sur',
    background: 'linear-gradient(160deg, #1B3B33 0%, #3E6B5C 45%, #0F241F 100%)',
    mountain: 'linear-gradient(180deg, rgba(10,20,17,0) 0%, #0A1411 100%)',
  },
  conversacion: {
    region: 'sur',
    background: 'linear-gradient(160deg, #204438 0%, #4E7E68 45%, #12281F 100%)',
    mountain: 'linear-gradient(180deg, rgba(10,20,16,0) 0%, #0A1310 100%)',
  },
  calendario: {
    region: 'sur',
    background: 'linear-gradient(160deg, #17352E 0%, #5A9484 45%, #0D211C 100%)',
    mountain: 'linear-gradient(180deg, rgba(9,19,16,0) 0%, #09130F 100%)',
  },
}

export const DEFAULT_GRADIENTE: GradientePreset = {
  region: 'sur',
  background: 'linear-gradient(160deg, #162216 0%, #2C5C41 45%, #0A0F0A 100%)',
  mountain: 'linear-gradient(180deg, rgba(10,15,10,0) 0%, #0A0F0A 100%)',
}

export const REGION_LABELS: Record<RegionBiogeografica, string> = {
  norte: 'Norte',
  cuyo: 'Cuyo',
  sur: 'Sur',
}

export const FORMATO_CARRUSEL_LABELS: Record<FormatoCarrusel, string> = {
  editorial: 'Editorial',
  organico: 'Orgánico',
  itinerario: 'Itinerario',
  ascenso: 'Ascenso',
  calendario: 'Fechas',
  lugar: 'Lugar',
  conversacion: 'Conversación',
}

export function gradientePorFormato(formato: FormatoCarrusel | null): GradientePreset {
  if (!formato) return DEFAULT_GRADIENTE
  return GRADIENTES_POR_FORMATO[formato] ?? DEFAULT_GRADIENTE
}
