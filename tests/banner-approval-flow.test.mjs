import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const approval = fs.readFileSync(new URL('../app/api/generate/banner/[id]/aprobar/route.ts', import.meta.url), 'utf8')
const image = fs.readFileSync(new URL('../app/api/generate/banner/[id]/imagen/route.ts', import.meta.url), 'utf8')

test('aprobación autentica, valida ownership, reconstruye cualquier molde y despacha después del CAS', () => {
  assert.match(approval, /auth\.getUser/u)
  assert.match(approval, /row\.user_id !== user\.id/u)
  assert.match(approval, /rebuildBannerContentFromEditableRow/u)
  assert.match(approval, /selectApprovedCreativeTemplate/u)
  assert.match(approval, /buildApprovedLibraryPreviewPayload/u)
  assert.match(approval, /validateBannerMolde4Copy/u)
  assert.match(approval, /source_salida_ids/u)
  assert.match(approval, /generar-banner-library/u)
  const dispatching = approval.indexOf("render_status: 'dispatching'")
  const afterDispatch = approval.indexOf('after(() => dispatchBannerRender')
  assert.ok(dispatching >= 0 && afterDispatch > dispatching)
})

test('aprobación es idempotente para rendered, dispatching y rendering', () => {
  assert.match(approval, /row\.render_status === 'rendered'/u)
  assert.match(approval, /ACTIVE_STATUSES/u)
  assert.match(approval, /idempotent: true/u)
})

test('imagen es un proxy privado y no redirige a una URL externa', () => {
  assert.match(image, /auth\.getUser/u)
  assert.match(image, /row\.user_id !== user\.id/u)
  assert.match(image, /banner_render_download_path/u)
  assert.match(image, /Authorization: `Bearer/u)
  assert.doesNotMatch(image, /redirect\(/u)
})
