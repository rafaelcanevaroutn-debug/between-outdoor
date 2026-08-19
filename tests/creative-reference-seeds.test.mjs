import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CREATIVE_VISUAL_SEEDS,
  formatCreativeVisualSeedsForPrompt,
  selectCreativeVisualSeeds,
} from '../lib/creative-lab/reference-seeds.ts'

test('cataloga las seis referencias recuperadas sin convertirlas en templates', () => {
  assert.equal(CREATIVE_VISUAL_SEEDS.length, 6)
  assert.equal(new Set(CREATIVE_VISUAL_SEEDS.map(seed => seed.id)).size, 6)
  for (const seed of CREATIVE_VISUAL_SEEDS) {
    assert.match(seed.legacySource.htmlFile, /\.html$/u)
    assert.match(seed.legacySource.previewFile, /\.png$/u)
    assert.ok(seed.reusablePrinciples.length >= 3)
    assert.ok(seed.antiPatterns.length >= 2)
  }
})

test('selecciona referencias compatibles con el molde sin mutar el catálogo', () => {
  const moldOne = selectCreativeVisualSeeds({moldType: 1})
  assert.deepEqual(moldOne.map(seed => seed.id), ['chalten-cinematic-rail', 'cancun-premium-resort'])
  assert.equal(CREATIVE_VISUAL_SEEDS.length, 6)
})

test('permite selección explícita y limita la cantidad enviada al prompt', () => {
  const selected = selectCreativeVisualSeeds({
    ids: ['cancun-premium-resort', 'chalten-editorial-clear'],
    limit: 1,
  })
  // El orden curado del catálogo es estable aunque ids llegue en otro orden.
  assert.equal(selected[0].id, 'chalten-editorial-clear')
  assert.throws(() => selectCreativeVisualSeeds({limit: 7}), /limit debe estar entre 1 y 6/u)
})

test('serializa principios visuales para approvedExamples sin rutas locales ni copy duro', () => {
  const prompts = formatCreativeVisualSeedsForPrompt(selectCreativeVisualSeeds({moldType: 1}))
  assert.equal(prompts.length, 2)
  assert.match(prompts[0], /No copies la pieza literalmente/u)
  assert.doesNotMatch(prompts.join('\n'), /\/Users\/mac/u)
  assert.doesNotMatch(prompts.join('\n'), /27 DIC|150\.000|CANCÚN/u)
})
