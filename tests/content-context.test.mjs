import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeContentContextTags,
  resolveContentContextTags,
  resolveContentMusicKeys,
} from '../lib/content-context/registry.ts'
import { buildSalidaContentContextPrompt } from '../lib/content-context/prompt.ts'

test('combina dimensiones sin depender de un cliente', () => {
  const tags = normalizeContentContextTags([
    'entorno_yungas_selva',
    'clima_calido_humedo',
    'actividad_trekking',
    'experiencia_comunidad',
    'dato_inventado',
  ])
  assert.deepEqual(tags, [
    'entorno_yungas_selva',
    'clima_calido_humedo',
    'actividad_trekking',
    'experiencia_comunidad',
  ])
  const prompt = buildSalidaContentContextPrompt({ context_tags: tags, zona_geografica: null })
  assert.match(prompt, /Yungas y selva/)
  assert.match(prompt, /Cálido y húmedo/)
  assert.match(prompt, /Trekking/)
  assert.match(prompt, /Comunidad/)
  assert.doesNotMatch(prompt, /Renzo|Franco|Caminantes/i)
})

test('Caribe controla copy y música con la misma etiqueta', () => {
  const tags = ['entorno_caribe_playa', 'clima_calido_humedo', 'experiencia_fiesta']
  const prompt = buildSalidaContentContextPrompt({ context_tags: tags, zona_geografica: null })
  assert.match(prompt, /mar, arena, agua cálida/)
  assert.match(prompt, /música, baile, salir/)
  assert.match(prompt, /Evitá: cumbre, refugio, nieve/)
  assert.deepEqual(resolveContentMusicKeys({ context_tags: tags }), ['caribe_playa', 'fiesta'])
})

test('mantiene compatibilidad con la zona geográfica anterior', () => {
  assert.deepEqual(
    resolveContentContextTags({ context_tags: [], zona_geografica: 'Naturaleza / Selva' }),
    ['entorno_yungas_selva', 'clima_calido_humedo'],
  )
})
