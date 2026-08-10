import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { dispatchCarruselRenders } from '../lib/mati-dispatch.ts'
import { puedeAprobarse } from '../components/carrusel-preview/renderStatus.ts'

const generateRoute = fs.readFileSync(
  path.join(process.cwd(), 'app/api/generate/route.ts'),
  'utf8',
)
const weeklyBatch = fs.readFileSync(
  path.join(process.cwd(), 'lib/orchestrators/weekly-batch.ts'),
  'utf8',
)
const aprobarRoute = fs.readFileSync(
  path.join(process.cwd(), 'app/api/generate/carrusel/[id]/aprobar/route.ts'),
  'utf8',
)

test('la generación individual ya no dispara carrusel automático a Mati', () => {
  assert.doesNotMatch(generateRoute, /dispatchCarruselRenders/u)
  assert.match(generateRoute, /pending_review — esperando aprobación explícita/u)
  // Video legacy sigue disparando automático — no tocamos ese camino.
  assert.match(generateRoute, /after\(\(\) => dispatchVideoRenders/u)
})

test('el batch semanal ya no dispara carrusel automático a Mati', () => {
  assert.doesNotMatch(weeklyBatch, /dispatchCarruselRenders/u)
  assert.match(weeklyBatch, /pending_review — esperando aprobación explícita/u)
  assert.match(weeklyBatch, /dispatchVideoRenders\(videoRows, matiCtx\)/u)
})

test('la ruta de aprobación de carrusel autentica, valida ownership y dispara el dispatch real', () => {
  assert.match(aprobarRoute, /auth\.getUser\(\)/u)
  assert.match(aprobarRoute, /callerProfile\?\.role !== 'admin'/u)
  assert.match(aprobarRoute, /row\.user_id !== user\.id/u)
  assert.match(aprobarRoute, /formato !== 'carrusel' && row\.formato !== 'carrusel_promo'/u)
  assert.match(aprobarRoute, /render_status: 'dispatching'/u)
  assert.match(aprobarRoute, /after\(\(\) => dispatchCarruselRenders/u)
  assert.match(aprobarRoute, /dispatched: true/u)
})

test('la ruta de aprobación de carrusel es idempotente para piezas ya renderizadas o en curso', () => {
  assert.match(aprobarRoute, /render_status === 'rendered'/u)
  assert.match(aprobarRoute, /ACTIVE_STATUSES\.has\(row\.render_status/u)
  assert.match(aprobarRoute, /idempotent: true/u)
})

test('la ruta permite reclamar nuevamente una pieza failed', () => {
  assert.match(aprobarRoute, /row\.render_status !== 'failed'/u)
  assert.doesNotMatch(aprobarRoute, /reintento explícito todavía no está habilitado/u)
})

test('un fallo real de Mati persiste failed y la pieza queda reintentable', async () => {
  const row = {
    id: 'carrusel-fallido',
    formato: 'carrusel',
    formato_carrusel: 'editorial',
    objetivo_interaccion: 'comentar',
    descripcion_post: 'Descripción',
    tema: 'destinos',
    angulo: 'Ángulo',
    slides_data: [{ n_slide: 1, rol: 'portada', texto_principal: 'Copy' }],
    video_crudo: 'Fotos Chaltén',
    titulo: null,
    subtitulo: null,
    bullets: null,
    cta: null,
    mes: 'Agosto',
  }
  const persisted = []
  const context = {
    admin: {},
    matiBase: 'http://mati:4000',
    matiCarruselUrl: 'http://mati:4000/api/generar-carrusel',
    matiVideoUrl: null,
    matiCliente: 'between',
    matiToken: undefined,
    sleep: async () => {},
    pollIntervalMs: 0,
    maxPollAttempts: 1,
    persistCarruselRenderState: async (id, status, metadata, renderFolderId) => {
      persisted.push({ id, status, metadata, renderFolderId })
    },
  }

  await dispatchCarruselRenders([row], {
    ...context,
    fetchImpl: async () => new Response('falló Mati', { status: 500 }),
  })

  assert.deepEqual(persisted.map(item => item.status), ['failed'])
  assert.match(persisted[0].metadata.carrusel_render_error, /HTTP 500/u)
  assert.equal(puedeAprobarse({ render_status: 'failed', render_folder_id: null }), true)

  persisted.length = 0
  let request = 0
  await dispatchCarruselRenders([row], {
    ...context,
    fetchImpl: async () => {
      request += 1
      if (request === 1) return new Response(JSON.stringify({ jobId: 'job-retry' }), { status: 202 })
      return new Response(JSON.stringify({
        state: 'completed',
        result: { driveFolderId: 'folder-retry' },
      }), { status: 200 })
    },
  })

  assert.deepEqual(persisted.map(item => item.status), ['rendering', 'rendered'])
  assert.equal(persisted[0].metadata.carrusel_render_job_id, 'job-retry')
  assert.equal(persisted[1].renderFolderId, 'folder-retry')
})
