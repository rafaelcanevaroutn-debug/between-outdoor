import type { VideoTypographyId } from '@/types'

export type { VideoTypographyId }

// Catálogo cerrado confirmado por Mati — toda la plantilla (título,
// bullets, botón, dato_duro en Familia 4 incluido) respeta este ID
// dinámicamente, sin excepción por familia.
export const VIDEO_TYPOGRAPHY_CATALOG: readonly VideoTypographyId[] = [
  'amiri',
  'classic',
  'modern',
  'editor',
  'typewrite',
  'aboreto',
  'elegant',
  'adorn slab',
  'asar',
  'balthazar',
  'cinzel',
  'crimson text',
  'cormorant',
  'oswald',
  'plex',
  'poppins',
  'Montserrat',
  'Inter',
  'Oswald',
  'Bangers',
  'Playfair Display',
]

export function isVideoTypographyId(value: string): value is VideoTypographyId {
  return (VIDEO_TYPOGRAPHY_CATALOG as readonly string[]).includes(value)
}
