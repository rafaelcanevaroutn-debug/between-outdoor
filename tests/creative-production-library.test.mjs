import test from 'node:test'
import assert from 'node:assert/strict'

import {buildApprovedLibraryPreviewPayload, selectApprovedCreativeTemplate, stableCreativeTemplateIndex} from '../lib/creative-lab/production-library.ts'

const tokens = ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body']
const slots = {marca: {type: 'text', required: true, max_chars: 32}, logo: {type: 'image_url', required: true}, bg_image: {type: 'image_url', required: true}, lugar: {type: 'text', required: true, max_chars: 32}, fecha: {type: 'text', required: true, max_chars: 28}, copy: {type: 'text', required: true, max_chars: 96}, item_1: {type: 'text', required: true, max_chars: 36}, item_2: {type: 'text', required: true, max_chars: 36}, item_3: {type: 'text', required: false, max_chars: 36}}
const html = `<style data-template-css>.slide{width:1080px;height:1350px;overflow:hidden;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1{font-family:var(--font-title)}</style><main class="slide"><img data-slot="bg_image"><img data-slot="logo"><b data-slot="marca"></b><h1 data-slot="lugar"></h1><p data-slot="fecha"></p><p data-slot="copy"></p><i data-slot="item_1"></i><i data-slot="item_2"></i><i data-slot="item_3"></i></main>`

test('selecciona solo el molde aprobado más reciente y revalida su HTML', async () => {
  const row = {id: 'template-1', template_id: 'banner_molde_1', version: '1.0.0', piece_type: 'banner', mold_type: 1, width: 1080, height: 1350, variant: 'adaptive', slots_schema: slots, branding_tokens: tokens, html_template: html}
  const calls = []
  const query = {select(){calls.push('select'); return this}, eq(key, value){calls.push([key, value]); return this}, order(){return this}, async limit(){return {data: [row], error: null}}}
  const result = await selectApprovedCreativeTemplate({client: {from: () => query}, moldType: 1})
  assert.equal(result.id, 'template-1')
  assert.deepEqual(calls.slice(1, 4), [['status', 'approved'], ['stress_test_passed', true], ['mold_type', 1]])
  assert.deepEqual(calls.slice(4), [['piece_type', 'banner'], ['width', 1080], ['height', 1350]])
})

test('story y feed quedan como bibliotecas dimensionales separadas', async () => {
  const calls = []
  const query = {select(){return this}, eq(key, value){calls.push([key, value]); return this}, order(){return this}, async limit(){return {data: [], error: null}}}
  await selectApprovedCreativeTemplate({client: {from: () => query}, moldType: 1, pieceType: 'story', dimensions: {width: 1080, height: 1920}})
  assert.deepEqual(calls.slice(-3), [['piece_type', 'story'], ['width', 1080], ['height', 1920]])
})

test('rota de forma estable entre varios moldes aptos sin IA ni azar', async () => {
  const rows = ['a', 'b', 'c'].map(id => ({id, template_id: `banner_molde_1_${id}`, version: '1.0.0', piece_type: 'banner', mold_type: 1, width: 1080, height: 1350, variant: 'adaptive', slots_schema: slots, branding_tokens: tokens, html_template: html}))
  const query = {select(){return this}, eq(){return this}, order(){return this}, async limit(){return {data: rows, error: null}}}
  const client = {from: () => query}
  const first = await selectApprovedCreativeTemplate({client, moldType: 1, selectionKey: 'pieza-42'})
  const repeated = await selectApprovedCreativeTemplate({client, moldType: 1, selectionKey: 'pieza-42'})
  assert.equal(first.id, repeated.id)
  const indexes = new Set(Array.from({length: 30}, (_, index) => stableCreativeTemplateIndex(`pieza-${index}`, rows.length)))
  assert.deepEqual([...indexes].sort(), [0, 1, 2])
  assert.throws(() => stableCreativeTemplateIndex(' ', 3), /selectionKey/u)
})

test('el payload productivo envía sólo UUID+contenido neutral, nunca HTML', () => {
  const template = {id: '92304926-e8ed-46e5-a0c7-cb2d37192ccd', contract: {template_id: 'banner_molde_1', version: '1.0.0', piece_type: 'banner', mold_type: 1, dimensions: {width: 1080, height: 1350}, variant: 'adaptive', slots, branding_tokens: tokens}, html}
  const currentPayload = {templateId: 'banner/molde-1@1', requestId: 'piece-1', content: {contentKind: 'banner/molde-1', lugar: 'EL CHALTÉN', fecha: '6 AL 10 DE DICIEMBRE', copy: 'Seguí el viento hasta las agujas de granito.', items: ['Laguna de los Tres', 'Pliegue Tumbado'], typographyId: 'Inter'}, backgroundDriveFileId: 'photo-1', brand: {clientId: 'caminantes', clientDriveFolderId: 'root-1', name: 'Caminantes', logoUrl: 'https://project.supabase.co/storage/v1/object/public/logos/user/logo.webp', accentColor: '#F4C95D'}}
  const payload = buildApprovedLibraryPreviewPayload({template, currentPayload})
  assert.equal(payload.templateRecordId, template.id)
  assert.equal('html' in payload, false)
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

test('Molde 4 no se despacha con una plantilla vieja que omite precios', () => {
  const currentPayload = {
    templateId: 'banner/molde-4@1', requestId: 'row-4', backgroundDriveFileId: 'photo-4',
    content: {
      contentKind: 'banner/molde-4', titulo: 'Próximas salidas',
      salidas: [{lugar: 'Tilcara', fecha: '6 dic', precio: 'USD 420'}, {lugar: 'Ushuaia', fecha: '8 feb', precio: 'USD 1.200'}],
      cta: 'Elegí tu viaje', typographyId: 'Inter',
    },
    brand: {clientId: 'caminantes', clientDriveFolderId: 'root', name: 'Caminantes', logoUrl: 'https://example.com/logo.png', accentColor: '#3E5C48'},
  }
  const oldTemplate = {
    id: 'old-m4', html: '<main></main>',
    contract: {template_id: 'old', version: '1.0.0', piece_type: 'banner', mold_type: 4, dimensions: {width: 1080, height: 1350}, variant: 'old', branding_tokens: [], slots: {salida_1_lugar: {}, salida_2_lugar: {}}},
  }
  assert.throws(() => buildApprovedLibraryPreviewPayload({template: oldTemplate, currentPayload}), /no soporta precio/u)
})
