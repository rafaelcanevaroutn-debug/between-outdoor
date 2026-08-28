import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchAdminCarruselGeneration, resolveMesAnio } from '../lib/admin-generation/dispatch-carrusel.ts'

const salida = { destino: 'Tilcara', fecha_inicio: '2026-12-15', carpeta_fotos_nombre: 'material/tilcara' }
const params = { salida, niche: 'trekking', clientName: 'Between', clientOnboarding: null }

function fakeGenerators(calls) {
  return {
    generateAdaptiveCarrusel: async p => { calls.push({ name: 'adaptive', p }); return { angulo: 'x', slides: [] } },
    generateCarruselPromo: async (s, variante, carpeta) => { calls.push({ name: 'promo', s, variante, carpeta }); return { variante, slides: [] } },
  }
}

test('rutea variantes promo con la salida y la carpeta de fotos, sin pasar por el adaptativo', async () => {
  const calls = []
  const result = await dispatchAdminCarruselGeneration('promo_cta', params, fakeGenerators(calls))
  assert.equal(result.ok, true)
  assert.equal(calls[0].name, 'promo')
  assert.equal(calls[0].variante, 'promo_cta')
  assert.equal(calls[0].carpeta, 'material/tilcara')
})

test('rutea formatos adaptativos calculando mesAnio y objetivo por defecto convertir', async () => {
  const calls = []
  const result = await dispatchAdminCarruselGeneration('organico', params, fakeGenerators(calls))
  assert.equal(result.ok, true)
  assert.equal(calls[0].name, 'adaptive')
  assert.equal(calls[0].p.objetivo, 'convertir')
  assert.equal(calls[0].p.mesAnio, resolveMesAnio(salida.fecha_inicio))
  assert.equal(calls[0].p.carpeta, 'material/tilcara')
})

test('respeta un objetivoInteraccion válido explícito', async () => {
  const calls = []
  await dispatchAdminCarruselGeneration('lugar', { ...params, objetivoInteraccion: 'guardar' }, fakeGenerators(calls))
  assert.equal(calls[0].p.objetivo, 'guardar')
})

test('rechaza un formato inválido sin llamar a ningún generador', async () => {
  const calls = []
  const result = await dispatchAdminCarruselGeneration('editorial', params, fakeGenerators(calls))
  assert.equal(result.ok, false)
  assert.equal(calls.length, 0)
})

test('resolveMesAnio no inventa una fecha cuando fecha_inicio es inválida', () => {
  assert.equal(resolveMesAnio('no-es-una-fecha'), 'sin fecha')
})
