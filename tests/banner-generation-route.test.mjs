import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const route = fs.readFileSync(new URL('../app/api/generate/banner/route.ts', import.meta.url), 'utf8')

test('la generación autentica, valida ownership de salida y de foto privada', () => {
  assert.match(route, /auth\.getUser/u)
  assert.match(route, /salida\.user_id !== user\.id/u)
  assert.match(route, /isFolderWithinRoot\(backgroundDriveFileId, brandIdentity\.fotos_folder_id\)/u)
})

test('usa caps reales del renderer y solo la dupla tipográfica implementada', () => {
  assert.match(route, /BANNER_MOLDE_1_CAPS\.copy/u)
  assert.match(route, /BANNER_MOLDE_1_CAPS\.lugar/u)
  assert.match(route, /BANNER_MOLDE_1_CAPS\.fecha/u)
  assert.match(route, /BANNER_MOLDE_1_CAPS\.item/u)
  assert.match(route, /\['Inter', 'Playfair Display'\]/u)
})

test('persiste pending_review y no dispara render antes de aprobación', () => {
  assert.match(route, /mapBannerContentToInsertRow/u)
  for (const mold of ['runBannerMolde1', 'runBannerMolde2', 'buildBannerMolde3', 'runBannerMolde4', 'buildBannerMolde5', 'runBannerMolde6']) assert.match(route, new RegExp(mold))
  assert.doesNotMatch(route, /dispatchBannerRender/u)
})
