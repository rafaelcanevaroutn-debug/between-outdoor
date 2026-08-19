import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../lib/generators/banner-molde-1-copy.ts', import.meta.url),
  'utf8',
)

test('genera copy de Molde 1 con Gemini de Between sin invocar Familia 4 completa', () => {
  assert.match(source, /generateWithRetryTracked/u)
  assert.match(source, /subfamilia: '4'/u)
  assert.doesNotMatch(source, /generateVideoFamilia4\s*\(/u)
})

test('el prompt usa cap por ancho y prohíbe dato duro, fecha y cupos', () => {
  assert.match(source, /Máximo \$\{p\.copyMaxCharacters\} caracteres/u)
  assert.match(source, /ancho del banner/u)
  assert.match(source, /PROHIBIDO incluir precio, moneda, seña, fecha, año, cupos/u)
  assert.doesNotMatch(source, /maxVideoCopyCharacters/u)
})

test('valida el resultado con el mismo contrato que usa el compositor', () => {
  assert.match(source, /validateBannerMolde1Copy/u)
  assert.match(source, /canalesHabilitados: p\.canalesHabilitados/u)
})
