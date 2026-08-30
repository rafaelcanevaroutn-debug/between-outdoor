import assert from 'node:assert/strict'
import test from 'node:test'
import {createJiti} from 'jiti'

const jiti = createJiti(import.meta.url, {alias: {'@': process.cwd()}})
const {buildEmergencyVideoFamilia3} = await jiti.import('../lib/generators/video-familia-3.ts')

const salida = {
  id: 'salida-1',
  destino: 'Tucumán',
  nombre: 'Caminatas semanales',
  fecha_inicio: '2026-09-01',
  fecha_fin: '2026-09-01',
}

const onboarding = {
  campaign_context: {
    content_profile: 'grupo_recurrente_local',
    territorio: 'Tucumán',
    actividad: 'trekking',
    content_axis: 'comunidad',
  },
}

test('recupera un video conversacional local sin llamar a IA', () => {
  const piece = buildEmergencyVideoFamilia3({
    subfamilia: '3d',
    salida,
    niche: 'trekking',
    clientName: 'Cliente',
    clientOnboarding: onboarding,
    tipografiasPermitidas: ['Inter'],
    rotationIndex: 1,
  })
  assert.equal(piece.formato, 'video')
  assert.equal(piece.subfamilia, '3d')
  assert.equal(piece.copy.split('\n').length, 2)
  assert.equal(piece.metadata.inputTokens, 0)
})

test('recupera una familia genérica manteniendo el formato de video', () => {
  const piece = buildEmergencyVideoFamilia3({
    subfamilia: '3b',
    salida,
    niche: 'trekking',
    clientName: 'Cliente',
    clientOnboarding: null,
    tipografiasPermitidas: ['Montserrat'],
  })
  assert.match(piece.copy, /^POV: /u)
})
