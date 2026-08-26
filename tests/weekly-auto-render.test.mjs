import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const weeklyBatch = fs.readFileSync(new URL('../lib/orchestrators/weekly-batch.ts', import.meta.url), 'utf8')
const calendarCell = fs.readFileSync(new URL('../components/calendario/SemanaGeneradaPieceCell.tsx', import.meta.url), 'utf8')
const socialPreview = fs.readFileSync(new URL('../components/contenido/SocialPostPreviewModal.tsx', import.meta.url), 'utf8')

test('el batch semanal prepara y despacha banners y videos sin aprobación manual', () => {
  assert.match(weeklyBatch, /prepareAutomaticBannerRender/u)
  assert.match(weeklyBatch, /prepareAutomaticVideoRender/u)
  assert.match(weeklyBatch, /dispatchBannerRender/u)
  assert.match(weeklyBatch, /dispatchFamiliesVideoRender/u)
  assert.match(weeklyBatch, /Promise\.allSettled\(automaticDispatches\)/u)
})

test('banner y video comparten una vista previa con estructura social', () => {
  assert.match(calendarCell, /SocialPostPreviewModal/u)
  assert.match(socialPreview, /api\/generate\/banner\/\$\{item\.id\}\/imagen/u)
  assert.match(socialPreview, /api\/generate\/video\/\$\{item\.id\}\/media/u)
  assert.match(socialPreview, /Heart/u)
  assert.match(socialPreview, /MessageCircle/u)
  assert.match(socialPreview, /Bookmark/u)
})
