import test from 'node:test'
import assert from 'node:assert/strict'

import {buildMetricoolApiUrl, listMetricoolScheduledPosts, metricoolConfigFromEnv} from '../lib/metricool.ts'

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
