import test from 'node:test'
import assert from 'node:assert/strict'
import {dispatchBannerRender} from '../lib/banner-render-dispatch.ts'

const source = {
  id: 'row-1',
  payload: {
    templateId: 'banner/molde-1@1', requestId: 'row-1',
    content: {
      contentKind: 'banner/molde-1', lugar: 'Tilcara', fecha: '15 de diciembre',
      copy: 'Vamos a Tilcara. ¿Te sumás?', items: ['Llevá agua', 'Salí temprano'],
      typographyId: 'Inter',
    },
    backgroundDriveFileId: 'drive_file-1',
    brand: {clientId: 'caminantes', clientDriveFolderId: 'client_root-1', name: 'Caminantes', accentColor: '#F4C95D'},
  },
}

const unusedAdmin = /** @type {never} */ ({})

test('envía, persiste rendering, consulta status y guarda el fileId privado', async () => {
  const calls = []
  const states = []
  const fetchImpl = async (url, init) => {
    calls.push({url: String(url), init})
    if (String(url).endsWith('/api/generar-banner')) {
      return new Response(JSON.stringify({jobId: 'job-1'}), {status: 202})
    }
    return new Response(JSON.stringify({
      state: 'completed',
      result: {
        driveFileId: 'render-file-1',
        downloadUrl: '/api/banner/drive/caminantes/client_root-1/render-file-1',
        templateId: 'banner/molde-1@1', width: 1080, height: 1350,
      },
    }), {status: 200})
  }
  await dispatchBannerRender(source, {
    admin: unusedAdmin,
    matiBase: 'http://mati:4000',
    matiBannerUrl: 'http://mati:4000/api/generar-banner',
    matiToken: 'secret', fetchImpl, sleep: async () => {},
    persistRenderState: async (status, metadata, fileId) => states.push({status, metadata, fileId}),
  })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret')
  assert.equal(JSON.parse(calls[0].init.body).templateId, 'banner/molde-1@1')
  assert.deepEqual(states.map(state => state.status), ['rendering', 'rendered'])
  assert.equal(states[1].fileId, 'render-file-1')
  assert.equal(states[1].metadata.banner_render_download_path, '/api/banner/drive/caminantes/client_root-1/render-file-1')
})

test('un rechazo HTTP termina en failed con detalle acotado', async () => {
  const states = []
  await dispatchBannerRender(source, {
    admin: unusedAdmin,
    matiBase: 'http://mati:4000', matiBannerUrl: 'http://mati:4000/api/generar-banner',
    fetchImpl: async () => new Response('payload inválido', {status: 400}),
    persistRenderState: async (status, metadata) => states.push({status, metadata}),
  })
  assert.equal(states.length, 1)
  assert.equal(states[0].status, 'failed')
  assert.match(states[0].metadata.banner_render_error, /HTTP 400/u)
})

test('no declara rendered si el job no devuelve persistencia privada', async () => {
  const states = []
  let call = 0
  await dispatchBannerRender(source, {
    admin: unusedAdmin,
    matiBase: 'http://mati:4000', matiBannerUrl: 'http://mati:4000/api/generar-banner',
    fetchImpl: async () => {
      call++
      return call === 1
        ? new Response(JSON.stringify({jobId: 'job-1'}), {status: 202})
        : new Response(JSON.stringify({state: 'completed', result: {fileName: 'local.png'}}), {status: 200})
    },
    sleep: async () => {},
    persistRenderState: async (status, metadata) => states.push({status, metadata}),
  })
  assert.deepEqual(states.map(state => state.status), ['rendering', 'failed'])
  assert.match(states[1].metadata.banner_render_error, /Drive/u)
})
