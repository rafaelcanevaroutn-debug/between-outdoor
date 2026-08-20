import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatVerifiedFecha,
  RELATIVE_DATE_PATTERN,
  resolveVerifiedLugar,
} from '../lib/generators/banner-salida-fields.ts'

test('resolveVerifiedLugar prefiere destino, cae a nombre, null si ninguno', () => {
  assert.equal(resolveVerifiedLugar({ destino: 'Tilcara, Jujuy', nombre: 'Otro nombre' }), 'Tilcara, Jujuy')
  assert.equal(resolveVerifiedLugar({ destino: '  ', nombre: 'Travesía Tilcara' }), 'Travesía Tilcara')
  assert.equal(resolveVerifiedLugar({ destino: '', nombre: '' }), null)
})

test('formatVerifiedFecha formatea fecha_inicio determinísticamente, sin frase relativa', () => {
  const formatted = formatVerifiedFecha('2026-12-15')
  assert.equal(formatted, '15 de diciembre')
  assert.equal(RELATIVE_DATE_PATTERN.test(formatted), false)
})

test('formatVerifiedFecha devuelve null ante una fecha inválida, no inventa una', () => {
  assert.equal(formatVerifiedFecha('no-es-una-fecha'), null)
})
