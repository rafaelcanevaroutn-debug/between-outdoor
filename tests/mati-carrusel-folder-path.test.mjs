import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchCarruselRenders } from '../lib/mati-dispatch.ts'

test('envía a Mati la ruta completa de la carpeta de material', async () => {
  let payload = null
  let request = 0
  const row = {
    id: 'pieza-1',
    formato: 'carrusel',
    formato_carrusel: 'lugar',
    objetivo_interaccion: 'convertir',
    descripcion_post: 'Descripción',
    tema: 'destinos',
    angulo: 'Ángulo',
    slides_data: [{ n_slide: 1, rol: 'portada', texto_principal: 'Chaltén' }],
    video_crudo: 'Chalten/Paisajes',
    titulo: null,
    subtitulo: null,
    bullets: null,
    cta: null,
    mes: null,
  }

  await dispatchCarruselRenders([row], {
    admin: {},
    matiBase: 'http://mati:4000',
    matiCarruselUrl: 'http://mati:4000/api/generar-carrusel',
    matiVideoUrl: null,
    matiCliente: 'between',
    matiToken: undefined,
    sleep: async () => {},
    pollIntervalMs: 0,
    maxPollAttempts: 1,
    persistCarruselRenderState: async () => {},
    fetchImpl: async (_url, init) => {
      request += 1
      if (request === 1) {
        payload = JSON.parse(init.body)
        return new Response(JSON.stringify({ jobId: 'job-1' }), { status: 202 })
      }
      return new Response(JSON.stringify({
        state: 'completed',
        result: { driveFolderId: 'render-1' },
      }), { status: 200 })
    },
  })

  assert.equal(payload.carpeta, 'Chalten/Paisajes')
  assert.equal(payload.referenceId, 'pieza-1')
})

test('con webhook encola y no inicia polling de estado', async () => {
  const previousWebhook = process.env.MATI_RENDER_WEBHOOK_URL
  process.env.MATI_RENDER_WEBHOOK_URL = 'http://between:3001/api/webhooks/mati/render'
  let requests = 0
  let payload = null

  try {
    await dispatchCarruselRenders([{
      id: 'pieza-webhook', formato: 'carrusel', formato_carrusel: 'lugar',
      objetivo_interaccion: 'convertir', descripcion_post: 'Descripción', tema: 'destinos',
      angulo: 'Ángulo', slides_data: [{n_slide: 1, rol: 'portada', texto_principal: 'Chaltén'}],
      video_crudo: 'Chalten/Paisajes', titulo: null, subtitulo: null,
      bullets: null, cta: null, mes: null,
    }], {
      admin: {}, matiBase: 'http://mati:4000',
      matiCarruselUrl: 'http://mati:4000/api/generar-carrusel', matiVideoUrl: null,
      matiCliente: 'between', matiToken: undefined,
      persistCarruselRenderState: async () => {},
      fetchImpl: async (_url, init) => {
        requests += 1
        payload = JSON.parse(init.body)
        return new Response(JSON.stringify({jobId: 'job-webhook'}), {status: 202})
      },
    })
  } finally {
    if (previousWebhook === undefined) delete process.env.MATI_RENDER_WEBHOOK_URL
    else process.env.MATI_RENDER_WEBHOOK_URL = previousWebhook
  }

  assert.equal(requests, 1)
  assert.equal(payload.callbackUrl, 'http://between:3001/api/webhooks/mati/render')
  assert.equal(payload.referenceId, 'pieza-webhook')
})
