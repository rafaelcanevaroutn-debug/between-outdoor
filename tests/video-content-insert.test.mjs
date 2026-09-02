import test from 'node:test'
import assert from 'node:assert/strict'
import { mapPieceToInsertRow } from '../lib/contenido-insert.ts'

const ctx = {
  salidaId: 'salida-1',
  userId: 'user-1',
  carpetaFotos: 'videos/salida',
  carpetaFotosId: 'folder-selected-1',
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
    tipografia_id: 'Montserrat',
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
  assert.equal(row.render_status, 'pending_review')
  assert.equal(row.approved_at, null)
  assert.equal(row.approved_by, null)
  assert.equal(row.generation_metadata.video_folder_id, 'folder-selected-1')
  const {visual_contract: visualContract, ...semanticContract} = row.generation_metadata.video_contract
  assert.deepEqual(semanticContract, {
    titulo: piece.titulo,
    items: piece.items,
    cta: piece.cta,
    tipografia_id: 'Montserrat',
    duracion_estimada_segundos: 8.5,
  })
  assert.equal(visualContract.template_id, 'TemplateAdaptiveTravel')
  assert.equal(visualContract.format, 'destination_list')
})

test('mapea Storytelling 2b conservando cierre opcional y desarrollo', () => {
  const piece = {
    formato: 'video',
    subfamilia: '2b',
    apertura: '¿Conocías este sendero?',
    desarrollo: ['Empieza acá', 'Termina allá'],
    cierre: 'Guardalo',
    tipografia_id: 'Inter',
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
      tipografia_id: 'Oswald',
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
    if (subfamilia === '3a') {
      assert.deepEqual(row.generation_metadata.render_content_contract, {
        contentKind: '3a/reflexivo',
        copy: piece.copy,
        typographyId: 'Oswald',
      })
      assert.equal(row.generation_metadata.render_container.kind, 'video_background')
      assert.equal(row.generation_metadata.render_container.background.type, 'video')
    }
  }
})

test('persiste 3a como imagen fija sin alterar su copy y sin sobrecargar video_crudo', () => {
  const piece = {
    formato: 'video',
    subfamilia: '3a',
    copy: 'A veces avanzar también es aprender a mirar.',
    tipografia_id: 'Oswald',
    duracion_estimada_segundos: 4,
    metadata: { ...metadata, maxCharacters: 85 },
  }
  const row = mapPieceToInsertRow(piece, {
    ...ctx,
    videoRenderContainer: 'still_image_with_music',
    stillImageReference: 'foto-cumbre.jpg',
    musicTone: 'epico',
  })

  assert.equal(row.titulo, piece.copy)
  assert.equal(row.video_crudo, null)
  assert.deepEqual(row.generation_metadata.render_content_contract, {
    contentKind: '3a/reflexivo',
    copy: piece.copy,
    typographyId: 'Oswald',
  })
  assert.deepEqual(row.generation_metadata.render_container, {
    kind: 'still_image_with_music',
    background: { type: 'image', reference: 'foto-cumbre.jpg' },
    resultDurationSeconds: 10,
    durationFormula: 'music_only_fixed_10s',
    music: { status: 'selected_by_tone', tone: 'epico', source: 'drive_music_bank' },
    textAnimation: { kind: 'kinetic_center', entrance: 'word_stagger', exit: 'fade' },
  })
  assert.equal(row.render_status, 'pending_review')
})

test('mapea Familia 1b como copy simple, con duración fija de 15s y vertical comunidad', () => {
  const piece = {
    formato: 'video',
    subfamilia: '1b',
    copy: 'Se fue la señal. Por primera vez en semanas, no importó.',
    tipografia_id: 'Oswald',
    duracion_estimada_segundos: 15,
    metadata: { ...metadata, maxCharacters: 117 },
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.titulo, piece.copy)
  assert.deepEqual(row.bullets, [])
  assert.equal(row.tema, 'video_1b')
  assert.equal(row.vertical, 'comunidad')
  assert.equal(row.generation_metadata.video_subfamilia, '1b')
  assert.equal(row.generation_metadata.video_contract.copy, piece.copy)
  assert.equal(row.generation_metadata.video_contract.duracion_estimada_segundos, 15)
})

