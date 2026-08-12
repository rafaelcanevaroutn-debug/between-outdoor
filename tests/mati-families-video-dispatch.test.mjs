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

test('mapea los nueve códigos internos a los nombres semánticos exactos de Mati', () => {
  assert.deepEqual(MATI_VIDEO_SUBFAMILY_BY_INTERNAL, {
    '2a': 'listicle_storytelling',
    '2b': 'listicle_storytelling',
    '3a': 'reflexivo',
    '3b': 'pov',
    '3c': 'meme',
    '3d': 'conversacional',
    '3e': 'lugar',
    '4': 'comercial',
    // '5': placeholder sin confirmar — rebuildApprovedVideoContract bloquea
    // la aprobación de Familia 5 antes de llegar a este mapa (ver
    // tests/video-approved-contract.test.mjs).
    '5': 'consejo',
  })
  assert.equal(MATI_VIDEO_SUBFAMILY_BY_INTERNAL['2a'], MATI_VIDEO_SUBFAMILY_BY_INTERNAL['2b'])
})

test('Familias 3 mapean copy sin CTA ni plantilla', () => {
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
    assert.equal('plantilla' in result.payload, false)
  }
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
  assert.equal('plantilla' in result.payload, false)
})

test('Familia 2a y 2b conservan sus secuencias y CTA opcional', () => {
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

test('un rechazo de Mati persiste failed y no inicia polling', async () => {
  const persisted = []
  await dispatchFamiliesVideoRender(baseSource, {
    admin: {},
    matiVideoUrl: 'http://mati:4000/api/generar-video',
    fetchImpl: async () => new Response('bad request', { status: 400 }),
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
    sleep: async () => {},
    pollIntervalMs: 0,
    maxPollAttempts: 1,
    persistRenderState: async (status, metadata) => persisted.push({ status, metadata }),
  })
  assert.deepEqual(persisted.map(item => item.status), ['rendering', 'failed'])
  assert.equal(persisted[1].metadata.video_render_job_id, 'job-failed')
  assert.equal(persisted[1].metadata.video_render_error, 'No se pudo abrir el video')
})
