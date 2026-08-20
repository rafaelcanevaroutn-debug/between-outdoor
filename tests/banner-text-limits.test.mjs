import test from 'node:test'
import assert from 'node:assert/strict'
import {
  truncateBannerFieldAtWord,
  validateBannerField,
  validateBannerFieldList,
} from '../lib/generators/banner-text-limits.ts'

test('valida por ancho/línea, sin ninguna fórmula de tiempo de lectura de por medio', () => {
  assert.deepEqual(validateBannerField('Tilcara', 20), {
    maxCharacters: 20,
    characterCount: 7,
    violations: [],
  })
  assert.deepEqual(validateBannerField('x'.repeat(21), 20).violations, ['characters'])
  assert.deepEqual(validateBannerField('   ', 20).violations, ['empty'])
})

test('no expone ningún default de maxCharacters — cada caller debe pasarlo explícito', () => {
  assert.equal(validateBannerField.length, 2)
})

test('valida listas de ítems, cada uno contra el mismo cap', () => {
  const results = validateBannerFieldList(['Llevá agua', 'x'.repeat(40)], 20)
  assert.equal(results.length, 2)
  assert.deepEqual(results[0].violations, [])
  assert.deepEqual(results[1].violations, ['characters'])
})

test('trunca en borde de palabra y limpia conectores colgando', () => {
  assert.equal(truncateBannerFieldAtWord('Guardalo para tu próxima salida', 20), 'Guardalo para tu')
  assert.equal(truncateBannerFieldAtWord('Corto', 20), 'Corto')
  assert.equal(truncateBannerFieldAtWord('Llevá agua y', 11), 'Llevá agua')
})
