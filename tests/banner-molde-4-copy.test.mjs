import test from 'node:test'
import assert from 'node:assert/strict'

import {generateBannerMolde4Copy} from '../lib/generators/banner-molde-4-copy.ts'
import {validateBannerMolde4Copy} from '../lib/generators/banner-molde-4-contract.ts'
import {runBannerMolde4} from '../lib/generators/banner-molde-4-run.ts'

const base = {
  user_id: 'u1', nombre: 'Salida', destino: 'Tilcara', pais_codigo: 'AR', fecha_inicio: '2027-12-06', fecha_fin: '2027-12-08',
  precio_usd: 420, sena_usd: null, nivel: 'media', cupos: 8, link_inscripcion: null, tipo_viaje: 'grupal', itinerario: null,
  itinerario_dias: [], puntos_interes: [], que_incluye: null, que_no_incluye: null, estado: 'activa', moneda: 'USD', dias_semana: null,
}
const salidas = [
  {...base, id: 's1'},
  {...base, id: 's2', destino: 'Ushuaia', fecha_inicio: '2028-02-08', precio_usd: 1200, precio_desde: true},
]

test('genera cronograma determinístico con lugar, fecha y precio literales', () => {
  const content = generateBannerMolde4Copy({salidas, typographyId: 'Inter'})
  assert.equal(content.titulo, 'Próximas salidas')
  assert.deepEqual(content.salidas, [
    {lugar: 'Tilcara', fecha: '6 de diciembre', precio: 'US$ 420'},
    {lugar: 'Ushuaia', fecha: '8 de febrero', precio: 'Desde US$ 1.200'},
  ])
  assert.equal(content.cta, 'Guardá las fechas')
})

test('rechaza CTA con apariencia de botón de landing', () => {
  assert.throws(
    () => generateBannerMolde4Copy({salidas, typographyId: 'Inter', cta: 'Quiero viajar'}),
    /botón de landing/u,
  )
})

test('validador rechaza cualquier precio, fecha, lugar u orden alterado', () => {
  const content = generateBannerMolde4Copy({salidas, typographyId: 'Inter'})
  for (const changed of [
    {...content, salidas: [{...content.salidas[0], precio: 'US$ 999'}, content.salidas[1]]},
    {...content, salidas: [{...content.salidas[0], fecha: '7 de diciembre'}, content.salidas[1]]},
    {...content, salidas: [content.salidas[1], content.salidas[0]]},
  ]) {
    assert.ok(validateBannerMolde4Copy({content: changed, salidas}).some(error => error.includes('no coincide')))
  }
})

test('rechaza menos de dos, más de cuatro y la misma salida repetida', () => {
  assert.equal(runBannerMolde4({salidas: [salidas[0]], typographyId: 'Inter'}).ok, false)
  assert.equal(runBannerMolde4({salidas: [...salidas, {...base, id: 's3'}, {...base, id: 's4'}, {...base, id: 's5'}], typographyId: 'Inter'}).ok, false)
  const duplicated = runBannerMolde4({salidas: [salidas[0], salidas[0]], typographyId: 'Inter'})
  assert.equal(duplicated.ok, false)
  if (!duplicated.ok) assert.match(duplicated.error, /repetida/u)
})

test('no importa ni llama a Gemini u OpenAI', async () => {
  const source = await import('node:fs').then(fs => fs.readFileSync(new URL('../lib/generators/banner-molde-4-copy.ts', import.meta.url), 'utf8'))
  assert.doesNotMatch(source, /gemini|openai|generateWithRetry/iu)
})
