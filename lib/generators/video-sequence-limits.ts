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
// convergencia real. NO subir más para 2a: de acá para arriba entra
// visualmente pero no llega a leerse a tiempo cuando el bullet es un
// nombre propio. Para 2c (tips en prosa completa) usar TIPS_MAX_CHARACTERS
// — es un cap distinto, no una versión más alta de este.
export const WINDOW_MAX_CHARACTERS = 30

// Cap propio de 2c (tips en prosa completa, no nombres propios) — Mati lo
// confirmó en 60 tras las corridas reales que mostraron fricción real (no
// ruido de otra regla) con el cap de 2a. Su razonamiento: el límite físico
// del contenedor es ~130 chars (3-4 líneas, 40px Inter), pero el límite
// real es cognitivo — a ~4 palabras/segundo de lectura, en 2.5s se
// procesan 8-11 palabras, ~55-65 caracteres. 60 es el número con margen.
// Nunca reusar para 2a — ahí el bullet se lee "como bloque" (un nombre
// propio), no palabra por palabra, y el cap correcto sigue siendo 30.
export const TIPS_MAX_CHARACTERS = 60

// Mismo cap para título/apertura y CTA/cierre de 2a/2b — no están atados a
// una ventana de 2.5s. Para 2c, Mati confirmó caps propios más abajo
// (TIPS_TITLE_MAX_CHARACTERS/TIPS_CTA_MAX_CHARACTERS): éste se había
// heredado del cap de bullets de 2a sin validarse específicamente para
// título/CTA, y en 2c el título tiene una carga distinta (nombra el
// destino real) que lo hacía rebotar. NO reusar los caps de 2c acá.
export const FIELD_MAX_CHARACTERS = 30

// Caps propios de 2c para título y CTA — confirmados por Mati con
// fundamento técnico de TemplateNativeSequential (1080x1920px):
// - Título: 65 caracteres (Inter Black 56px, wrap automático a 3 líneas).
//   Más que FIELD_MAX_CHARACTERS porque en 2c el título nombra el destino
//   real ("5 tips para Tilcara, Jujuy" ya usa 26 de 30 antes de decir
//   nada más) — arranca con menos margen que el título atemporal de 2a.
// - CTA: 40 caracteres (texto 32px, un solo renglón de botón).
// Verificado con corridas reales: en las fallas contra el cap de 30
// heredado, CTA rebotaba en el 100% de los intentos finales, título en un
// tercio — ambos caps eran genuinamente angostos, no ruido.
export const TIPS_TITLE_MAX_CHARACTERS = 65
export const TIPS_CTA_MAX_CHARACTERS = 40

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
// maxCharacters es opcional y default a FIELD_MAX_CHARACTERS (2a/2b) — 2c
// pasa TIPS_TITLE_MAX_CHARACTERS/TIPS_CTA_MAX_CHARACTERS explícitamente.
export function validateSequenceField(value: string, maxCharacters: number = FIELD_MAX_CHARACTERS): FieldValidation {
  const normalized = value.trim()
  const violations: FieldValidation['violations'] = []
  if (!normalized) violations.push('empty')
  if (normalized.length > maxCharacters) violations.push('characters')
  return { maxCharacters, characterCount: normalized.length, violations }
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
// aparte con validateSequenceField, no entran acá. windowMaxCharacters es
// opcional y default a WINDOW_MAX_CHARACTERS (2a/2b) — 2c pasa
// TIPS_MAX_CHARACTERS explícitamente, nunca se cambia el default acá.
export function validateVideoSequence(
  bullets: string[],
  clipSeconds?: number,
  windowMaxCharacters: number = WINDOW_MAX_CHARACTERS,
): VideoSequenceBudget {
  const normalized = bullets.map(bullet => bullet.trim())
  const violations: VideoSequenceBudget['violations'] = []

  if (normalized.length > MAX_BULLETS) violations.push('too-many-bullets')
  if (normalized.some(bullet => !bullet)) violations.push('bullet-empty')
  if (normalized.some(bullet => bullet.length > windowMaxCharacters)) violations.push('bullet-characters')
  // Sin chequeo de líneas — el bullet envuelve hasta 3 líneas automático
  // en un contenedor de 200px; el límite es de caracteres, no de líneas.

  return {
    bulletCount: normalized.length,
    maxBullets: MAX_BULLETS,
    targetBullets: TARGET_BULLETS,
    windowMaxCharacters,
    estimatedDurationSeconds: estimateVideoSequenceDuration(normalized.length, clipSeconds),
    violations,
  }
}
