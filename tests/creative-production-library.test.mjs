import test from 'node:test'
import assert from 'node:assert/strict'

import {buildMolde1LibraryProductionDraft, fetchTrustedLogoDataUrl, isCreativeLibraryProductionEnabled, selectApprovedCreativeTemplate} from '../lib/creative-lab/production-library.ts'

const tokens = ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body']
const slots = {marca: {type: 'text', required: true, max_chars: 32}, logo: {type: 'image_url', required: true}, bg_image: {type: 'image_url', required: true}, lugar: {type: 'text', required: true, max_chars: 32}, fecha: {type: 'text', required: true, max_chars: 28}, copy: {type: 'text', required: true, max_chars: 96}, item_1: {type: 'text', required: true, max_chars: 36}, item_2: {type: 'text', required: true, max_chars: 36}, item_3: {type: 'text', required: false, max_chars: 36}}
const html = `<style data-template-css>.slide{width:1080px;height:1350px;overflow:hidden;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1{font-family:var(--font-title)}</style><main class="slide"><img data-slot="bg_image"><img data-slot="logo"><b data-slot="marca"></b><h1 data-slot="lugar"></h1><p data-slot="fecha"></p><p data-slot="copy"></p><i data-slot="item_1"></i><i data-slot="item_2"></i><i data-slot="item_3"></i></main>`

test('el consumo productivo queda apagado por defecto', () => {
  assert.equal(isCreativeLibraryProductionEnabled({}), false)
  assert.equal(isCreativeLibraryProductionEnabled({CREATIVE_TEMPLATE_LIBRARY_PRODUCTION: 'true'}), true)
})

test('selecciona solo el molde aprobado más reciente y revalida su HTML', async () => {
  const row = {id: 'template-1', template_id: 'banner_molde_1', version: '1.0.0', piece_type: 'banner', mold_type: 1, width: 1080, height: 1350, variant: 'adaptive', slots_schema: slots, branding_tokens: tokens, html_template: html}
  const calls = []
  const query = {select(){calls.push('select'); return this}, eq(key, value){calls.push([key, value]); return this}, order(){return this}, limit(){return this}, async maybeSingle(){return {data: row, error: null}}}
  const result = await selectApprovedCreativeTemplate({client: {from: () => query}, moldType: 1})
  assert.equal(result.id, 'template-1')
  assert.deepEqual(calls.slice(1, 3), [['status', 'approved'], ['mold_type', 1]])
})

test('convierte únicamente logos del Supabase autorizado y acotados', async () => {
  const result = await fetchTrustedLogoDataUrl({
    logoUrl: 'https://project.supabase.co/storage/v1/object/public/logos/user/logo.webp?t=1',
    supabaseUrl: 'https://project.supabase.co',
    fetchImpl: async () => new Response(new Uint8Array([1,2,3,4,5,6,7,8]), {headers: {'content-type': 'image/webp'}}),
  })
  assert.match(result, /^data:image\/webp;base64,/u)
  await assert.rejects(() => fetchTrustedLogoDataUrl({logoUrl: 'https://evil.test/logo.png', supabaseUrl: 'https://project.supabase.co'}), /bucket autorizado/u)
})

test('adapta el payload actual sin regenerar copy y deja el despacho bloqueado', () => {
  const template = {id: 'template-1', contract: {template_id: 'banner_molde_1', version: '1.0.0', piece_type: 'banner', mold_type: 1, dimensions: {width: 1080, height: 1350}, variant: 'adaptive', slots, branding_tokens: tokens}, html}
  const currentPayload = {templateId: 'banner/molde-1@1', requestId: 'piece-1', content: {contentKind: 'banner/molde-1', lugar: 'EL CHALTÉN', fecha: '15 AL 19 DE NOVIEMBRE', copy: 'Una salida para volver a mirar la montaña.', items: ['Fitz Roy', 'Grupo acompañado'], typographyId: 'Inter'}, backgroundDriveFileId: 'photo-1', brand: {clientId: 'caminantes', clientDriveFolderId: 'root-1', name: 'Caminantes', accentColor: '#F4C95D'}}
  const draft = buildMolde1LibraryProductionDraft({template, currentPayload, logoDataUrl: 'data:image/webp;base64,YWJj'})
  assert.equal(draft.mockData.copy, currentPayload.content.copy)
  assert.equal(draft.blockedBy, 'renderer_library_contract_pending')
})
