import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFamiliesVideoPayload,
  dispatchFamiliesVideoRender,
  MATI_VIDEO_SUBFAMILY_BY_INTERNAL,
} from '../lib/mati-families-video-dispatch.ts'

const baseSource = {
  id: 'piece-1',
  subfamilia: '3a',
  contract: {
    copy: 'Lo importante a veces no se ve.',
    tipografia_id: 'Montserrat',
    duracion_estimada_segundos: 3.3,
  },
  generationMetadata: { video_folder_id: 'folder-selected' },
  videoCrudo: 'Videos Chaltén',
  mes: null,
  fechaInicio: '2026-12-27',
  ownerProfile: { company_name: 'Between', full_name: 'Rafa' },
  brandIdentity: {
    mati_cliente_id: 'between-mati',
    color_primario: '#34D17E',
    color_texto: '#F0FFF4',
    font_body: 'Inter',
    videos_folder_id: 'folder-fallback',
  },
}

const keepSelectedVideoFolder = async (folderId, folderName) => ({ folderId, folderName })

test('mapea los trece códigos internos a los nombres semánticos exactos de Mati', () => {
  assert.deepEqual(MATI_VIDEO_SUBFAMILY_BY_INTERNAL, {
    '1a': 'discurso',
    '1b': 'barras_senal',
    '1c': 'relato',
    '2a': 'listicle_storytelling',
    '2b': 'listicle_storytelling',
    '2c': 'listicle_storytelling',
    '3a': 'reflexivo',
    '3b': 'pov',
    '3c': 'meme',
    '3d': 'conversacional',
    '3e': 'lugar',
    '4': 'comercial',
    '5': 'ficha',
  })
  assert.equal(MATI_VIDEO_SUBFAMILY_BY_INTERNAL['2a'], MATI_VIDEO_SUBFAMILY_BY_INTERNAL['2b'])
})

test('Familia 5 transporta lugar y datos estructurados como title y bullets planos', () => {
  const result = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '5',
    contract: {
      lugar: 'Sendero Laguna de los Tres',
      subtitle: 'FICHA TÉCNICA',
      datos: [
        { etiqueta: 'altitud máxima', valor: '5000m' },
        { etiqueta: 'distancia', valor: '26 km i/v' },
        { etiqueta: 'dificultad', valor: 'Alta' },
      ],
      tipografia_id: 'Montserrat',
      duracion_estimada_segundos: 7,
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.payload.subfamilia, 'ficha')
  assert.equal(result.payload.title, 'Sendero Laguna de los Tres')
  assert.equal(result.payload.subtitle, 'FICHA TÉCNICA')
  assert.deepEqual(result.payload.bullets, [
    'Altitud máxima: 5000m',
    'Distancia: 26 km i/v',
    'Dificultad: Alta',
  ])
  assert.equal(result.payload.plantilla, 'TemplateNativeDisplay')
  assert.equal('titulo' in result.payload, false)
})

test('Familia 1a manda el discurso completo como title y sin plantilla', () => {
  const result = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '1a',
    contract: {
      discurso: 'Primero entra una idea. Después encuentra su peso. Al final cierra el recorrido.',
      tipografia_id: 'Montserrat',
      duracion_estimada_segundos: 8,
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.payload.subfamilia, 'discurso')
  assert.equal(result.payload.title, 'Primero entra una idea. Después encuentra su peso. Al final cierra el recorrido.')
  assert.equal(result.payload.plantilla, '')
  assert.equal('titulo' in result.payload, false)
})

test('Familias 3 mapean copy sin CTA ni plantilla (plantilla queda undefined, Matías la reserva para 2a/2b/4)', () => {
  const expected = {
    '3a': 'reflexivo',
    '3b': 'pov',
    '3c': 'meme',
    '3d': 'conversacional',
    '3e': 'lugar',
  }
  for (const [subfamilia, matiSubfamilia] of Object.entries(expected)) {
    const result = buildFamiliesVideoPayload({ ...baseSource, subfamilia })
    assert.equal(result.ok, true)
    assert.equal(result.payload.subfamilia, matiSubfamilia)
    assert.equal(result.payload.titulo, baseSource.contract.copy)
    assert.equal(result.payload.subtitulo, null)
    assert.deepEqual(result.payload.bullets, [])
    assert.equal(result.payload.cta, null)
    assert.equal(result.payload.fuente_titulo, 'Montserrat')
    assert.equal(result.payload.fuente_subtitulo, 'Inter')
    assert.equal(result.payload.carpetaId, 'folder-selected')
    assert.equal(result.payload.plantilla, undefined)
  }
})

