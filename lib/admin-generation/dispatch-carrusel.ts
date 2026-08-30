import type { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import type { generateCarruselPromo } from '@/lib/generators/carrusel-promo'
import type { ClientOnboarding, Niche, ObjetivoInteraccion, PromoVariante, Salida } from '@/types'

export const ADAPTIVE_CARRUSEL_FORMATS = ['organico', 'conversacion', 'itinerario', 'ascenso', 'calendario', 'lugar'] as const
export const PROMO_CARRUSEL_VARIANTS: PromoVariante[] = ['promo_simple', 'promo_cta', 'promo_info']
export type AdaptiveCarruselFormatAdmin = typeof ADAPTIVE_CARRUSEL_FORMATS[number]

export interface CarruselDispatchGenerators {
  generateAdaptiveCarrusel: typeof generateAdaptiveCarrusel
  generateCarruselPromo: typeof generateCarruselPromo
}

export function resolveMesAnio(fechaInicio: string): string {
  const parsed = new Date(fechaInicio)
  return Number.isNaN(parsed.getTime())
    ? 'sin fecha'
    : parsed.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export async function dispatchAdminCarruselGeneration(
  formato: string,
  params: { salida: Salida; niche: Niche; clientName: string; clientOnboarding: ClientOnboarding | null; vozSlug?: string; objetivoInteraccion?: string },
  generators: CarruselDispatchGenerators,
): Promise<{ ok: true; piece: unknown } | { ok: false; error: string }> {
  if ((PROMO_CARRUSEL_VARIANTS as readonly string[]).includes(formato)) {
    const piece = await generators.generateCarruselPromo(params.salida, formato as PromoVariante, params.salida.carpeta_fotos_nombre)
    return { ok: true, piece }
  }
  if (!(ADAPTIVE_CARRUSEL_FORMATS as readonly string[]).includes(formato)) {
    return { ok: false, error: `formato debe ser uno de: ${[...ADAPTIVE_CARRUSEL_FORMATS, ...PROMO_CARRUSEL_VARIANTS].join(', ')}` }
  }
  const objetivo: ObjetivoInteraccion = ['comentar', 'guardar', 'compartir', 'convertir'].includes(params.objetivoInteraccion ?? '')
    ? params.objetivoInteraccion as ObjetivoInteraccion
    : 'convertir'
  const piece = await generators.generateAdaptiveCarrusel({
    formato: formato as AdaptiveCarruselFormatAdmin,
    salida: params.salida,
    niche: params.niche,
    clientName: params.clientName,
    clientOnboarding: params.clientOnboarding,
    vozSlug: params.vozSlug,
    objetivo,
    carpeta: params.salida.carpeta_fotos_nombre ?? 'material/salida',
    mesAnio: resolveMesAnio(params.salida.fecha_inicio),
  })
  return { ok: true, piece }
}
