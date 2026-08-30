import type { FormatoCarrusel, Salida, VideoKnowledgeFormat } from '@/types'

export const LOCAL_RECURRING_CAROUSEL_FORMATS = [
  'organico',
  'itinerario',
  'editorial',
] as const satisfies readonly FormatoCarrusel[]

export const LOCAL_RECURRING_VIDEO_SUBFAMILIES = [
  '3b',
  '3a',
  '1c',
  '3e',
  '4',
] as const satisfies readonly VideoKnowledgeFormat[]

export const LOCAL_RECURRING_BANNER_MOLDES = [6] as const

const carouselSet = new Set<FormatoCarrusel>(LOCAL_RECURRING_CAROUSEL_FORMATS)
const videoSet = new Set<VideoKnowledgeFormat>(LOCAL_RECURRING_VIDEO_SUBFAMILIES)

export function validateLocalRecurringContentRequest(params: {
  salida: Pick<Salida, 'tipo_viaje'>
  formato: unknown
  formatoCarrusel?: unknown
  videoSubfamilia?: unknown
  bannerMolde?: unknown
}): string | null {
  if (params.salida.tipo_viaje !== 'salida_recurrente') return null

  if (params.formato === 'carrusel') {
    return carouselSet.has(params.formatoCarrusel as FormatoCarrusel)
      ? null
      : 'Para un grupo recurrente solo podés generar carruseles Orgánico, Información del grupo o Editorial.'
  }
  if (params.formato === 'video') {
    return videoSet.has(params.videoSubfamilia as VideoKnowledgeFormat)
      ? null
      : 'Para un grupo recurrente solo podés generar videos POV, Reflexivo, Voz en off, Lugar o Información fija.'
  }
  if (params.formato === 'banner') {
    return Number(params.bannerMolde) === 6
      ? null
      : 'Para un grupo recurrente solo está habilitado el banner de Comunidad.'
  }
  return 'Para un grupo recurrente solo están habilitados carruseles, videos y banners de su banco específico.'
}
