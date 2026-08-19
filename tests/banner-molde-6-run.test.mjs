import test from 'node:test'
import assert from 'node:assert/strict'
import { runBannerMolde6 } from '../lib/generators/banner-molde-6-run.ts'

const baseSalida = {
  destino: 'Tilcara',
  nombre: 'Travesía Tilcara a Calilegua',
  fecha_inicio: '2026-12-15',
}

const fakeMensaje = {
  formato: 'video', subfamilia: '3a',
  copy: 'La montaña no te cambia, te muestra quién ya eras.',
  tipografia_id: 'Playfair Display',
  duracion_estimada_segundos: 4,
  metadata: { inputTokens: 20, outputTokens: 10, clipDurationSeconds: 4.5, maxCharacters: 85, knowledgeFile: '' },
}

const baseParams = {
  salida: baseSalida,
  niche: 'trekking',
  clientName: 'Between',
  clientOnboarding: null,
  tipografiasPermitidas: ['Playfair Display'],
  mensajeMaxCharacters: 80,
  convocatoriaMaxCharacters: 60,
}

test('engancha generateVideoFamilia3(3a) + generateBannerMolde6Convocatoria con el compositor del PR #14', async () => {
  let mensajeCalledWith = null
  const result = await runBannerMolde6({
    ...baseParams,
    generateMensaje: async params => { mensajeCalledWith = params; return fakeMensaje },
    generateConvocatoria: async () => ({ convocatoria: 'Sumate al grupo que camina con nosotros.', inputTokens: 1, outputTokens: 1 }),
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.content.contentKind, 'banner/molde-6')
  assert.equal(result.content.mensaje, fakeMensaje.copy)
  assert.equal(result.content.convocatoria, 'Sumate al grupo que camina con nosotros.')
  assert.equal(result.content.typographyId, 'Playfair Display')
  assert.equal(mensajeCalledWith.subfamilia, '3a')
  assert.equal(mensajeCalledWith.salida, baseSalida)
})

test('propaga el error del compositor si la convocatoria inventa urgencia', async () => {
  const result = await runBannerMolde6({
    ...baseParams,
    generateMensaje: async () => fakeMensaje,
    generateConvocatoria: async () => ({ convocatoria: 'Sumate ya, últimos lugares disponibles', inputTokens: 1, outputTokens: 1 }),
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /urgencia/u)
})
