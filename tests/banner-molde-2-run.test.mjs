import test from 'node:test'
import assert from 'node:assert/strict'
import { runBannerMolde2 } from '../lib/generators/banner-molde-2-run.ts'

const baseSalida = {
  destino: 'Tilcara, Jujuy',
  nombre: 'Travesía Tilcara a Calilegua',
  fecha_inicio: '2026-12-15',
}

const fichaResult5 = {
  formato: 'video', familia: '5',
  lugar: 'Sendero Laguna de los Tres',
  datos: [
    { etiqueta: 'distancia', valor: '26 km i/v' },
    { etiqueta: 'desnivel', valor: '1000 m' },
    { etiqueta: 'dificultad', valor: 'Alta' },
  ],
  tipografia_id: 'Montserrat',
  duracion_estimada_segundos: 7,
  metadata: { inputTokens: 100, outputTokens: 50, clipDurationSeconds: 15, knowledgeFile: 'video_ficha.md' },
}

const baseParams = {
  salida: baseSalida,
  niche: 'trekking',
  clientName: 'Between',
  clientOnboarding: null,
  tipografiasPermitidas: ['Montserrat'],
  canalesHabilitados: [],
  lugarMaxCharacters: 40,
  fechaMaxCharacters: 30,
  ctaMaxCharacters: 40,
}

test('engancha generateVideoFamilia5 + generateBannerCtaSuave con el compositor del PR #14', async () => {
  let ctaCalledWith = null
  const result = await runBannerMolde2({
    ...baseParams,
    generateFicha: async () => fichaResult5,
    generateCta: async params => { ctaCalledWith = params; return { cta: 'Guardalo para tu próxima salida', inputTokens: 1, outputTokens: 1 } },
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.content.contentKind, 'banner/molde-2')
  assert.equal(result.content.cta, 'Guardalo para tu próxima salida')
  assert.deepEqual(result.content.ficha, fichaResult5.datos)
  assert.equal(ctaCalledWith.maxCharacters, 40)
})

test('propaga el error del compositor si el CTA generado no pasa el patrón suave', async () => {
  const result = await runBannerMolde2({
    ...baseParams,
    generateFicha: async () => fichaResult5,
    generateCta: async () => ({ cta: 'Un día especial para todos', inputTokens: 1, outputTokens: 1 }),
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /compartir, guardar o elegir/u)
})
