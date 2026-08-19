import test from 'node:test'
import assert from 'node:assert/strict'

import {buildApprovedLibraryPreviewPayload, buildMolde1ApprovedLibraryPreviewPayload, buildMolde1LibraryProductionDraft, fetchTrustedLogoDataUrl, isCreativeLibraryProductionEnabled, renderMolde1ApprovedLibraryPreview, selectApprovedCreativeTemplate} from '../lib/creative-lab/production-library.ts'

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

test('el preview aprobado envía sólo UUID+payload neutral, nunca HTML', async () => {
  const template = {id: '92304926-e8ed-46e5-a0c7-cb2d37192ccd', contract: {template_id: 'banner_molde_1', version: '1.0.0', piece_type: 'banner', mold_type: 1, dimensions: {width: 1080, height: 1350}, variant: 'adaptive', slots, branding_tokens: tokens}, html}
  const currentPayload = {templateId: 'banner/molde-1@1', requestId: 'piece-1', content: {contentKind: 'banner/molde-1', lugar: 'EL CHALTÉN', fecha: '6 AL 10 DE DICIEMBRE', copy: 'Seguí el viento hasta las agujas de granito.', items: ['Laguna de los Tres', 'Pliegue Tumbado'], typographyId: 'Inter'}, backgroundDriveFileId: 'photo-1', brand: {clientId: 'caminantes', clientDriveFolderId: 'root-1', name: 'Caminantes', logoUrl: 'https://project.supabase.co/storage/v1/object/public/logos/user/logo.webp', accentColor: '#F4C95D'}}
  const payload = buildMolde1ApprovedLibraryPreviewPayload({template, currentPayload})
  assert.equal(payload.templateRecordId, template.id)
  assert.equal('html' in payload, false)
  let sent
  const png = await renderMolde1ApprovedLibraryPreview({endpoint: 'https://renderer.example/api/banner/library-preview', token: 'secret', payload, fetchImpl: async (_url, init) => { sent = JSON.parse(init.body); return new Response(new Uint8Array([137,80,78,71,13,10,26,10]), {status: 200, headers: {'content-type': 'image/png'}}) }})
  assert.equal(sent.templateRecordId, template.id)
  assert.equal('html' in sent, false)
  assert.equal(png.length, 8)
})

test('el preview genérico conserva el contenido neutral de Moldes 2 y 6', () => {
  const brand = {clientId: 'caminantes', clientDriveFolderId: 'root-1', name: 'Caminantes', logoUrl: 'https://project.supabase.co/storage/v1/object/public/logos/user/logo.webp', accentColor: '#F4C95D'}
  const template2 = {id: '0e95676a-370c-4622-8e4b-88c2a02eb053', contract: {template_id: 'banner_molde_2', version: '1.0.0', piece_type: 'banner', mold_type: 2, dimensions: {width: 1080, height: 1350}, variant: 'adaptive', slots: {}, branding_tokens: tokens}, html}
  const template6 = {...template2, id: 'e486f653-c257-468a-9985-e239dc61bac2', contract: {...template2.contract, mold_type: 6}}
  const payload2 = buildApprovedLibraryPreviewPayload({template: template2, currentPayload: {templateId: 'banner/molde-2@1', requestId: 'piece-2', content: {contentKind: 'banner/molde-2', lugar: 'EL CHALTÉN', fecha: '6 AL 10 DE DICIEMBRE', ficha: [{etiqueta: 'duración', valor: '5 días'}, {etiqueta: 'distancia', valor: '42 km'}, {etiqueta: 'dificultad', valor: 'Media'}], cta: 'GUARDÁ ESTA SALIDA', typographyId: 'Inter'}, backgroundDriveFileId: 'photo-2', brand}})
  const payload6 = buildApprovedLibraryPreviewPayload({template: template6, currentPayload: {templateId: 'banner/molde-6@1', requestId: 'piece-6', content: {contentKind: 'banner/molde-6', mensaje: 'Hay caminos que se vuelven inolvidables cuando los compartimos.', convocatoria: 'Sumate a caminar en comunidad.', typographyId: 'Inter'}, backgroundDriveFileId: 'photo-6', brand}})
  assert.equal(payload2.content.contentKind, 'banner/molde-2')
  assert.equal(payload6.content.contentKind, 'banner/molde-6')
  assert.equal('html' in payload2, false)
  assert.throws(() => buildApprovedLibraryPreviewPayload({template: template2, currentPayload: {...payload6, templateRecordId: undefined}}), /no corresponde/u)
})
