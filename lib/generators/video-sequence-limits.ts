import { VIDEO_TEXT_LIMITS } from './video-text-limits.ts'

export const VIDEO_SEQUENCE_LIMITS = {
  defaultClipSeconds: 12,
  minimumUnitSeconds: 1.5,
  minimumClosingSeconds: 1.25,
} as const

export interface VideoSequenceBudget {
  clipDurationSeconds: number
  unitCount: number
  characterCount: number
  maxTotalCharacters: number
  estimatedDurationSeconds: number
  violations: Array<'duration' | 'unit-empty' | 'unit-characters' | 'unit-lines'>
}

export function resolveVideoSequenceDuration(clipSeconds?: number): number {
  return typeof clipSeconds === 'number' && Number.isFinite(clipSeconds) && clipSeconds > 0
    ? clipSeconds
    : VIDEO_SEQUENCE_LIMITS.defaultClipSeconds
}

export function estimateVideoSequenceDuration(
  units: string[],
  closingUnitCount = 0,
): number {
  const normalized = units.map(unit => unit.trim()).filter(Boolean)
  const readingSeconds = normalized.reduce(
    (total, unit) => total + unit.length / VIDEO_TEXT_LIMITS.charactersPerSecond,
    0,
  )
  const readingEstimate = (
    readingSeconds + normalized.length * VIDEO_TEXT_LIMITS.readingBufferSeconds
  )
  const closingCount = Math.min(Math.max(0, closingUnitCount), normalized.length)
  const minimumEstimate =
    (normalized.length - closingCount) * VIDEO_SEQUENCE_LIMITS.minimumUnitSeconds
    + closingCount * VIDEO_SEQUENCE_LIMITS.minimumClosingSeconds
  return Number(Math.max(readingEstimate, minimumEstimate).toFixed(1))
}

export function maxVideoSequenceCharacters(
  clipSeconds: number,
  unitCount: number,
): number {
  const duration = resolveVideoSequenceDuration(clipSeconds)
  const transitionBudget = Math.max(0, unitCount) * VIDEO_TEXT_LIMITS.readingBufferSeconds
  return Math.max(
    0,
    Math.floor((duration - transitionBudget) * VIDEO_TEXT_LIMITS.charactersPerSecond),
  )
}

export function validateVideoSequence(
  units: string[],
  clipSeconds: number,
  closingUnitCount = 0,
): VideoSequenceBudget {
  const normalized = units.map(unit => unit.trim())
  const characterCount = normalized.reduce((total, unit) => total + unit.length, 0)
  const maxTotalCharacters = maxVideoSequenceCharacters(clipSeconds, normalized.length)
  const estimatedDurationSeconds = estimateVideoSequenceDuration(normalized, closingUnitCount)
  const violations: VideoSequenceBudget['violations'] = []

  if (normalized.some(unit => !unit)) violations.push('unit-empty')
  if (normalized.some(unit => unit.length > VIDEO_TEXT_LIMITS.absoluteMaxCharacters)) {
    violations.push('unit-characters')
  }
  if (normalized.some(unit => unit.split(/\r?\n/u).length > VIDEO_TEXT_LIMITS.maxLines)) {
    violations.push('unit-lines')
  }
  if (characterCount > maxTotalCharacters || estimatedDurationSeconds > clipSeconds) {
    violations.push('duration')
  }

  return {
    clipDurationSeconds: clipSeconds,
    unitCount: normalized.length,
    characterCount,
    maxTotalCharacters,
    estimatedDurationSeconds,
    violations,
  }
}
