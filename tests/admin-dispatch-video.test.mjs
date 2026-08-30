import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchAdminVideoGeneration } from '../lib/admin-generation/dispatch-video.ts'

const common = {
  salida: { destino: 'Tilcara', fecha_inicio: '2026-12-15' },
  niche: 'trekking',
  clientName: 'Between',
  clientOnboarding: null,
  tipografiasPermitidas: ['Inter'],
}

function fakeGenerators(calls) {
  const record = name => async params => { calls.push({ name, params }); return { fake: name } }
  return {
    generateVideoFamilia1a: record('1a'),
    generateVideoFamilia1b: record('1b'),
    generateVideoFamilia1c: record('1c'),
    generateVideoFamilia2: record('2'),
    generateVideoFamilia3: record('3'),
    generateVideoFamilia4: record('4'),
    generateVideoFamilia5: record('5'),
  }
}

test('rutea 1a directo, sin agregar subfamilia al payload', async () => {
  const calls = []
  const result = await dispatchAdminVideoGeneration('1a', common, { canalesHabilitados: [] }, fakeGenerators(calls))
  assert.equal(calls[0].name, '1a')
  assert.equal(calls[0].params.subfamilia, undefined)
  assert.equal(result.stubUnknownOrigin, false)
})

for (const subfamilia of ['1b', '2a', '2b', '2c', '3a', '3b', '3c', '3d', '3e']) {
  test(`rutea ${subfamilia} al generador de su familia con subfamilia en el payload`, async () => {
    const calls = []
    const result = await dispatchAdminVideoGeneration(subfamilia, common, { canalesHabilitados: [] }, fakeGenerators(calls))
    const expectedFamily = subfamilia === '1b' ? '1b' : subfamilia.startsWith('2') ? '2' : '3'
    assert.equal(calls[0].name, expectedFamily)
    assert.equal(calls[0].params.subfamilia, subfamilia)
    assert.equal(result.stubUnknownOrigin, false)
  })
}

test('rutea 1c al stub y marca stubUnknownOrigin — origen no confirmado', async () => {
  const calls = []
  const result = await dispatchAdminVideoGeneration('1c', common, { canalesHabilitados: [] }, fakeGenerators(calls))
  assert.equal(calls[0].name, '1c')
  assert.equal(calls[0].params.subfamilia, '1c')
  assert.equal(result.stubUnknownOrigin, true)
})

test('rutea 4 y 5 pasando publicationDate y canalesHabilitados', async () => {
  const calls = []
  await dispatchAdminVideoGeneration('4', common, { publicationDate: '2026-08-20', canalesHabilitados: ['WhatsApp'] }, fakeGenerators(calls))
  assert.equal(calls[0].name, '4')
  assert.equal(calls[0].params.publicationDate, '2026-08-20')
  assert.deepEqual(calls[0].params.canalesHabilitados, ['WhatsApp'])

  const calls5 = []
  await dispatchAdminVideoGeneration('5', common, { canalesHabilitados: ['WhatsApp'] }, fakeGenerators(calls5))
  assert.equal(calls5[0].name, '5')
})
