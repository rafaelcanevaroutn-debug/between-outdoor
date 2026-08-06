export const VIDEO_TEXT_LIMITS = {
  charactersPerSecond: 12,
  readingBufferSeconds: 0.75,
  absoluteMaxCharacters: 90,
  maxLines: 2,
  defaultClipSeconds: 5,
} as const

export function resolveVideoClipDuration(clipSeconds?: number): number {
  return typeof clipSeconds === 'number' && Number.isFinite(clipSeconds) && clipSeconds > 0
    ? clipSeconds
    : VIDEO_TEXT_LIMITS.defaultClipSeconds
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
  return Number((readingSeconds + VIDEO_TEXT_LIMITS.readingBufferSeconds).toFixed(1))
}

export interface VideoTextValidation {
  maxCharacters: number
  characterCount: number
  lineCount: number
  violations: Array<'empty' | 'characters' | 'lines'>
}

export function validateVideoText(copy: string, clipSeconds: number): VideoTextValidation {
  const normalized = copy.trim()
  const lines = normalized ? normalized.split(/\r?\n/u) : []
  const maxCharacters = maxVideoCopyCharacters(clipSeconds)
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
