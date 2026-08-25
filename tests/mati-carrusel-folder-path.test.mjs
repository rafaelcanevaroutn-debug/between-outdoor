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
})
