import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateVideoCopyDuration,
  maxVideoCopyCharacters,
  resolveVideoClipDuration,
  truncateVideoCopyAtWord,
  validateVideoText,
  VIDEO_TEXT_LIMITS,
} from '../lib/generators/video-text-limits.ts'

test('usa 5 segundos por defecto', () => {
  assert.equal(resolveVideoClipDuration(), 5)
  assert.equal(resolveVideoClipDuration(Number.NaN), 5)
  assert.equal(resolveVideoClipDuration(0), 5)
})

test('calcula el presupuesto con 12 CPS y buffer de 0.75 segundos', () => {
  assert.equal(maxVideoCopyCharacters(2), 15)
  assert.equal(maxVideoCopyCharacters(3), 27)
  assert.equal(maxVideoCopyCharacters(5), 51)
  assert.equal(maxVideoCopyCharacters(7), 75)
})

test('aplica el tope absoluto de 90 caracteres', () => {
  assert.equal(maxVideoCopyCharacters(10), 90)
  assert.equal(maxVideoCopyCharacters(60), 90)
  assert.equal(VIDEO_TEXT_LIMITS.absoluteMaxCharacters, 90)
})

test('estima duración con la misma velocidad y buffer', () => {
  assert.equal(estimateVideoCopyDuration('123456789012'), 1.8)
  assert.equal(estimateVideoCopyDuration(''), 0.8)
})

test('valida caracteres y máximo de dos líneas', () => {
  assert.deepEqual(validateVideoText('Una línea\nDos líneas\nTres líneas', 5).violations, ['lines'])
  assert.deepEqual(validateVideoText('x'.repeat(52), 5).violations, ['characters'])
  assert.deepEqual(validateVideoText('', 5).violations, ['empty'])
  assert.deepEqual(validateVideoText('POV: aparece el sendero...', 5).violations, [])
})

test('trunca en palabra completa y limpia conectores finales', () => {
  assert.equal(truncateVideoCopyAtWord('Una frase demasiado larga para el video', 25), 'Una frase demasiado')
  assert.equal(truncateVideoCopyAtWord('Una frase que termina con y algo más', 27), 'Una frase que termina')
})
