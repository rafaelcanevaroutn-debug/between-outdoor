// Caps de caracteres para contenido de banner — por ANCHO/LÍNEA, nunca por
// tiempo de lectura. Un banner no tiene duración: se lee al ritmo del
// espectador, no como un video con ventanas de segundos. Mismo principio que
// ya usa dato_duro en Familia 4 (video-text-limits.ts: "NO sigue la fórmula
// de lectura de copy — su límite es de ANCHO, no de tiempo") y que usa todo
// el sistema de límites de carrusel (carrusel-text-limits.ts): un número fijo
// de caracteres por campo, sin fórmula de caracteres-por-segundo de por medio.
//
// A propósito, este archivo NO define un maxCharacters por defecto para
// ningún campo de banner. No hay todavía un diseño de banner real (ancho de
// render, tipografía, tamaño) contra el cual calibrar un número — mismo
// estado en el que quedó el target de caracteres de Ficha antes de la
// primera corrida real. Cada caller debe pasar su propio maxCharacters
// explícito; fijar un default acá sería inventar una regla de diseño que
// todavía no existe.

export interface BannerFieldValidation {
  maxCharacters: number
  characterCount: number
  violations: Array<'empty' | 'characters'>
}

export function validateBannerField(value: string, maxCharacters: number): BannerFieldValidation {
  const normalized = value.trim()
  const violations: BannerFieldValidation['violations'] = []
  if (!normalized) violations.push('empty')
  if (normalized.length > maxCharacters) violations.push('characters')
  return { maxCharacters, characterCount: normalized.length, violations }
}

export function validateBannerFieldList(
  values: string[],
  maxCharactersPerItem: number,
): BannerFieldValidation[] {
  return values.map(value => validateBannerField(value, maxCharactersPerItem))
}

function cleanTruncatedEnding(value: string): string {
  let clean = value.trimEnd().replace(/[\s,;:–—-]+$/u, '').trimEnd()
  clean = clean.replace(/(?:^|\s)(?:y|o|e|u|de|con|para|a|en|por|sin)$/iu, '').trimEnd()
  return clean
}

// Mismo mecanismo que truncateVideoCopyAtWord (video-text-limits.ts) y
// truncateAtWord (carrusel-text-limits.ts): cortar en borde de palabra, nunca
// a mitad, y limpiar conectores sueltos que queden colgando al final.
export function truncateBannerFieldAtWord(value: string, limit: number): string {
  const normalized = value.trim()
  if (normalized.length <= limit) return normalized
  const cut = normalized.slice(0, limit)
  const lastBoundary = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('\n'))
  const wordSafe = lastBoundary > 0 ? cut.slice(0, lastBoundary) : cut
  return cleanTruncatedEnding(wordSafe)
}