test('propaga la duración contractual con un techo de 30 segundos', () => {
  const result = buildFamiliesVideoPayload({
    ...baseSource,
    generationMetadata: {clipDurationSeconds: 60},
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.payload.duracion_segundos, 30)
})

test('still_image_with_music entrega el contrato final al worker', () => {
  const result = buildFamiliesVideoPayload({
    ...baseSource,
    generationMetadata: {
      render_container: {
        kind: 'still_image_with_music',
        background: { type: 'image', reference: 'foto-laguna.jpg' },
        resultDurationSeconds: 10,
        durationFormula: 'music_only_fixed_10s',
        music: { status: 'selected_by_tone', tone: 'reflexivo', source: 'drive_music_bank' },
        textAnimation: { kind: 'kinetic_center', entrance: 'word_stagger', exit: 'fade' },
      },
      video_folder_id: 'folder-selected',
    },
    videoCrudo: null,
  })

  assert.equal(result.ok, true)
  assert.equal(result.payload.plantilla, 'TemplateStillImageMusic')
  assert.equal(result.payload.imagen_estatica, 'foto-laguna.jpg')
  assert.equal(result.payload.tono_musical, 'reflexivo')
  assert.equal(result.payload.duracion_segundos, 10)
  assert.equal(result.payload.animacion_texto, 'kinetic_center')
})

test('la biblioteca musical sólo envía un ID de carpeta explícito, nunca el nombre semántico de la zona', () => {
  const explicit = buildFamiliesVideoPayload({
    ...baseSource,
    generationMetadata: {
      video_folder_id: 'folder-selected',
      zona_geografica: 'Caribe / Playa',
      music_folder_id: 'drive-music-caribe',
    },
  })
  const withoutMapping = buildFamiliesVideoPayload({
    ...baseSource,
    generationMetadata: {
      video_folder_id: 'folder-selected',
      zona_geografica: 'Caribe / Playa',
    },
  })

  assert.equal(explicit.ok, true)
  assert.equal(explicit.payload.carpetaMusicaId, 'drive-music-caribe')
  assert.equal(withoutMapping.ok, true)
  assert.notEqual(withoutMapping.payload.carpetaMusicaId, 'Caribe / Playa')
})

test('Familia 1b mapea copy sin CTA y con plantilla explícita TemplateFamilia1Motion', () => {
  const result = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '1b',
    contract: {
      copy: 'Se fue la señal. Por primera vez en semanas, no importó.',
      tipografia_id: 'Montserrat',
      duracion_estimada_segundos: 15,
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.payload.subfamilia, 'barras_senal')
  assert.equal(result.payload.titulo, 'Se fue la señal. Por primera vez en semanas, no importó.')
  assert.deepEqual(result.payload.bullets, [])
  assert.equal(result.payload.cta, null)
  assert.equal(result.payload.plantilla, 'TemplateFamilia1Motion')
})

test('Familia 4 mapea copy a título y dato duro a subtítulo sin duplicar CTA', () => {
  const result = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '4',
    contract: {
      copy: 'Vamos a Tafí del Valle. Escribinos.',
      dato_duro: 'ARS 158.000',
      tipografia_id: 'Montserrat',
      duracion_estimada_segundos: 5,
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.payload.titulo, 'Vamos a Tafí del Valle. Escribinos.')
  assert.equal(result.payload.subtitulo, 'ARS 158.000')
  assert.deepEqual(result.payload.bullets, [])
  assert.equal(result.payload.cta, null)
  assert.equal(result.payload.subfamilia, 'comercial')
  assert.equal(result.payload.plantilla, 'TemplateNativeCommercial')
})

test('Familia 4 local envía layout fijo, agenda y CTA al renderer', () => {
  const result = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '4',
    contract: {
      copy: 'Trekking en grupo · Tucumán',
      dato_duro: 'JUE · VIE · SÁB',
      items: ['18:30 h'],
      cta: 'Sumate desde el link de la bio.',
      layout: 'local_fixed_info',
      tipografia_id: 'Inter',
      duracion_estimada_segundos: 10,
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.payload.layout, 'local_fixed_info')
  assert.equal(result.payload.titulo, 'Trekking en grupo · Tucumán')
  assert.equal(result.payload.subtitulo, 'JUE · VIE · SÁB')
  assert.deepEqual(result.payload.bullets, ['18:30 h'])
  assert.equal(result.payload.cta, 'Sumate desde el link de la bio.')
})

test('Familia 2a, 2b y 2c conservan sus secuencias y CTA opcional, con plantilla TemplateNativeSequential', () => {
  const listicle = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '2a',
    contract: {
      titulo: '3 senderos para conocer',
      items: ['Uno', 'Dos', 'Tres'],
      cta: 'Mandáselo a un amigo',
      tipografia_id: 'Bangers',
      duracion_estimada_segundos: 10,
    },
  })
  assert.equal(listicle.ok, true)
  assert.equal(listicle.payload.titulo, '3 senderos para conocer')
  assert.deepEqual(listicle.payload.bullets, ['Uno', 'Dos', 'Tres'])
  assert.equal(listicle.payload.cta, 'Mandáselo a un amigo')
  assert.equal(listicle.payload.subfamilia, 'listicle_storytelling')
  assert.equal(listicle.payload.plantilla, 'TemplateNativeSequential')

  const storytelling = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '2b',
    generationMetadata: {},
    contract: {
      apertura: '¿Conocías este sendero?',
      desarrollo: ['Empieza en el refugio', 'Termina en la laguna'],
      tipografia_id: 'Inter',
      duracion_estimada_segundos: 11,
    },
  })
  assert.equal(storytelling.ok, true)
  assert.deepEqual(storytelling.payload.bullets, ['Empieza en el refugio', 'Termina en la laguna'])
  assert.equal(storytelling.payload.cta, null)
  assert.equal(storytelling.payload.subfamilia, 'listicle_storytelling')
  assert.equal(storytelling.payload.carpetaId, 'folder-fallback')
  assert.equal(storytelling.payload.plantilla, 'TemplateNativeSequential')

  const consejos = buildFamiliesVideoPayload({
    ...baseSource,
    subfamilia: '2c',
    contract: {
      titulo: '4 tips para Tilcara',
      items: ['Llevá agua', 'Salí temprano', 'Usá bastones', 'Avisá tu recorrido'],
      cta: 'Guardalo para tu próxima salida',
      tipografia_id: 'Oswald',
      duracion_estimada_segundos: 10,
    },
  })
  assert.equal(consejos.ok, true)
  assert.equal(consejos.payload.titulo, '4 tips para Tilcara')
  assert.deepEqual(consejos.payload.bullets, ['Llevá agua', 'Salí temprano', 'Usá bastones', 'Avisá tu recorrido'])
  assert.equal(consejos.payload.cta, 'Guardalo para tu próxima salida')
  assert.equal(consejos.payload.subfamilia, 'listicle_storytelling')
  assert.equal(consejos.payload.plantilla, 'TemplateNativeSequential')
})

