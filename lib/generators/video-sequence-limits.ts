import { HARD_MAX_CLIP_SECONDS, VIDEO_TEXT_LIMITS } from './video-text-limits.ts'

// Modelo confirmado por Mati para TemplateNativeSequential (Familia 2):
// cada unidad/ventana vive un tiempo FIJO de 2.5s (75 frames @ 30fps) —
// no se reparte un presupuesto total entre las unidades. Más unidades
// = video más largo, no menos tiempo por unidad. El modelo viejo
// ("presupuesto total ÷ unidades") quedó descartado — no lo reintroduzcas.
export const WINDOW_DURATION_SECONDS = 2.5

// floor((2.5 - 0.75) * 12) = 21 — exacto, tope de texto por ventana,
// plano para cualquier unidad (título, ítem, cta, apertura, segmento, cierre).
export const WINDOW_MAX_CHARACTERS = Math.floor(
  (WINDOW_DURATION_SECONDS - VIDEO_TEXT_LIMITS.readingBufferSeconds) * VIDEO_TEXT_LIMITS.charactersPerSecond,
)

export const VIDEO_SEQUENCE_LIMITS = {
  defaultClipSeconds: HARD_MAX_CLIP_SECONDS,
} as const

export function resolveVideoSequenceDuration(clipSeconds?: number): number {
  const resolved = typeof clipSeconds === 'number' && Number.isFinite(clipSeconds) && clipSeconds > 0
    ? clipSeconds
    : VIDEO_SEQUENCE_LIMITS.defaultClipSeconds
  return Math.min(resolved, HARD_MAX_CLIP_SECONDS)
}

// TODO(mati): confirmar si apertura/cierre cuentan como ventana de 2.5s o
// son gratis/separadas del conteo. Hoy asumo que SÍ cuentan (más
// conservador — evita volver a desbordar los 15s si Mati confirma que sí).
// Si confirma que son gratis, restar su cantidad acá antes del floor.
export function maxSequenceWindows(clipSeconds?: number): number {
  const resolved = resolveVideoSequenceDuration(clipSeconds)
  return Math.floor(resolved / WINDOW_DURATION_SECONDS)
}

// Determinística — ya no depende del texto real, cada ventana ocupa
// siempre 2.5s exactos.
export function estimateVideoSequenceDuration(unitCount: number): number {
  const estimated = unitCount * WINDOW_DURATION_SECONDS
  return Number(Math.min(estimated, HARD_MAX_CLIP_SECONDS).toFixed(1))
}

export interface VideoSequenceBudget {
  unitCount: number
  maxWindows: number
  windowMaxCharacters: number
  estimatedDurationSeconds: number
  violations: Array<'too-many-units' | 'unit-empty' | 'unit-characters' | 'unit-lines'>
}

export function validateVideoSequence(units: string[], clipSeconds?: number): VideoSequenceBudget {
  const normalized = units.map(unit => unit.trim())
  const maxWindows = maxSequenceWindows(clipSeconds)
  const violations: VideoSequenceBudget['violations'] = []

  if (normalized.length > maxWindows) violations.push('too-many-units')
  if (normalized.some(unit => !unit)) violations.push('unit-empty')
  if (normalized.some(unit => unit.length > WINDOW_MAX_CHARACTERS)) violations.push('unit-characters')
  if (normalized.some(unit => unit.split(/\r?\n/u).length > VIDEO_TEXT_LIMITS.maxLines)) {
    violations.push('unit-lines')
  }

  return {
    unitCount: normalized.length,
    maxWindows,
    windowMaxCharacters: WINDOW_MAX_CHARACTERS,
    estimatedDurationSeconds: estimateVideoSequenceDuration(normalized.length),
    violations,
  }
}
