import test from 'node:test'
import assert from 'node:assert/strict'
import {mapBannerMolde1ToInsertRow} from '../lib/banner-content-insert.ts'

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
