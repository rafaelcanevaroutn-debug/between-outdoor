import test from 'node:test'
import assert from 'node:assert/strict'

import {buildCreativeTemplateInsert, createCreativeCandidatePersister} from '../lib/creative-lab/persistence.ts'

const contract = {
  template_id: 'banner_molde_1',
  version: '1.0.0',
  piece_type: 'banner',
  mold_type: 1,
  dimensions: {width: 1080, height: 1350},
  variant: 'dark',
  slots: {titulo: {type: 'text', required: true, max_chars: 40}},
  branding_tokens: ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body'],
}

const candidate = {
  name: 'Editorial Ágil',
  rationale: 'Jerarquía clara',
  html: '<main class="slide"></main>',
  critique: {verdict: 'pass', issues: []},
  previewPng: new Uint8Array([1, 2, 3]),
}

test('convierte un candidato en un registro experimental trazable', () => {
  const row = buildCreativeTemplateInsert(candidate, {contract, sourceModel: 'gpt-test', createdBy: 'user-1'})
  assert.equal(row.template_id, 'banner_molde_1-editorial-agil')
  assert.equal(row.status, 'experimental')
  assert.equal(row.width, 1080)
  assert.equal(row.created_by, 'user-1')
  assert.deepEqual(JSON.parse(row.critique_summary), {rationale: 'Jerarquía clara', verdict: 'pass', issues: []})
})

test('persiste el PNG mediante un backend inyectable antes de insertar metadata', async () => {
  let inserted
  const fakeClient = {
    from: () => ({
      insert: row => {
        inserted = row
        return {select: () => ({single: async () => ({data: {id: 'template-1'}, error: null})})}
      },
    }),
  }
  const persist = createCreativeCandidatePersister({
    contract,
    sourceModel: 'gpt-test',
    client: fakeClient,
    storePreview: async ({templateId, png}) => {
      assert.equal(templateId, 'banner_molde_1-editorial-agil-01')
      assert.deepEqual([...png], [1, 2, 3])
      return 'drive-file-1'
    },
  })

  assert.deepEqual(await persist(candidate), {id: 'template-1'})
  assert.equal(inserted.preview_drive_file_id, 'drive-file-1')
  assert.equal(inserted.template_id, 'banner_molde_1-editorial-agil-01')
})

test('desambigua nombres repetidos dentro de una misma tanda', async () => {
  const ids = []
  const fakeClient = {
    from: () => ({insert: row => ({select: () => ({single: async () => { ids.push(row.template_id); return {data: {id: row.template_id}, error: null} }})})}),
  }
  const persist = createCreativeCandidatePersister({contract, sourceModel: 'gpt-test', client: fakeClient, storePreview: async () => 'preview'})
  await persist(candidate)
  await persist(candidate)
  assert.deepEqual(ids, ['banner_molde_1-editorial-agil-01', 'banner_molde_1-editorial-agil-02'])
})

test('limpia el preview externo si falla la inserción', async () => {
  let removed = null
  const fakeClient = {from: () => ({insert: () => ({select: () => ({single: async () => ({data: null, error: {message: 'duplicado'}})})})})}
  const persist = createCreativeCandidatePersister({
    contract, sourceModel: 'gpt-test', client: fakeClient,
    storePreview: async () => 'preview-externo',
    removePreview: async id => { removed = id },
  })
  await assert.rejects(() => persist(candidate), /duplicado/u)
  assert.equal(removed, 'preview-externo')
})
