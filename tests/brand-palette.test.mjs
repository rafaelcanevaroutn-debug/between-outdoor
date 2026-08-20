import test from 'node:test'
import assert from 'node:assert/strict'

import {
  brandColorContrast,
  buildBrandPaletteSuggestions,
  extractDominantLogoColors,
} from '../lib/brand-palette.ts'

test('extrae colores visibles del logo sin convertir transparencia o blanco en la marca', () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255,
    255, 255, 255, 255,
    220, 24, 48, 255,
    220, 24, 48, 255,
    20, 72, 180, 255,
    20, 72, 180, 255,
    0, 0, 0, 0,
  ])
  const colors = extractDominantLogoColors(pixels)
  assert.equal(colors.length, 2)
  assert.equal(colors.includes('#FFFFFF'), false)
  assert.notEqual(colors[0], colors[1])
})

test('genera tres propuestas determinísticas con contraste de texto accesible', () => {
  const first = buildBrandPaletteSuggestions(['#3E5C48', '#D4A84F', '#76D4D7'])
  const second = buildBrandPaletteSuggestions(['#3E5C48', '#D4A84F', '#76D4D7'])
  assert.deepEqual(first, second)
  assert.deepEqual(first.map(item => item.id), ['balanced', 'dark', 'bold'])
  for (const suggestion of first) {
    assert.ok(suggestion.textContrast >= 4.5)
    assert.ok(brandColorContrast(suggestion.colors.color_texto, suggestion.colors.color_fondo) >= 4.5)
    assert.ok(brandColorContrast(suggestion.colors.color_primario, suggestion.colors.color_fondo) >= 3)
    assert.ok(brandColorContrast(suggestion.colors.color_secundario, suggestion.colors.color_fondo) >= 3)
    assert.ok(brandColorContrast(suggestion.colors.color_acento, suggestion.colors.color_fondo) >= 3)
    for (const color of Object.values(suggestion.colors)) assert.match(color, /^#[0-9A-F]{6}$/u)
  }
})

test('un logo monocromático recibe una paleta segura sin depender de IA', () => {
  const suggestions = buildBrandPaletteSuggestions(['#333333'])
  assert.equal(suggestions.length, 3)
  assert.equal(suggestions[0].id, 'balanced')
  assert.ok(suggestions.every(item => item.textContrast >= 4.5))
})
