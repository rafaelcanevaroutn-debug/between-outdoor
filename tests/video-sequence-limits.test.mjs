import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateVideoSequenceDuration,
  FIELD_MAX_CHARACTERS,
  MAX_BULLETS,
  resolveVideoSequenceDuration,
  TARGET_BULLETS,
  validateSequenceField,
  validateVideoSequence,
  WINDOW_DURATION_SECONDS,
  WINDOW_MAX_CHARACTERS,
} from '../lib/generators/video-sequence-limits.ts'

test('usa 15 segundos por defecto y clampea a 15s', () => {
  assert.equal(resolveVideoSequenceDuration(), 15)
  assert.equal(resolveVideoSequenceDuration(0), 15)
  assert.equal(resolveVideoSequenceDuration(20), 15)
})

test('cada bullet dura 2.5s fijos — modelo cerrado por Mati', () => {
  assert.equal(WINDOW_DURATION_SECONDS, 2.5)
})

test('tope de texto por bullet subido a 30 (ancho permite 60-70, pero el límite real es tiempo de lectura)', () => {
  assert.equal(WINDOW_MAX_CHARACTERS, 30)
})

test('título/cta (o apertura/cierre) comparten el mismo tope de 30, sin ventana propia', () => {
  assert.equal(FIELD_MAX_CHARACTERS, 30)
})

test('objetivo 4 bullets, tope duro 5', () => {
  assert.equal(TARGET_BULLETS, 4)
  assert.equal(MAX_BULLETS, 5)
})

test('la duración depende solo de la cantidad de bullets — título/cta no suman', () => {
  assert.equal(estimateVideoSequenceDuration(1), 2.5)
  assert.equal(estimateVideoSequenceDuration(4), 10)
  assert.equal(estimateVideoSequenceDuration(5), 12.5)
})

test('clampea la duración estimada al techo del clip', () => {
  assert.equal(estimateVideoSequenceDuration(10, 15), 15)
  assert.equal(estimateVideoSequenceDuration(5, 10), 10)
})

test('valida cantidad de bullets contra el tope duro de 5, no contra una fórmula de ventanas totales', () => {
  const withinBudget = validateVideoSequence(['Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4'])
  assert.deepEqual(withinBudget.violations, [])
  assert.equal(withinBudget.bulletCount, 4)
  assert.equal(withinBudget.maxBullets, 5)
  assert.equal(withinBudget.targetBullets, 4)

  const tooMany = validateVideoSequence(['1', '2', '3', '4', '5', '6'])
  assert.deepEqual(tooMany.violations, ['too-many-bullets'])

  const exactlyFive = validateVideoSequence(['1', '2', '3', '4', '5'])
  assert.deepEqual(exactlyFive.violations, [])
})

test('aplica el tope de 30 caracteres por bullet — sin chequeo de líneas, el wrap es automático', () => {
  assert.deepEqual(validateVideoSequence(['x'.repeat(31)]).violations, ['bullet-characters'])
  assert.deepEqual(validateVideoSequence(['x'.repeat(30)]).violations, [])
  // Topónimo largo con saltos de línea simulados no debe violar nada por líneas.
  assert.deepEqual(validateVideoSequence(['Laguna de\nlos Tres']).violations, [])
})

test('detecta bullets vacíos', () => {
  assert.deepEqual(validateVideoSequence(['']).violations, ['bullet-empty'])
})

test('valida título/cta por separado — sin ventana, mismo tope de caracteres, sin línea', () => {
  assert.deepEqual(validateSequenceField('4 senderos en Chaltén'), {
    maxCharacters: 30,
    characterCount: 21,
    violations: [],
  })
  assert.deepEqual(validateSequenceField('x'.repeat(31)).violations, ['characters'])
  assert.deepEqual(validateSequenceField('').violations, ['empty'])
  assert.deepEqual(validateSequenceField('Línea uno\nLínea dos').violations, [])
})
