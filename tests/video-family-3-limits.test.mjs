import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateVideoCopyDuration,
  HARD_MAX_CLIP_SECONDS,
  maxVideoCopyCharacters,
  resolveVideoClipDuration,
  truncateVideoCopyAtWord,
  validateVideoText,
  VIDEO_TEXT_LIMITS,
  DATO_DURO_MAX_CHARACTERS,
  validateDatoDuroWidth,
} from '../lib/generators/video-text-limits.ts'

test('usa 15 segundos por defecto — el tope real y duro del clip de fondo de Mati', () => {
  assert.equal(HARD_MAX_CLIP_SECONDS, 15)
  assert.equal(resolveVideoClipDuration(), 15)
  assert.equal(resolveVideoClipDuration(Number.NaN), 15)
  assert.equal(resolveVideoClipDuration(0), 15)
})

test('clampea cualquier valor por encima de 15s — el bug real que reportó Mati', () => {
  assert.equal(resolveVideoClipDuration(20), 15)
  assert.equal(resolveVideoClipDuration(1000), 15)
})

test('calcula el presupuesto con 12 CPS y buffer de 0.75 segundos', () => {
  assert.equal(maxVideoCopyCharacters(2), 15)
  assert.equal(maxVideoCopyCharacters(3), 27)
  assert.equal(maxVideoCopyCharacters(5), 51)
  assert.equal(maxVideoCopyCharacters(7), 75)
})

test('aplica el tope absoluto de 171 caracteres (floor((15-0.75)*12))', () => {
  assert.equal(maxVideoCopyCharacters(15), 171)
  assert.equal(maxVideoCopyCharacters(60), 171)
  assert.equal(VIDEO_TEXT_LIMITS.absoluteMaxCharacters, 171)
})

test('estima duración con la misma velocidad y buffer', () => {
  assert.equal(estimateVideoCopyDuration('123456789012'), 1.8)
  assert.equal(estimateVideoCopyDuration(''), 0.8)
})

test('clampea duracion_estimada_segundos a 15s — cinturón y tirantes para el contrato de Mati', () => {
  assert.equal(estimateVideoCopyDuration('x'.repeat(200)), 15)
})

test('valida caracteres y máximo de dos líneas', () => {
  assert.deepEqual(validateVideoText('Una línea\nDos líneas\nTres líneas', 5).violations, ['lines'])
  assert.deepEqual(validateVideoText('x'.repeat(52), 5).violations, ['characters'])
  assert.deepEqual(validateVideoText('', 5).violations, ['empty'])
  assert.deepEqual(validateVideoText('POV: aparece el sendero...', 5).violations, [])
})

test('acepta un maxCharacters override — usado por los targets de Familia 3', () => {
  const validation = validateVideoText('x'.repeat(20), 5, 15)
  assert.equal(validation.maxCharacters, 15)
  assert.deepEqual(validation.violations, ['characters'])
})

test('trunca en palabra completa y limpia conectores finales', () => {
  assert.equal(truncateVideoCopyAtWord('Una frase demasiado larga para el video', 25), 'Una frase demasiado')
  assert.equal(truncateVideoCopyAtWord('Una frase que termina con y algo más', 27), 'Una frase que termina')
})

test('dato_duro de Familia 4 — tope de ancho fijo de 14 caracteres, no de tiempo', () => {
  assert.equal(DATO_DURO_MAX_CHARACTERS, 14)
  assert.deepEqual(validateDatoDuroWidth('$100.000').violations, [])
  assert.deepEqual(validateDatoDuroWidth('OFERTA ESPECIAL').violations, ['characters'])
  assert.deepEqual(validateDatoDuroWidth('').violations, ['empty'])
  assert.deepEqual(validateDatoDuroWidth('27 dic\n2026').violations, ['lines'])
})
