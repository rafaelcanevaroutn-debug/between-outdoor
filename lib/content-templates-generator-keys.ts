// generator_key es el puente entre una fila de content_templates y el
// generador real del código — sin asset propio para video/carrusel, así que
// esto es solo texto convencional ('carrusel_itinerario', 'video_familia_3_3a').
// Acá vive el parseo, para no duplicarlo entre la ruta de preview y sus tests.

const CARRUSEL_PREVIEW_FORMATS = new Set([
  'organico',
  'itinerario',
  'ascenso',
  'calendario',
  'lugar',
  'conversacion',
] as const)

export type CarruselPreviewFormat = 'organico' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar' | 'conversacion'
export type RegistryCarruselFormat = CarruselPreviewFormat | 'editorial'

const CARRUSEL_PREFIX = 'carrusel_'

/** Devuelve el formato de carrusel si generator_key mapea a uno soportado por preview, si no null. */
export function resolveCarruselPreviewFormat(generatorKey: string): CarruselPreviewFormat | null {
  if (!generatorKey.startsWith(CARRUSEL_PREFIX)) return null
  const formato = generatorKey.slice(CARRUSEL_PREFIX.length)
  return CARRUSEL_PREVIEW_FORMATS.has(formato as CarruselPreviewFormat) ? (formato as CarruselPreviewFormat) : null
}

export function resolveCarruselGeneratorFormat(generatorKey: string): RegistryCarruselFormat | null {
  if (generatorKey === 'carrusel_editorial') return 'editorial'
  return resolveCarruselPreviewFormat(generatorKey)
}

const VIDEO_FORMATS = new Set(['1a', '1b', '1c', '2a', '2b', '2c', '3a', '3b', '3c', '3d', '3e', '4', '5'] as const)
export type RegistryVideoFormat = '1a' | '1b' | '1c' | '2a' | '2b' | '2c' | '3a' | '3b' | '3c' | '3d' | '3e' | '4' | '5'

/** Acepta la convención documentada y variantes históricas razonables. */
export function resolveVideoGeneratorFormat(generatorKey: string): RegistryVideoFormat | null {
  if (!generatorKey.startsWith('video_familia_')) return null
  const suffix = generatorKey.slice('video_familia_'.length)
  const explicitFamily = suffix.match(/^([123])_([123][abcde])$/u)
  const compactFamily = suffix.match(/^([123])_([abcde])$/u)
  const normalized = explicitFamily?.[2]
    ?? (compactFamily ? `${compactFamily[1]}${compactFamily[2]}` : suffix)
  return VIDEO_FORMATS.has(normalized as RegistryVideoFormat) ? normalized as RegistryVideoFormat : null
}

/** Devuelve el molde clásico soportado. Flyer reutiliza hoy el mismo motor. */
export function resolveBannerGeneratorMolde(generatorKey: string): 1 | 2 | 3 | 4 | 5 | 6 | null {
  const match = generatorKey.match(/^(?:banner|flyer)_molde_([1-6])$/u)
  return match ? Number(match[1]) as 1 | 2 | 3 | 4 | 5 | 6 : null
}