test('mapea Familia 4 con dato duro separado para el subtítulo de Mati', () => {
  const piece = {
    formato: 'video',
    familia: '4',
    copy: 'Vamos a Tafí. Escribinos.',
    dato_duro: '8 de agosto',
    tipografia_id: 'Playfair Display',
    duracion_estimada_segundos: 5,
    metadata: { ...metadata, maxCharacters: 51 },
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.titulo, piece.copy)
  assert.equal(row.subtitulo, piece.dato_duro)
  assert.equal(row.cta, null)
  assert.equal(row.tema, 'video_4')
  assert.equal(row.vertical, 'conversion')
  assert.equal(row.generation_metadata.video_contract.copy, piece.copy)
  assert.equal(row.generation_metadata.video_contract.dato_duro, piece.dato_duro)
})

test('mapea el video local informativo con agenda y CTA separados', () => {
  const piece = {
    formato: 'video',
    familia: '4',
    copy: 'Trekking en grupo · Tucumán',
    dato_duro: 'Horco Molle',
    items: [],
    cta: 'Sumate desde el link de la bio.',
    layout: 'local_fixed_info',
    tipografia_id: 'Inter',
    duracion_estimada_segundos: 10,
    metadata: { ...metadata, maxCharacters: 111 },
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.titulo, piece.copy)
  assert.equal(row.subtitulo, piece.dato_duro)
  assert.deepEqual(row.bullets, [])
  assert.equal(row.cta, piece.cta)
  assert.equal(row.generation_metadata.video_contract.layout, 'local_fixed_info')
  assert.equal(row.generation_metadata.video_contract.cta, piece.cta)
})

test('mapea Familia 5 preservando lugar y datos estructurados sin habilitar render', () => {
  const piece = {
    formato: 'video',
    familia: '5',
    lugar: 'Sendero Laguna de los Tres',
    datos: [
      { etiqueta: 'distancia', valor: '26 km i/v' },
      { etiqueta: 'duración', valor: '8-9 h i/v' },
      { etiqueta: 'dificultad', valor: 'Alta' },
    ],
    tipografia_id: 'Playfair Display',
    duracion_estimada_segundos: 0,
    metadata,
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.titulo, piece.lugar)
  assert.deepEqual(row.bullets, ['distancia: 26 km i/v', 'duración: 8-9 h i/v', 'dificultad: Alta'])
  assert.equal(row.tema, 'video_5')
  assert.equal(row.vertical, 'autoridad')
  const {visual_contract: visualContract, ...semanticContract} = row.generation_metadata.video_contract
  assert.deepEqual(semanticContract, {
    lugar: piece.lugar,
    datos: piece.datos,
    tipografia_id: 'Playfair Display',
    duracion_estimada_segundos: 0,
  })
  assert.equal(visualContract.template_id, 'TemplateAdaptiveTravel')
  assert.equal(visualContract.format, 'evidence_education')
})

test('carrusel se inserta listo para dispatch automático', () => {
  const piece = {
    formato: 'carrusel',
    formato_carrusel: 'editorial',
    tema: 'destinos',
    estructura_narrativa: 'storytelling',
    cantidad_slides: 1,
    angulo: 'Ángulo interno',
    slides: [{ n_slide: 1, rol: 'portada', texto_principal: 'Hola', texto_apoyo: null, indicacion_imagen: 'foto' }],
    cta_comentario: 'Comentá HOLA',
    objetivo_interaccion: 'comentar',
    descripcion_post: 'Post de prueba',
    carpeta_material: 'carrusel/salida',
    mes: 'Agosto',
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.render_status, 'dispatching')
  assert.equal(row.approved_at, null)
  assert.equal(row.approved_by, null)
})

test('carrusel_promo también se inserta listo para dispatch automático', () => {
  const piece = {
    formato: 'carrusel_promo',
    variante: 'promo_simple',
    slides: [{ n_slide: 1, rol: 'portada', texto_principal: 'Hola', texto_apoyo: null, indicacion_imagen: 'foto' }],
    carpeta_material: 'carrusel/salida',
    mes: 'Agosto',
  }
  const row = mapPieceToInsertRow(piece, ctx)
  assert.equal(row.render_status, 'dispatching')
  assert.equal(row.approved_at, null)
  assert.equal(row.approved_by, null)
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
