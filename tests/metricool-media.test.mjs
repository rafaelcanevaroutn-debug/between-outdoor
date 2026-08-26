import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

import {
  buildMetricoolMediaUrl,
  signMetricoolMedia,
  verifyMetricoolMediaSignature,
} from '../lib/metricool-media.ts'
import {dateTimeInZone, metricoolCaption} from '../lib/metricool-server.ts'

const contentId = '123e4567-e89b-12d3-a456-426614174000'
const env = {
  METRICOOL_MEDIA_SIGNING_SECRET: 'a-secret-with-more-than-thirty-two-characters',
  BETWEEN_PUBLIC_APP_URL: 'https://app.between.example',
}

test('firma URLs multimedia estables y rechaza alteraciones', () => {
  const signature = signMetricoolMedia(contentId, 2, env)
  assert.equal(signature.length, 64)
  assert.equal(verifyMetricoolMediaSignature(contentId, 2, signature, env), true)
  assert.equal(verifyMetricoolMediaSignature(contentId, 1, signature, env), false)

  const url = new URL(buildMetricoolMediaUrl({contentId, index: 2, env}))
  assert.equal(url.origin, 'https://app.between.example')
  assert.equal(url.pathname, `/api/metricool/media/${contentId}/2`)
  assert.equal(url.searchParams.get('signature'), signature)
})

test('el puente multimedia exige dominio HTTPS y secreto fuerte', () => {
  assert.throws(() => buildMetricoolMediaUrl({contentId, index: 0, env: {...env, BETWEEN_PUBLIC_APP_URL: 'http://localhost:3001'}}), /HTTPS/u)
  assert.throws(() => signMetricoolMedia(contentId, 0, {...env, METRICOOL_MEDIA_SIGNING_SECRET: 'short'}), /32/u)
})

test('compone el copy y convierte la fecha a la zona del cliente', () => {
  assert.equal(metricoolCaption({
    titulo: 'Título',
    subtitulo: 'Bajada',
    bullets: ['Dato uno'],
    cta: 'Reservá',
    descripcion_post: null,
  }), 'Título\n\nBajada\n\nDato uno\n\nReservá')
  assert.equal(dateTimeInZone(new Date('2026-08-25T13:30:00Z'), 'America/Argentina/Buenos_Aires'), '2026-08-25T10:30:00')
})

test('la migración persiste conexión e idempotencia sin guardar el token', async () => {
  const sql = await readFile(new URL('../supabase/migrations/030_metricool_publications.sql', import.meta.url), 'utf8')
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.metricool_connections/u)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.content_publications/u)
  assert.match(sql, /idempotency_key text NOT NULL UNIQUE/u)
  assert.doesNotMatch(sql, /api_token|user_token/u)
})
