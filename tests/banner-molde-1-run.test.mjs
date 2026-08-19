import test from 'node:test'
import assert from 'node:assert/strict'
import { runBannerMolde1 } from '../lib/generators/banner-molde-1-run.ts'

const baseSalida = {
  destino: 'Tilcara',
  nombre: 'Travesía Tilcara a Calilegua',
  fecha_inicio: '2026-12-15',
}

const fakeCopy = {
  copy: 'Vamos a Tilcara. ¿Te sumás? Escribinos por Instagram.',
  typographyId: 'Montserrat',
  inputTokens: 10,
  outputTokens: 5,
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

test('engancha el generador de copy sin dato_duro + items con el compositor del PR #14', async () => {
  let copyCalledWith = null
  let itemsCalledWith = null
  const result = await runBannerMolde1({
    ...baseParams,
    generateCopy: async params => { copyCalledWith = params; return fakeCopy },
    generateItems: async params => { itemsCalledWith = params; return fakeItems },
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.content.contentKind, 'banner/molde-1')
  assert.equal(result.content.copy, fakeCopy.copy)
  assert.deepEqual(result.content.items, fakeItems.items)
  assert.equal(result.content.typographyId, 'Montserrat')
  assert.equal(copyCalledWith.salida, baseSalida)
  assert.equal(copyCalledWith.copyMaxCharacters, baseParams.copyMaxCharacters)
  assert.equal(itemsCalledWith.salida, baseSalida)
  // Molde 1 ya no genera ni descarta dato_duro.
  assert.equal('dato_duro' in result.content, false)
})

test('si el compositor rechaza (ej. copy sin identidad), el orquestador propaga el error, no lo esconde', async () => {
  const result = await runBannerMolde1({
    ...baseParams,
    generateCopy: async () => ({ ...fakeCopy, copy: 'Vamos de viaje. ¿Te sumás?' }),
    generateItems: async () => fakeItems,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /no identifica el destino/u)
})
