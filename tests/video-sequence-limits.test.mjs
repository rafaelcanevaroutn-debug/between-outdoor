import test from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateVideoSequenceDuration,
  FIELD_MAX_CHARACTERS,
  MAX_BULLETS,
  resolveVideoSequenceDuration,
  TARGET_BULLETS,
  TIPS_CTA_MAX_CHARACTERS,
  TIPS_MAX_CHARACTERS,
  TIPS_TITLE_MAX_CHARACTERS,
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

test('2c (tips en prosa) tiene su propio tope de 60, confirmado por Mati — no reemplaza el de 2a', () => {
  assert.equal(TIPS_MAX_CHARACTERS, 60)
  assert.notEqual(TIPS_MAX_CHARACTERS, WINDOW_MAX_CHARACTERS)
})

test('2c tiene caps propios de título (65) y CTA (40), confirmados por Mati — distintos del FIELD_MAX_CHARACTERS compartido de 2a (30)', () => {
  assert.equal(TIPS_TITLE_MAX_CHARACTERS, 65)
  assert.equal(TIPS_CTA_MAX_CHARACTERS, 40)
  assert.notEqual(TIPS_TITLE_MAX_CHARACTERS, FIELD_MAX_CHARACTERS)
  assert.notEqual(TIPS_CTA_MAX_CHARACTERS, FIELD_MAX_CHARACTERS)
})

test('objetivo y tope de 4 bullets para conservar seis ventanas legibles en 15s', () => {
  assert.equal(TARGET_BULLETS, 4)
  assert.equal(MAX_BULLETS, 4)
})

test('la duración incluye apertura, bloques intermedios y cierre', () => {
  assert.equal(estimateVideoSequenceDuration(1), 7.5)
  assert.equal(estimateVideoSequenceDuration(4), 15)
  assert.equal(estimateVideoSequenceDuration(5), 15)
})

test('clampea la duración estimada al techo del clip', () => {
  assert.equal(estimateVideoSequenceDuration(10, 15), 15)
  assert.equal(estimateVideoSequenceDuration(5, 10), 10)
})

test('valida cantidad de bullets contra el tope duro de 4', () => {
  const withinBudget = validateVideoSequence(['Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4'])
  assert.deepEqual(withinBudget.violations, [])
  assert.equal(withinBudget.bulletCount, 4)
  assert.equal(withinBudget.maxBullets, 4)
  assert.equal(withinBudget.targetBullets, 4)

  const tooMany = validateVideoSequence(['1', '2', '3', '4', '5', '6'])
  assert.deepEqual(tooMany.violations, ['too-many-bullets'])

  const exactlyFive = validateVideoSequence(['1', '2', '3', '4', '5'])
  assert.deepEqual(exactlyFive.violations, ['too-many-bullets'])
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

test('el tope de caracteres por bullet es reemplazable — 2c pasa TIPS_MAX_CHARACTERS sin tocar el default de 2a/2b', () => {
  // Sin override: sigue siendo 30, igual que antes.
  assert.deepEqual(validateVideoSequence(['x'.repeat(31)]).violations, ['bullet-characters'])
  assert.equal(validateVideoSequence(['x'.repeat(30)]).windowMaxCharacters, 30)

  // Con override explícito (2c): un tip de 45 chars, que rebotaría contra
  // el cap de 2a, entra limpio contra TIPS_MAX_CHARACTERS.
  const tip45 = 'x'.repeat(45)
  assert.deepEqual(validateVideoSequence([tip45], undefined, TIPS_MAX_CHARACTERS).violations, [])
  assert.deepEqual(validateVideoSequence(['x'.repeat(61)], undefined, TIPS_MAX_CHARACTERS).violations, ['bullet-characters'])
  assert.equal(validateVideoSequence([tip45], undefined, TIPS_MAX_CHARACTERS).windowMaxCharacters, 60)
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

test('el tope de título/cta es reemplazable — 2c pasa TIPS_TITLE_MAX_CHARACTERS/TIPS_CTA_MAX_CHARACTERS sin tocar el default de 2a/2b', () => {
  // Sin override: sigue siendo 30, igual que antes.
  assert.deepEqual(validateSequenceField('x'.repeat(31)).violations, ['characters'])

  // Título de 2c: "5 tips para Tilcara, Jujuy" (26) entra en 30 y en 65.
  // Uno de 50 chars rebotaría contra 30 pero no contra el cap real de 2c.
  const titulo50 = 'x'.repeat(50)
  assert.deepEqual(validateSequenceField(titulo50, TIPS_TITLE_MAX_CHARACTERS).violations, [])
  assert.deepEqual(validateSequenceField('x'.repeat(66), TIPS_TITLE_MAX_CHARACTERS).violations, ['characters'])
  assert.equal(validateSequenceField(titulo50, TIPS_TITLE_MAX_CHARACTERS).maxCharacters, 65)

  // CTA de 2c: hasta 40, no 30.
  const cta35 = 'x'.repeat(35)
  assert.deepEqual(validateSequenceField(cta35, TIPS_CTA_MAX_CHARACTERS).violations, [])
  assert.deepEqual(validateSequenceField('x'.repeat(41), TIPS_CTA_MAX_CHARACTERS).violations, ['characters'])
  assert.equal(validateSequenceField(cta35, TIPS_CTA_MAX_CHARACTERS).maxCharacters, 40)
})
