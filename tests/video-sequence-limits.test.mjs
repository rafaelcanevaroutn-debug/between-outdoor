import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateVideoSequenceDuration,
  maxSequenceWindows,
  resolveVideoSequenceDuration,
  validateVideoSequence,
  WINDOW_DURATION_SECONDS,
  WINDOW_MAX_CHARACTERS,
} from '../lib/generators/video-sequence-limits.ts'

test('usa 15 segundos por defecto', () => {
  assert.equal(resolveVideoSequenceDuration(), 15)
  assert.equal(resolveVideoSequenceDuration(0), 15)
})

test('clampea a 15s — el bug real: antes resolveVideoSequenceDuration(20) devolvía 20 sin techo', () => {
  assert.equal(resolveVideoSequenceDuration(20), 15)
  assert.equal(resolveVideoSequenceDuration(1000), 15)
})

test('cada ventana dura 2.5s fijos — modelo confirmado por Mati (75 frames @ 30fps)', () => {
  assert.equal(WINDOW_DURATION_SECONDS, 2.5)
})

test('tope de texto por ventana: floor((2.5 - 0.75) * 12) = 21 caracteres', () => {
  assert.equal(WINDOW_MAX_CHARACTERS, 21)
})

test('máximo de ventanas = floor(clip / 2.5)', () => {
  assert.equal(maxSequenceWindows(15), 6)
  assert.equal(maxSequenceWindows(10), 4)
  assert.equal(maxSequenceWindows(20), 6) // clampeado a 15 antes de dividir
})

test('duración determinística: ventanas × 2.5s, ya no depende del texto', () => {
  assert.equal(estimateVideoSequenceDuration(1), 2.5)
  assert.equal(estimateVideoSequenceDuration(4), 10)
  assert.equal(estimateVideoSequenceDuration(6), 15)
})

test('clampea la duración estimada a 15s aunque unitCount exceda el máximo', () => {
  assert.equal(estimateVideoSequenceDuration(10), 15)
})

test('valida cantidad de unidades contra el máximo de ventanas, no contra una suma de lectura', () => {
  const withinBudget = validateVideoSequence(['Título', 'Item 1', 'Item 2', 'CTA'], 15)
  assert.deepEqual(withinBudget.violations, [])
  assert.equal(withinBudget.unitCount, 4)
  assert.equal(withinBudget.maxWindows, 6)

  const tooManyUnits = validateVideoSequence(['1', '2', '3', '4', '5', '6', '7'], 15)
  assert.deepEqual(tooManyUnits.violations, ['too-many-units'])
})

test('aplica el tope de 21 caracteres por unidad — un ítem no puede ser un párrafo', () => {
  assert.deepEqual(validateVideoSequence(['x'.repeat(22)], 15).violations, ['unit-characters'])
  assert.deepEqual(validateVideoSequence(['x'.repeat(21)], 15).violations, [])
})

test('detecta unidades vacías y con más de 2 líneas', () => {
  assert.deepEqual(validateVideoSequence([''], 15).violations, ['unit-empty'])
  assert.deepEqual(validateVideoSequence(['a\nb\nc'], 15).violations, ['unit-lines'])
})
