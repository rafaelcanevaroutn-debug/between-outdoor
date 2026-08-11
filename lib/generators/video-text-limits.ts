// Tope absoluto y duro del clip de fondo de Mati — 15 segundos exactos,
// siempre. Pasado ese punto el fondo se corta y el texto queda flotando
// sin nada atrás. Fuente única de verdad, importada también por
// video-sequence-limits.ts.
export const HARD_MAX_CLIP_SECONDS = 15

export const VIDEO_TEXT_LIMITS = {
  charactersPerSecond: 12,
  readingBufferSeconds: 0.75,
  // floor((15 - 0.75) * 12) = 171 — techo duro anti-overflow de campo único.
  absoluteMaxCharacters: 171,
  maxLines: 2,
  defaultClipSeconds: HARD_MAX_CLIP_SECONDS,
} as const

export function resolveVideoClipDuration(clipSeconds?: number): number {
  const resolved = typeof clipSeconds === 'number' && Number.isFinite(clipSeconds) && clipSeconds > 0
    ? clipSeconds
    : VIDEO_TEXT_LIMITS.defaultClipSeconds
  return Math.min(resolved, HARD_MAX_CLIP_SECONDS)
}

export function maxVideoCopyCharacters(clipSeconds: number): number {
  const resolvedSeconds = resolveVideoClipDuration(clipSeconds)
  const readableSeconds = Math.max(0, resolvedSeconds - VIDEO_TEXT_LIMITS.readingBufferSeconds)
  return Math.min(
    Math.floor(readableSeconds * VIDEO_TEXT_LIMITS.charactersPerSecond),
    VIDEO_TEXT_LIMITS.absoluteMaxCharacters,
  )
}

export function estimateVideoCopyDuration(copy: string): number {
  const readingSeconds = copy.trim().length / VIDEO_TEXT_LIMITS.charactersPerSecond
  const estimated = readingSeconds + VIDEO_TEXT_LIMITS.readingBufferSeconds
  // Cinturón y tirantes — este valor va al contrato que recibe Mati.
  return Number(Math.min(estimated, HARD_MAX_CLIP_SECONDS).toFixed(1))
}

export interface VideoTextValidation {
  maxCharacters: number
  characterCount: number
  lineCount: number
  violations: Array<'empty' | 'characters' | 'lines'>
}

export function validateVideoText(copy: string, clipSeconds: number, maxCharactersOverride?: number): VideoTextValidation {
  const normalized = copy.trim()
  const lines = normalized ? normalized.split(/\r?\n/u) : []
  const maxCharacters = maxCharactersOverride ?? maxVideoCopyCharacters(clipSeconds)
  const violations: VideoTextValidation['violations'] = []

  if (!normalized) violations.push('empty')
  if (normalized.length > maxCharacters) violations.push('characters')
  if (lines.length > VIDEO_TEXT_LIMITS.maxLines) violations.push('lines')

  return {
    maxCharacters,
    characterCount: normalized.length,
    lineCount: lines.length,
    violations,
  }
}

function cleanEnding(value: string): string {
  let clean = value.trimEnd().replace(/[\s,;:–—-]+$/u, '').trimEnd()
  clean = clean.replace(/(?:^|\s)(?:y|o|e|u|de|con|para|a|en|por|sin)$/iu, '').trimEnd()
  return clean
}

export function truncateVideoCopyAtWord(copy: string, limit: number): string {
  const normalized = copy.trim()
  if (normalized.length <= limit) return normalized
  const cut = normalized.slice(0, limit)
  const lastBoundary = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('\n'))
  const wordSafe = lastBoundary > 0 ? cut.slice(0, lastBoundary) : cut
  return cleanEnding(wordSafe)
}

// ─── dato_duro de Familia 4 — tope de ANCHO, no de tiempo ──────────────────
// 1000px útiles a 110px Playfair en TemplateNativeCommercial → 14
// caracteres (con espacios) es el máximo seguro. Sin relación con
// CPS/buffer/duración de clip.
export const DATO_DURO_MAX_CHARACTERS = 14

export interface DatoDuroValidation {
  maxCharacters: number
  characterCount: number
  violations: Array<'empty' | 'characters' | 'lines'>
}

export function validateDatoDuroWidth(datoDuro: string): DatoDuroValidation {
  const normalized = datoDuro.trim()
  const violations: DatoDuroValidation['violations'] = []
  if (!normalized) violations.push('empty')
  if (normalized.length > DATO_DURO_MAX_CHARACTERS) violations.push('characters')
  if (normalized.includes('\n')) violations.push('lines')
  return {
    maxCharacters: DATO_DURO_MAX_CHARACTERS,
    characterCount: normalized.length,
    violations,
  }
}
