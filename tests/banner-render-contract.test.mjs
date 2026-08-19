import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BANNER_MOLDE_1_CAPS,
  buildBannerMolde1RenderPayload,
  rebuildBannerMolde1Content,
  validateBannerRendererContent,
} from '../lib/banner-render-contract.ts'

const content = {
  contentKind: 'banner/molde-1',
  lugar: 'Tilcara',
  fecha: '15 de diciembre',
  copy: 'Vamos a Tilcara. ¿Te sumás?',
  items: ['Llevá agua', 'Salí temprano'],
  typographyId: 'Playfair Display',
}

test('adapta el contenido neutral al contrato exacto del renderer', () => {
  const payload = buildBannerMolde1RenderPayload({
    rowId: 'row-1',
    content,
    backgroundDriveFileId: 'drive_file-1',
    ownerProfile: {company_name: 'Caminantes', full_name: null},
    brandIdentity: {
      drive_folder_id: 'client_root-1',
      logo_url: 'https://example.com/logo.png',
      color_acento: '#12ab34',
      color_primario: null,
    },
  })
  assert.equal(payload.templateId, 'banner/molde-1@1')
  assert.equal(payload.content.typographyId, 'PlayfairDisplay')
  assert.equal(payload.backgroundDriveFileId, 'drive_file-1')
  assert.equal(payload.brand.clientId, 'caminantes')
  assert.equal(payload.brand.clientDriveFolderId, 'client_root-1')
  assert.equal(payload.brand.accentColor, '#12AB34')
})

test('valida caps de producción para los seis contratos antes de despachar', () => {
  assert.deepEqual(validateBannerRendererContent({
    contentKind: 'banner/molde-5', lugar: 'Riviera Maya', fecha: '8 de marzo',
    noches: '8 noches', alojamiento: 'Hotel 4 estrellas', regimen: 'Media pensión',
    incluye: [{icon: 'aereos', label: 'Aéreos'}], precio: 'USD 2.900', cta: 'Pedí el itinerario', typographyId: 'Inter',
  }), [])
  assert.match(validateBannerRendererContent({
    contentKind: 'banner/molde-6', mensaje: 'x'.repeat(81), convocatoria: 'Sumate', typographyId: 'Inter',
  }).join('; '), /mensaje supera/u)
  assert.match(validateBannerRendererContent({
    contentKind: 'banner/molde-2', lugar: 'Tilcara', fecha: '8 de marzo',
    ficha: [{etiqueta: 'distancia', valor: 'x'.repeat(19)}, {etiqueta: 'duración', valor: '6 h'}, {etiqueta: 'dificultad', valor: 'Alta'}],
    cta: 'Guardalo', typographyId: 'Inter',
  }).join('; '), /ficha supera/u)
})

test('reconstruye desde campos editables sin perder la tipografía preservada', () => {
  const rebuilt = rebuildBannerMolde1Content({
    id: 'row-1', titulo: content.lugar, subtitulo: content.fecha,
    bullets: content.items, cta: content.copy,
    generation_metadata: {banner_content_contract: content},
  })
  assert.deepEqual(rebuilt, content)
})

test('rechaza caps, tipografías o identidad de renderer inválidos', () => {
  assert.throws(() => buildBannerMolde1RenderPayload({
    rowId: 'row-1', content: {...content, copy: 'x'.repeat(BANNER_MOLDE_1_CAPS.copy + 1)},
    backgroundDriveFileId: 'drive_file-1',
    ownerProfile: {company_name: 'Caminantes', full_name: null},
    brandIdentity: {drive_folder_id: 'client_root-1', logo_url: null, color_acento: null, color_primario: null},
  }), /copy supera/u)
  assert.throws(() => buildBannerMolde1RenderPayload({
    rowId: 'row-1', content: {...content, typographyId: 'Montserrat'},
    backgroundDriveFileId: 'drive_file-1',
    ownerProfile: {company_name: 'Caminantes', full_name: null},
    brandIdentity: {drive_folder_id: 'client_root-1', logo_url: null, color_acento: null, color_primario: null},
  }), /tipografía/u)
})
