import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  CAROUSEL_FORMATS,
  CONTENT_THEMES,
  NARRATIVE_STRUCTURES,
  supportsTheme,
  VIDEO_FORMATS,
} from '../lib/content-engine/taxonomy.ts'
import {
  resolveCarouselKnowledge,
  resolveVideoKnowledge,
} from '../lib/content-engine/knowledge-registry.ts'
import { contextToPromptBlock, loadCarruselContext } from '../lib/knowledge/loader.ts'

test('conserva el inventario completo de carruseles, temas editoriales y videos', () => {
  assert.deepEqual(CAROUSEL_FORMATS, [
    'editorial', 'organico', 'itinerario', 'ascenso', 'calendario', 'lugar', 'conversacion',
  ])
  assert.equal(CONTENT_THEMES.length, 11)
  assert.equal(VIDEO_FORMATS.length, 13)
  assert.equal(NARRATIVE_STRUCTURES.length, 7)
})

test('conversación sigue disponible en carrusel y video', () => {
  assert.ok(CAROUSEL_FORMATS.includes('conversacion'))
  assert.ok(VIDEO_FORMATS.includes('3d'))
  assert.equal(supportsTheme('carousel', 'conversacion', 'dudas_objeciones'), true)
  assert.equal(supportsTheme('video', '3d', 'dudas_objeciones'), true)
})

test('el registry carga solamente las capas compatibles con la pieza elegida', () => {
  const conversation = resolveCarouselKnowledge({
    niche: 'trekking',
    theme: 'dudas_objeciones',
    format: 'conversacion',
  })
  const sources = conversation.map(item => item.source)
  assert.ok(sources.includes('lib/knowledge/formatos/carrusel_conversacion.md'))
  assert.ok(sources.includes('lib/knowledge/temas/trekking/objeciones.md'))
  assert.ok(!sources.includes('lib/knowledge/formatos/carrusel_itinerario.md'))
  assert.ok(!sources.some(source => source.includes('/video/')))

  const video = resolveVideoKnowledge({ niche: 'trekking', format: '3d' })
  assert.ok(video.some(item => item.source === 'lib/knowledge/formatos/video/video_conversacional.md'))
  assert.ok(!video.some(item => item.source.includes('carrusel_')))
})

test('el contexto genérico no presupone oficina, Excel ni reuniones', () => {
  const genericSources = [
    'lib/knowledge/global/lineamiento.md',
    'lib/knowledge/nichos/trekking/patrones.md',
    'lib/knowledge/temas/trekking/bienestar.md',
    'lib/knowledge/temas/trekking/motivacion.md',
  ]
  for (const source of genericSources) {
    const content = fs.readFileSync(source, 'utf8')
    assert.doesNotMatch(content, /Buyer persona:\s*profesional|profesional 27|est[rñ]es laboral alto/i)
    assert.match(content, /onboarding|perfil del cliente/i)
  }
})

test('Editorial no repite el contexto global completo durante el desarrollo', () => {
  const context = loadCarruselContext({
    niche: 'trekking',
    tema: 'bienestar',
    formatoCarrusel: 'editorial',
  })
  const full = contextToPromptBlock(context, true)
  const continuation = contextToPromptBlock(context, true, 'continuation')
  assert.match(full, /=== LINEAMIENTO ===/)
  assert.match(full, /=== PATRONES DE COMUNICACIÓN ===/)
  assert.doesNotMatch(continuation, /=== LINEAMIENTO ===/)
  assert.doesNotMatch(continuation, /=== PATRONES DE COMUNICACIÓN ===/)
  assert.match(continuation, /=== GUÍA DE FORMATO ===/)
  assert.match(continuation, /=== GUÍA DE TEMA ===/)
  assert.match(continuation, /=== PROHIBICIONES ===/)
  assert.ok(continuation.length < full.length)
})
