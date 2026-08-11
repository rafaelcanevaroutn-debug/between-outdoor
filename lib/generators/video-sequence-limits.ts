import { HARD_MAX_CLIP_SECONDS } from './video-text-limits.ts'

// Modelo cerrado por Mati para TemplateNativeSequential (Familia 2):
// SOLO los bullets/segmentos del medio consumen una ventana fija de 2.5s
// (75 frames @ 30fps) cada uno. Título/apertura (fijo desde el arranque)
// y CTA/cierre (aparece al terminar el último bullet, queda visible hasta
// el final del clip) NO son ventanas — no se cuentan, no comparten
// presupuesto con los bullets, cada uno tiene su propio límite de chars.
export const WINDOW_DURATION_SECONDS = 2.5

// Mati: el ancho real del contenedor permite 60-70 caracteres, pero lo que
// manda es el tiempo de lectura neto (1.83s de los 2.5s — el resto son
// transiciones de fade in/out). floor(1.83*12)=21 es lo que da la fórmula
// genérica, pero es demasiado ajustado para nombres propios que se leen
// "como bloque" — Mati subió el número a mano a 30 tras validar la
// convergencia real. NO subir más: de acá para arriba entra visualmente
// pero no llega a leerse a tiempo.
export const WINDOW_MAX_CHARACTERS = 30

// Mismo cap para título/apertura y CTA/cierre — no están atados a una
// ventana de 2.5s, pero Mati no dio todavía un número propio distinto.
export const FIELD_MAX_CHARACTERS = 30

export const MAX_BULLETS = 5 // hard — nunca superarlo
export const TARGET_BULLETS = 4 // objetivo que le pedimos a Gemini

export const VIDEO_SEQUENCE_LIMITS = {
  defaultClipSeconds: HARD_MAX_CLIP_SECONDS,
} as const

export function resolveVideoSequenceDuration(clipSeconds?: number): number {
  const resolved = typeof clipSeconds === 'number' && Number.isFinite(clipSeconds) && clipSeconds > 0
    ? clipSeconds
    : VIDEO_SEQUENCE_LIMITS.defaultClipSeconds
  return Math.min(resolved, HARD_MAX_CLIP_SECONDS)
}

// Solo los bullets tienen ventana fija — el título es concurrente (no
// suma tiempo) y el CTA ocupa lo que sobra hasta el techo del clip, así
// que la duración real del video es la de los bullets, clampeada al techo.
export function estimateVideoSequenceDuration(bulletCount: number, clipSeconds?: number): number {
  const resolved = resolveVideoSequenceDuration(clipSeconds)
  const bulletsDuration = bulletCount * WINDOW_DURATION_SECONDS
  return Number(Math.min(bulletsDuration, resolved).toFixed(1))
}

export interface FieldValidation {
  maxCharacters: number
  characterCount: number
  violations: Array<'empty' | 'characters'>
}

// Para título/apertura y cta/cierre — sin ventana propia y sin límite de
// líneas (el wrap visual hasta 3 líneas es automático, no se valida acá).
export function validateSequenceField(value: string): FieldValidation {
  const normalized = value.trim()
  const violations: FieldValidation['violations'] = []
  if (!normalized) violations.push('empty')
  if (normalized.length > FIELD_MAX_CHARACTERS) violations.push('characters')
  return { maxCharacters: FIELD_MAX_CHARACTERS, characterCount: normalized.length, violations }
}

export interface VideoSequenceBudget {
  bulletCount: number
  maxBullets: number
  targetBullets: number
  windowMaxCharacters: number
  estimatedDurationSeconds: number
  violations: Array<'too-many-bullets' | 'bullet-empty' | 'bullet-characters'>
}

// Valida SOLO los bullets — título/cta (o apertura/cierre) se validan
// aparte con validateSequenceField, no entran acá.
export function validateVideoSequence(bullets: string[], clipSeconds?: number): VideoSequenceBudget {
  const normalized = bullets.map(bullet => bullet.trim())
  const violations: VideoSequenceBudget['violations'] = []

  if (normalized.length > MAX_BULLETS) violations.push('too-many-bullets')
  if (normalized.some(bullet => !bullet)) violations.push('bullet-empty')
  if (normalized.some(bullet => bullet.length > WINDOW_MAX_CHARACTERS)) violations.push('bullet-characters')
  // Sin chequeo de líneas — el bullet envuelve hasta 3 líneas automático
  // en un contenedor de 200px; el límite es de caracteres, no de líneas.

  return {
    bulletCount: normalized.length,
    maxBullets: MAX_BULLETS,
    targetBullets: TARGET_BULLETS,
    windowMaxCharacters: WINDOW_MAX_CHARACTERS,
    estimatedDurationSeconds: estimateVideoSequenceDuration(normalized.length, clipSeconds),
    violations,
  }
}
