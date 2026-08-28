import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchAdminBannerGeneration } from '../lib/admin-generation/dispatch-banner.ts'

const common = {
  salida: { destino: 'Tilcara', nombre: 'Travesía Tilcara', fecha_inicio: '2026-12-15' },
  niche: 'trekking',
  clientName: 'Between',
  clientOnboarding: null,
  tipografiasPermitidas: ['Inter'],
  canalesHabilitados: ['WhatsApp'],
}

const caps = { copyMaxCharacters: 96, lugarMaxCharacters: 32, fechaMaxCharacters: 28, itemMaxCharacters: 36 }

function fakeGenerators(calls) {
  return {
    runBannerMolde1: async params => { calls.push({ name: 'molde1', params }); return { ok: true, content: { contentKind: 'banner/molde-1' } } },
    generateBannerMolde1Copy: async () => ({ copy: 'x', typographyId: 'Inter', inputTokens: 1, outputTokens: 1 }),
    generateBannerMolde1Items: async () => ({ items: ['a', 'b'], inputTokens: 1, outputTokens: 1 }),
    runBannerMolde2: async params => { calls.push({ name: 'molde2', params }); return { ok: true, content: { contentKind: 'banner/molde-2' } } },
    generateVideoFamilia5: async () => ({}),
    generateBannerCtaSuave: async () => ({ cta: 'x', inputTokens: 1, outputTokens: 1 }),
    buildBannerMolde3: params => { calls.push({ name: 'molde3', params }); return { contentKind: 'banner/molde-3' } },
    buildBannerMolde5: params => { calls.push({ name: 'molde5', params }); return { contentKind: 'banner/molde-5' } },
    runBannerMolde6: async params => { calls.push({ name: 'molde6', params }); return { ok: true, content: { contentKind: 'banner/molde-6' } } },
    generateVideoFamilia3: async () => ({}),
    generateBannerMolde6Convocatoria: async () => ({ convocatoria: 'x', inputTokens: 1, outputTokens: 1 }),
  }
}

test('rutea molde 1 con los caps mapeados y los generadores inyectados', async () => {
  const calls = []
  const generators = fakeGenerators(calls)
  const result = await dispatchAdminBannerGeneration(1, common, { caps }, generators)
  assert.equal(result.ok, true)
  assert.equal(calls[0].name, 'molde1')
  assert.equal(calls[0].params.copyMaxCharacters, 96)
  assert.equal(calls[0].params.generateCopy, generators.generateBannerMolde1Copy)
  assert.equal(calls[0].params.generateItems, generators.generateBannerMolde1Items)
})

test('rutea molde 2 con caps propios', async () => {
  const calls = []
  const result = await dispatchAdminBannerGeneration(2, common, { caps }, fakeGenerators(calls))
  assert.equal(result.ok, true)
  assert.equal(calls[0].params.lugarMaxCharacters, 40)
})

test('rutea molde 3 y 5 a los builders sin IA, con CTA por defecto si no se pasa', async () => {
  const calls = []
  const generators = fakeGenerators(calls)
  const result3 = await dispatchAdminBannerGeneration(3, common, { caps }, generators)
  assert.equal(result3.ok, true)
  assert.equal(calls[0].params.cta, 'Consultá tu lugar')

  const result5 = await dispatchAdminBannerGeneration(5, common, { caps, cta: 'Pedí info' }, generators)
  assert.equal(result5.ok, true)
  assert.equal(calls[1].params.cta, 'Pedí info')
})

test('rutea molde 6 al generador de convocatoria', async () => {
  const calls = []
  const result = await dispatchAdminBannerGeneration(6, common, { caps }, fakeGenerators(calls))
  assert.equal(result.ok, true)
  assert.equal(calls[0].name, 'molde6')
})

test('propaga el error del compositor sin esconderlo', async () => {
  const generators = fakeGenerators([])
  generators.runBannerMolde1 = async () => ({ ok: false, error: 'copy no identifica el destino' })
  const result = await dispatchAdminBannerGeneration(1, common, { caps }, generators)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /no identifica el destino/u)
})

test('molde 3 propaga el mensaje de un builder que tira', async () => {
  const generators = fakeGenerators([])
  generators.buildBannerMolde3 = () => { throw new Error('faltan datos comerciales') }
  const result = await dispatchAdminBannerGeneration(3, common, { caps }, generators)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /faltan datos comerciales/u)
})
