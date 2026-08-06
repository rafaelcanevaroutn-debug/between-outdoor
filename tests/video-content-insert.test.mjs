import test from 'node:test'
import assert from 'node:assert/strict'
import { mapPieceToInsertRow } from '../lib/contenido-insert.ts'

const ctx = {
  salidaId: 'salida-1',
  userId: 'user-1',
  carpetaFotos: 'videos/salida',
}

const metadata = {
  inputTokens: 10,
  outputTokens: 5,
  clipDurationSeconds: 12,
  knowledgeFile: 'knowledge.md',
}

test('mapea Listicle 2a sin perder items, CTA, tipografía ni duración', () => {
  const piece = {
    formato: 'video',
    subfamilia: '2a',
    titulo: '2 lugares para conocer',
    items: ['Lugar A', 'Lugar B'],
    cta: 'Guardalo',
    tipografia_id: 'font-a',
    duracion_estimada_segundos: 8.5,
    metadata,
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.titulo, piece.titulo)
  assert.deepEqual(row.bullets, piece.items)
  assert.equal(row.cta, piece.cta)
  assert.equal(row.tema, 'video_2a')
  assert.equal(row.vertical, 'autoridad')
  assert.equal(row.video_crudo, 'videos/salida')
  assert.deepEqual(row.generation_metadata.video_contract, {
    titulo: piece.titulo,
    items: piece.items,
    cta: piece.cta,
    tipografia_id: 'font-a',
    duracion_estimada_segundos: 8.5,
  })
})

test('mapea Storytelling 2b conservando cierre opcional y desarrollo', () => {
  const piece = {
    formato: 'video',
    subfamilia: '2b',
    apertura: '¿Conocías este sendero?',
    desarrollo: ['Empieza acá', 'Termina allá'],
    cierre: 'Guardalo',
    tipografia_id: 'font-b',
    duracion_estimada_segundos: 10,
    metadata,
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.titulo, piece.apertura)
  assert.deepEqual(row.bullets, piece.desarrollo)
  assert.equal(row.cta, piece.cierre)
  assert.deepEqual(row.generation_metadata.video_contract.desarrollo, piece.desarrollo)
})

test('mapea las cinco subfamilias de Familia 3 como copy simple', () => {
  for (const subfamilia of ['3a', '3b', '3c', '3d', '3e']) {
    const piece = {
      formato: 'video',
      subfamilia,
      copy: `Copy ${subfamilia}`,
      tipografia_id: 'font-c',
      duracion_estimada_segundos: 4,
      metadata: { ...metadata, maxCharacters: 51 },
    }
    const row = mapPieceToInsertRow(piece, ctx)
    assert.equal(row.titulo, piece.copy)
    assert.deepEqual(row.bullets, [])
    assert.equal(row.tema, `video_${subfamilia}`)
    assert.equal(row.generation_metadata.video_motor, 'familias')
    assert.equal(row.generation_metadata.video_subfamilia, subfamilia)
    assert.equal(row.generation_metadata.video_contract.copy, piece.copy)
  }
})

test('mapea Familia 4 sin separar artificialmente CTA o dato duro', () => {
  const piece = {
    formato: 'video',
    familia: '4',
    copy: 'Vamos a Tafí el 8 de agosto. Escribinos.',
    tipografia_id: 'font-d',
    duracion_estimada_segundos: 5,
    metadata: { ...metadata, maxCharacters: 51 },
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.titulo, piece.copy)
  assert.equal(row.cta, null)
  assert.equal(row.tema, 'video_4')
  assert.equal(row.vertical, 'conversion')
  assert.equal(row.generation_metadata.video_contract.copy, piece.copy)
})

test('el mapper legacy conserva su forma previa', () => {
  const legacy = {
    formato: 'video',
    tema: 'pov',
    vertical: 'pov',
    carpeta_material: 'legacy',
    titulo: 'Título',
    subtitulo: 'Subtítulo',
    bullets: ['Uno'],
    cta: 'CTA',
    video_crudo: 'crudo',
    mes: 'Agosto',
  }
  const row = mapPieceToInsertRow(legacy, ctx)
  assert.equal(row.titulo, 'Título')
  assert.equal(row.subtitulo, 'Subtítulo')
  assert.deepEqual(row.bullets, ['Uno'])
  assert.equal(row.generation_metadata, undefined)
})
