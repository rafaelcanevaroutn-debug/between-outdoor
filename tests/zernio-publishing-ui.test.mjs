import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const controls = fs.readFileSync(new URL('../components/contenido/SocialPublishingControls.tsx', import.meta.url), 'utf8')
const socialPreview = fs.readFileSync(new URL('../components/contenido/SocialPostPreviewModal.tsx', import.meta.url), 'utf8')
const carouselPreview = fs.readFileSync(new URL('../components/carrusel-preview/CarruselDrilldownModal.tsx', import.meta.url), 'utf8')
const middleware = fs.readFileSync(new URL('../lib/supabase/middleware.ts', import.meta.url), 'utf8')
const publicationRoute = fs.readFileSync(new URL('../app/api/zernio/publications/route.ts', import.meta.url), 'utf8')

test('el preview permite programar cualquier formato en una cuenta conectada', () => {
  assert.match(socialPreview, /SocialPublishingControls/u)
  assert.match(carouselPreview, /SocialPublishingControls/u)
  assert.match(controls, /api\/zernio\/profiles/u)
  assert.match(controls, /api\/zernio\/publications/u)
  assert.match(controls, /Confirmar y programar/u)
  assert.match(controls, /accountIds/u)
})

test('la multimedia firmada queda pública y la fecha se envía como ISO absoluto', () => {
  assert.match(middleware, /api\/social\/media\//u)
  assert.match(publicationRoute, /scheduledDate\.toISOString\(\)/u)
  assert.match(publicationRoute, /contenido_id,scheduled_at,status/u)
})
