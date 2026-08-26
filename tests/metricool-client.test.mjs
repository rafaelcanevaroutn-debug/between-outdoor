import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMetricoolApiUrl,
  createMetricoolScheduledPost,
  getMetricoolScheduledPost,
  listMetricoolScheduledPosts,
  metricoolConfigFromEnv,
  metricoolPublicationState,
  normalizeMetricoolMediaUrl,
} from '../lib/metricool.ts'

const config = {token: 'secret-token', userId: 123, blogId: 456}

test('carga credenciales sin defaults ni token en la URL', () => {
  assert.deepEqual(metricoolConfigFromEnv({METRICOOL_API_TOKEN: ' token ', METRICOOL_USER_ID: '123', METRICOOL_BLOG_ID: '456'}), {token: 'token', userId: 123, blogId: 456})
  assert.throws(() => metricoolConfigFromEnv({}), /requiere/u)
  const url = buildMetricoolApiUrl('/v2/scheduler/posts', config)
  assert.equal(url.origin, 'https://app.metricool.com')
  assert.equal(url.searchParams.get('userId'), '123')
  assert.equal(url.searchParams.get('blogId'), '456')
  assert.equal(url.href.includes('secret-token'), false)
})

test('consulta el calendario en modo lectura con autenticación oficial', async () => {
  let request
  const result = await listMetricoolScheduledPosts({
    config,
    query: {start: '2026-08-01T00:00:00-03:00', end: '2026-08-31T23:59:59-03:00', timezone: 'America/Argentina/Tucuman'},
    fetchImpl: async (url, init) => {
      request = {url: String(url), init}
      return new Response(JSON.stringify({data: []}), {status: 200, headers: {'content-type': 'application/json'}})
    },
  })
  assert.deepEqual(result, {data: []})
  assert.equal(request.init.method, 'GET')
  assert.equal(request.init.headers['X-Mc-Auth'], 'secret-token')
  assert.match(request.url, /\/v2\/scheduler\/posts/u)
  assert.match(request.url, /timezone=America%2FArgentina%2FTucuman/u)
})

test('falla cerrado ante rutas, rangos y respuestas inválidas', async () => {
  assert.throws(() => buildMetricoolApiUrl('https://evil.test', config), /Ruta/u)
  await assert.rejects(() => listMetricoolScheduledPosts({config, query: {start: '2026-09-01', end: '2026-08-01', timezone: 'UTC'}, fetchImpl: fetch}), /Rango/u)
  await assert.rejects(() => listMetricoolScheduledPosts({config, query: {start: '2026-08-01', end: '2026-08-02', timezone: 'UTC'}, fetchImpl: async () => new Response('error', {status: 401})}), /HTTP 401/u)
})

test('crea borradores con jobId idempotente y sin exponer el token', async () => {
  let request
  const result = await createMetricoolScheduledPost({
    config,
    idempotencyKey: 'between_job_12345678',
    post: {
      publicationDate: {dateTime: '2026-09-01T10:00:00', timezone: 'America/Argentina/Buenos_Aires'},
      text: 'Copy listo',
      providers: [{network: 'instagram'}],
      media: ['https://between.example/media/1'],
      autoPublish: false,
      draft: true,
    },
    fetchImpl: async (url, init) => {
      request = {url: String(url), init}
      return new Response(JSON.stringify({data: {id: 99, uuid: 'post-uuid'}}), {status: 200})
    },
  })
  assert.equal(result.id, 99)
  assert.match(request.url, /jobId=between_job_12345678/u)
  assert.equal(request.url.includes('secret-token'), false)
  assert.equal(request.init.headers['X-Mc-Auth'], 'secret-token')
  assert.equal(JSON.parse(request.init.body).draft, true)
})

test('normaliza la multimedia pública antes de programarla', async () => {
  const result = await normalizeMetricoolMediaUrl({
    config,
    publicUrl: 'https://between.example/media/1',
    fetchImpl: async url => {
      assert.match(String(url), /actions\/normalize\/image\/url/u)
      assert.match(String(url), /url=https%3A%2F%2Fbetween.example%2Fmedia%2F1/u)
      return new Response(JSON.stringify({data: {url: 'https://metricool.example/normalized/1'}}), {status: 200})
    },
  })
  assert.equal(result, 'https://metricool.example/normalized/1')
  await assert.rejects(() => normalizeMetricoolMediaUrl({config, publicUrl: 'http://localhost/media'}), /HTTPS/u)
})

test('consulta una publicación y traduce sus estados al modelo de Between', async () => {
  const post = await getMetricoolScheduledPost({
    config,
    postId: 99,
    fetchImpl: async url => {
      assert.match(String(url), /\/v2\/scheduler\/posts\/99/u)
      return new Response(JSON.stringify({data: {id: 99, providers: [{network: 'instagram', status: 'PENDING'}]}}), {status: 200})
    },
  })
  assert.equal(post.id, 99)
  assert.equal(metricoolPublicationState(post), 'scheduled')
  assert.equal(metricoolPublicationState({draft: true, providers: [{status: 'DRAFT'}]}), 'draft')
  assert.equal(metricoolPublicationState({providers: [{status: 'PUBLISHED'}, {status: 'PUBLISHED'}]}), 'published')
  assert.equal(metricoolPublicationState({providers: [{status: 'ERROR'}]}), 'failed')
})
