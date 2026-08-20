import test from 'node:test'
import assert from 'node:assert/strict'
import {mapBannerContentToInsertRow, mapBannerMolde1ToInsertRow} from '../lib/banner-content-insert.ts'

test('persiste estructura neutral, molde, foto y gate de aprobación', () => {
  const content = {
    contentKind: 'banner/molde-1', lugar: 'Tilcara', fecha: '15 de diciembre',
    copy: 'Vamos a Tilcara. ¿Te sumás?', items: ['Llevá agua', 'Salí temprano'],
    typographyId: 'Inter',
  }
  const row = mapBannerMolde1ToInsertRow({
    salidaId: 'salida-1', userId: 'user-1', content,
    backgroundDriveFileId: 'drive_file-1', metadata: {inputTokens: 10},
  })
  assert.equal(row.formato, 'banner')
  assert.equal(row.titulo, content.lugar)
  assert.equal(row.subtitulo, content.fecha)
  assert.equal(row.cta, content.copy)
  assert.deepEqual(row.bullets, content.items)
  assert.equal(row.render_status, 'pending_review')
  assert.deepEqual(row.generation_metadata.banner_content_contract, content)
  assert.equal(row.generation_metadata.banner_background_drive_file_id, 'drive_file-1')
})

test('Molde 4 conserva las salidas fuente para revalidar lugar, fecha y precio al aprobar', () => {
  const row = mapBannerContentToInsertRow({
    salidaId: 's1', userId: 'u1', backgroundDriveFileId: 'drive-file', sourceSalidaIds: ['s1', 's2'],
    content: {
      contentKind: 'banner/molde-4', titulo: 'Próximas salidas',
      salidas: [{lugar: 'Tilcara', fecha: '6 de diciembre', precio: 'USD 420'}, {lugar: 'Ushuaia', fecha: '8 de febrero', precio: 'USD 1.200'}],
      cta: 'Elegí tu viaje', typographyId: 'Inter',
    },
  })
  assert.deepEqual(row.source_salida_ids, ['s1', 's2'])
})
