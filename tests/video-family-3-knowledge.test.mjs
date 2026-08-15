import test from 'node:test'
import assert from 'node:assert/strict'
import {
  loadVideoContext,
  videoContextToPromptBlock,
  VIDEO_FAMILY_3_FILE_MAP,
  VIDEO_KNOWLEDGE_FILE_MAP,
} from '../lib/knowledge/loader.ts'

const EXPECTED = {
  '3a': ['formatos/video/video_reflexivo.md', 'FAMILIA 3A'],
  '3b': ['formatos/video/video_pov.md', 'FAMILIA 3B'],
  '3c': ['formatos/video/video_meme.md', 'FAMILIA 3C'],
  '3d': ['formatos/video/video_conversacional.md', 'FAMILIA 3D'],
  '3e': ['formatos/video/video_lugar.md', 'FAMILIA 3E'],
}

test('mapea cada subfamilia a una única guía específica', () => {
  for (const [subfamilia, [file]] of Object.entries(EXPECTED)) {
    assert.equal(VIDEO_FAMILY_3_FILE_MAP[subfamilia], file)
  }
})

test('el mapa general incorpora Familia 2 y Familia 4 sin alterar Familia 3', () => {
  assert.equal(VIDEO_KNOWLEDGE_FILE_MAP['2a'], 'formatos/video/video_listicle.md')
  assert.equal(VIDEO_KNOWLEDGE_FILE_MAP['2b'], 'formatos/video/video_storytelling.md')
  assert.equal(VIDEO_KNOWLEDGE_FILE_MAP['4'], 'formatos/video/video_comercial.md')
  assert.equal(VIDEO_KNOWLEDGE_FILE_MAP['5'], 'formatos/video/video_ficha.md')
  for (const subfamilia of Object.keys(VIDEO_FAMILY_3_FILE_MAP)) {
    assert.equal(VIDEO_KNOWLEDGE_FILE_MAP[subfamilia], VIDEO_FAMILY_3_FILE_MAP[subfamilia])
  }
})

test('carga las seis capas en el orden acordado', () => {
  for (const [subfamilia, [, heading]] of Object.entries(EXPECTED)) {
    const context = loadVideoContext({
      niche: 'trekking',
      subfamilia,
    })
    assert.match(context.formatoText, new RegExp(heading))

    const block = videoContextToPromptBlock(context)
    const headings = [
      '=== LINEAMIENTO ===',
      '=== MUNDO DEL NICHO ===',
      '=== PATRONES DE COMUNICACIÓN ===',
      '=== VOZ Y TONO ===',
      '=== GUÍA DE FORMATO ===',
      '=== PROHIBICIONES ===',
    ]
    let previous = -1
    for (const section of headings) {
      const index = block.indexOf(section)
      assert.ok(index > previous, `${subfamilia}: ${section}`)
      previous = index
    }
  }
})

test('prioriza voz específica y cae a default', () => {
  const fallback = loadVideoContext({ niche: 'trekking', subfamilia: '3a' })
  const missingSpecific = loadVideoContext({
    niche: 'trekking',
    subfamilia: '3a',
    vozSlug: 'no-existe',
  })
  assert.equal(missingSpecific.vozText, fallback.vozText)
})