test('falla explícitamente cuando no hay carpeta o carpetaId', () => {
  const withoutFolder = buildFamiliesVideoPayload({ ...baseSource, videoCrudo: null })
  assert.equal(withoutFolder.ok, false)
  assert.match(withoutFolder.error, /video_crudo/u)

  const withoutFolderId = buildFamiliesVideoPayload({
    ...baseSource,
    generationMetadata: {},
    brandIdentity: { ...baseSource.brandIdentity, videos_folder_id: null },
  })
  assert.equal(withoutFolderId.ok, false)
  assert.match(withoutFolderId.error, /carpetaId/u)
})

test('POST 202, polling y persistencia recorren rendering hasta rendered', async () => {
  const fetchCalls = []
  const fetchImpl = async (url, init) => {
    fetchCalls.push({ url: String(url), init })
    if (fetchCalls.length === 1) {
      return new Response(JSON.stringify({ jobId: 'job-123' }), { status: 202 })
    }
    return new Response(JSON.stringify({
      state: 'completed',
      result: { driveFolderId: 'render-folder-123' },
    }), { status: 200 })
  }
  const persisted = []

  await dispatchFamiliesVideoRender(baseSource, {
    admin: {},
    matiVideoUrl: 'http://mati:4000/api/generar-video',
    matiToken: 'secret',
    fetchImpl,
    resolveVideoFolder: keepSelectedVideoFolder,
    sleep: async () => {},
    pollIntervalMs: 0,
    maxPollAttempts: 1,
    persistRenderState: async (status, metadata, renderFolderId) => {
      persisted.push({ status, metadata, renderFolderId })
    },
  })

  assert.equal(fetchCalls[0].url, 'http://mati:4000/api/generar-video')
  assert.equal(fetchCalls[1].url, 'http://mati:4000/api/status/job-123')
  const sentPayload = JSON.parse(fetchCalls[0].init.body)
  assert.equal(sentPayload.titulo, baseSource.contract.copy)
  assert.equal(sentPayload.subfamilia, 'reflexivo')
  assert.notEqual(sentPayload.subfamilia, baseSource.subfamilia)
  assert.equal('plantilla' in sentPayload, false)
  assert.deepEqual(persisted.map(item => item.status), ['rendering', 'rendered'])
  assert.equal(persisted[0].metadata.video_render_job_id, 'job-123')
  assert.equal(persisted[1].renderFolderId, 'render-folder-123')
})

