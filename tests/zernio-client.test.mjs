import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildZernioApiUrl,
  createZernioPost,
  getZernioAccountAnalytics,
  createZernioProfile,
  getZernioConnectUrl,
  listZernioAccounts,
  zernioConfigFromEnv,
  zernioPublicationState,
} from '../lib/zernio.ts'

const config = {apiKey: 'zernio-secret'}

test('carga la API key sin exponerla en la URL', () => {
  assert.deepEqual(zernioConfigFromEnv({ZERNIO_API_KEY: ' key '}), {apiKey: 'key'})
  assert.throws(() => zernioConfigFromEnv({}), /ZERNIO_API_KEY/u)
  const url = buildZernioApiUrl('/profiles')
  assert.equal(url.href, 'https://zernio.com/api/v1/profiles')
  assert.equal(url.href.includes(config.apiKey), false)
  assert.throws(() => buildZernioApiUrl('https://evil.test'), /Ruta/u)
})

test('crea un perfil de cliente con Bearer auth', async () => {
  let request
  const profile = await createZernioProfile({
    config,
    name: 'Renzo principal',
    fetchImpl: async (url, init) => {
      request = {url: String(url), init}
      return new Response(JSON.stringify({profile: {_id: 'profile-1', name: 'Renzo principal'}}), {status: 201})
    },
  })
  assert.equal(profile._id, 'profile-1')
  assert.equal(request.init.headers.Authorization, 'Bearer zernio-secret')
  assert.equal(JSON.parse(request.init.body).name, 'Renzo principal')
})

test('genera OAuth por perfil y lista sólo sus cuentas', async () => {
  const authUrl = await getZernioConnectUrl({
    config,
    platform: 'instagram',
    profileId: 'profile-1',
    redirectUrl: 'https://between.example/api/zernio/callback',
    fetchImpl: async url => {
      assert.match(String(url), /connect\/instagram/u)
      assert.match(String(url), /profileId=profile-1/u)
      return new Response(JSON.stringify({authUrl: 'https://instagram.example/oauth'}), {status: 200})
    },
  })
  assert.equal(authUrl, 'https://instagram.example/oauth')

  const accounts = await listZernioAccounts({
    config,
    profileId: 'profile-1',
    fetchImpl: async url => {
      assert.match(String(url), /profileId=profile-1/u)
      return new Response(JSON.stringify({accounts: [{_id: 'account-1', platform: 'instagram'}]}), {status: 200})
    },
  })
  assert.equal(accounts[0]._id, 'account-1')
})

test('programa en varias cuentas con request id idempotente', async () => {
  let request
  const post = await createZernioPost({
    config,
    requestId: 'between-job-1',
    post: {
      content: 'Salida lista',
      mediaItems: [{type: 'video', url: 'https://between.example/video.mp4'}],
      platforms: [
        {platform: 'instagram', accountId: 'ig-1'},
        {platform: 'tiktok', accountId: 'tk-1'},
      ],
      scheduledFor: '2026-09-01T10:00:00',
      timezone: 'America/Argentina/Buenos_Aires',
    },
    fetchImpl: async (url, init) => {
      request = {url: String(url), init}
      return new Response(JSON.stringify({post: {_id: 'post-1', status: 'scheduled'}}), {status: 201})
    },
  })
  assert.equal(post._id, 'post-1')
  assert.equal(request.init.headers['x-request-id'], 'between-job-1')
  assert.equal(JSON.parse(request.init.body).platforms.length, 2)
  assert.equal(zernioPublicationState('partial'), 'published')
  assert.equal(zernioPublicationState('failed'), 'failed')
})

test('consulta analíticas de una cuenta con rango explícito', async () => {
  let request
  const analytics = await getZernioAccountAnalytics({
    config: {apiKey: 'z_test'},
    accountId: 'account-1',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    fetchImpl: async (url, init) => {
      request = {url: String(url), init}
      return new Response(JSON.stringify({followers: 1200, impressions: 4500}), {status: 200})
    },
  })
  assert.equal(analytics.followers, 1200)
  const url = new URL(request.url)
  assert.equal(url.pathname, '/api/v1/analytics/account/account-1')
  assert.equal(url.searchParams.get('startDate'), '2026-08-01')
  assert.equal(url.searchParams.get('endDate'), '2026-08-31')
  assert.equal(request.init.headers.Authorization, 'Bearer z_test')
})
