import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../scripts/run-banner-production-e2e.ts', import.meta.url), 'utf8')

test('la prueba productiva queda en dry-run salvo --execute explícito', () => {
  assert.match(source, /process\.argv\.includes\('--execute'\)/u)
  const guard = source.indexOf('if (!execute)')
  assert.ok(guard > 0)
  assert.ok(source.indexOf("from('contenido_generado')", guard) > guard)
  assert.ok(source.indexOf('dispatchBannerRender', source.indexOf("from('contenido_generado')", guard)) > guard)
})

test('prepara el caso real completo sin OpenAI', () => {
  for (const dependency of ['buildBannerMolde3', 'isFolderWithinRoot', 'selectApprovedCreativeTemplate', 'buildBannerBrand', 'mapBannerContentToInsertRow', 'dispatchBannerRender']) {
    assert.match(source, new RegExp(dependency), dependency)
  }
  assert.doesNotMatch(source, /OPENAI_API_KEY|generateCreative|openai-designer/iu)
  assert.match(source, /render_status !== 'rendered'/u)
  assert.match(source, /render_folder_id/u)
})