test('con webhook envía referenceId y no hace polling', async () => {
  const fetchCalls = []
  const persisted = []
  await dispatchFamiliesVideoRender(baseSource, {
    admin: {},
    matiVideoUrl: 'http://mati:4000/api/generar-video',
    callbackUrl: 'http://between:3001/api/webhooks/mati/video',
    fetchImpl: async (url, init) => {
      fetchCalls.push({url: String(url), init})
      return new Response(JSON.stringify({jobId: 'job-webhook'}), {status: 202})
    },
    resolveVideoFolder: keepSelectedVideoFolder,
    persistRenderState: async (status, metadata) => persisted.push({status, metadata}),
  })

  assert.equal(fetchCalls.length, 1)
  const payload = JSON.parse(fetchCalls[0].init.body)
  assert.equal(payload.referenceId, baseSource.id)
  assert.equal(payload.callbackUrl, 'http://between:3001/api/webhooks/mati/video')
  assert.deepEqual(persisted.map(item => item.status), ['rendering'])
  assert.equal(persisted[0].metadata.video_render_job_id, 'job-webhook')
})

test('un rechazo de Mati persiste failed y no inicia polling', async () => {
  const persisted = []
  await dispatchFamiliesVideoRender(baseSource, {
    admin: {},
    matiVideoUrl: 'http://mati:4000/api/generar-video',
    fetchImpl: async () => new Response('bad request', { status: 400 }),
    resolveVideoFolder: keepSelectedVideoFolder,
    sleep: async () => {},
    persistRenderState: async (status, metadata) => persisted.push({ status, metadata }),
  })
  assert.deepEqual(persisted.map(item => item.status), ['failed'])
  assert.match(persisted[0].metadata.video_render_error, /HTTP 400/u)
})

test('un job fallido persiste jobId, detalle y estado failed', async () => {
  let request = 0
  const persisted = []
  await dispatchFamiliesVideoRender(baseSource, {
    admin: {},
    matiVideoUrl: 'http://mati:4000/api/generar-video',
    fetchImpl: async () => {
      request += 1
      if (request === 1) return new Response(JSON.stringify({ jobId: 'job-failed' }), { status: 202 })
      return new Response(JSON.stringify({ state: 'failed', error: 'No se pudo abrir el video' }), { status: 200 })
    },
    resolveVideoFolder: keepSelectedVideoFolder,
    sleep: async () => {},
    pollIntervalMs: 0,
    maxPollAttempts: 1,
    persistRenderState: async (status, metadata) => persisted.push({ status, metadata }),
  })
  assert.deepEqual(persisted.map(item => item.status), ['rendering', 'failed'])
  assert.equal(persisted[1].metadata.video_render_job_id, 'job-failed')
  assert.equal(persisted[1].metadata.video_render_error, 'No se pudo abrir el video')
})
