import test from 'node:test'
import assert from 'node:assert/strict'
import { runBannerMolde1 } from '../lib/generators/banner-molde-1-run.ts'

const baseSalida = {
  destino: 'Tilcara',
  nombre: 'Travesía Tilcara a Calilegua',
  fecha_inicio: '2026-12-15',
}

const fakeConvocatoria = {
  formato: 'video', familia: '4',
  copy: 'Vamos a Tilcara. ¿Te sumás? Escribinos por Instagram.',
  dato_duro: 'USD 500',
  tipografia_id: 'Montserrat',
  duracion_estimada_segundos: 5,
  metadata: { inputTokens: 10, outputTokens: 5, clipDurationSeconds: 15, knowledgeFile: '', maxCharacters: 171 },
}

const fakeItems = { items: ['Llevá agua', 'Salí temprano'], inputTokens: 5, outputTokens: 3 }

const baseParams = {
  salida: baseSalida,
  niche: 'trekking',
  clientName: 'Between',
  clientOnboarding: null,
  tipografiasPermitidas: ['Montserrat'],
  canalesHabilitados: ['instagram'],
  copyMaxCharacters: 80,
  lugarMaxCharacters: 40,
  fechaMaxCharacters: 30,
  itemMaxCharacters: 30,
}

test('engancha generateVideoFamilia4 (copy, dato_duro descartado) + generateBannerMolde1Items con el compositor del PR #14', async () => {
  let convocatoriaCalledWith = null
  let itemsCalledWith = null
  const result = await runBannerMolde1({
    ...baseParams,
    generateConvocatoria: async params => { convocatoriaCalledWith = params; return fakeConvocatoria },
    generateItems: async params => { itemsCalledWith = params; return fakeItems },
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.content.contentKind, 'banner/molde-1')
  assert.equal(result.content.copy, fakeConvocatoria.copy)
  assert.deepEqual(result.content.items, fakeItems.items)
  assert.equal(result.content.typographyId, 'Montserrat')
  assert.equal(convocatoriaCalledWith.salida, baseSalida)
  assert.equal(itemsCalledWith.salida, baseSalida)
  // dato_duro nunca llega al contenido — se descarta, es "Familia 4 sin dato_duro"
  assert.equal('dato_duro' in result.content, false)
})

test('si el compositor rechaza (ej. copy sin identidad), el orquestador propaga el error, no lo esconde', async () => {
  const result = await runBannerMolde1({
    ...baseParams,
    generateConvocatoria: async () => ({ ...fakeConvocatoria, copy: 'Vamos de viaje. ¿Te sumás?' }),
    generateItems: async () => fakeItems,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /no identifica el destino/u)
})
