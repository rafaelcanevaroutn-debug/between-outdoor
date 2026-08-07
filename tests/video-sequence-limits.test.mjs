import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateVideoSequenceDuration,
  maxVideoSequenceCharacters,
  resolveVideoSequenceDuration,
  validateVideoSequence,
} from '../lib/generators/video-sequence-limits.ts'

test('usa 12 segundos como default temporal de Familia 2', () => {
  assert.equal(resolveVideoSequenceDuration(), 12)
  assert.equal(resolveVideoSequenceDuration(0), 12)
  assert.equal(resolveVideoSequenceDuration(20), 20)
})

test('descuenta 0.75 segundos por cada unidad del presupuesto total', () => {
  assert.equal(maxVideoSequenceCharacters(12, 4), 108)
  assert.equal(maxVideoSequenceCharacters(5, 2), 42)
})

test('estima duración sumando lectura y reconocimiento por unidad', () => {
  assert.equal(estimateVideoSequenceDuration(['123456789012', '123456789012']), 3.5)
  assert.equal(estimateVideoSequenceDuration(['A', 'B', 'CTA'], 1), 4.3)
})

test('aplica tope de 90 caracteres por unidad y presupuesto total', () => {
  assert.deepEqual(validateVideoSequence(['x'.repeat(91)], 20).violations, ['unit-characters'])
  assert.deepEqual(validateVideoSequence(['x'.repeat(60), 'y'.repeat(60)], 5).violations, ['duration'])
  assert.deepEqual(validateVideoSequence(['Título', 'Item', 'CTA'], 12).violations, [])
})
