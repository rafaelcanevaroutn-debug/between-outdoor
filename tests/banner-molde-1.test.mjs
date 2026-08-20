import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBannerMolde1, validateBannerMolde1Copy } from '../lib/generators/banner-molde-1.ts'

const baseSalida = {
  destino: 'Tilcara',
  nombre: 'Travesía Tilcara a Calilegua',
  fecha_inicio: '2026-12-15',
}

const baseParams = {
  salida: baseSalida,
  typographyId: 'Montserrat',
  copy: 'Vamos a Tilcara. ¿Te sumás? Escribinos por Instagram.',
  items: ['Llevá agua', 'Salí temprano'],
  copyMaxCharacters: 80,
  lugarMaxCharacters: 40,
  fechaMaxCharacters: 30,
  itemMaxCharacters: 30,
}

test('compone lugar, fecha, copy validado (identidad + convocatoria) e items, sin generar texto propio', () => {
  const result = buildBannerMolde1(baseParams)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.content.contentKind, 'banner/molde-1')
  assert.equal(result.content.lugar, 'Tilcara')
  assert.equal(result.content.fecha, '15 de diciembre')
  assert.equal(result.content.copy, baseParams.copy)
  assert.deepEqual(result.content.items, ['Llevá agua', 'Salí temprano'])
})

test('rechaza copy que no identifica el destino real, mismo patrón que Familia 4', () => {
  const result = buildBannerMolde1({ ...baseParams, copy: 'Vamos de viaje. ¿Te sumás?' })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /no identifica el destino/u)
})

test('rechaza copy sin verbo de convocatoria', () => {
  const result = buildBannerMolde1({ ...baseParams, copy: 'Tilcara es un lugar hermoso.' })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /convocatoria/u)
})

test('rechaza copy con dato comercial — eso es Familia 4, no Molde 1', () => {
  const result = buildBannerMolde1({ ...baseParams, copy: 'Vamos a Tilcara por USD 500. ¿Te sumás?' })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /dato comercial/u)
})

test('el generador no puede mencionar WhatsApp si no está habilitado', () => {
  const errors = validateBannerMolde1Copy({
    copy: 'Vamos a Tilcara. ¿Te sumás? Escribinos por WhatsApp.',
    salida: baseSalida,
    maxCharacters: 80,
    canalesHabilitados: ['Instagram'],
  })
  assert.deepEqual(errors, ['copy usa WhatsApp pero el canal no está habilitado'])
})

test('el generador acepta MP cuando Instagram está habilitado', () => {
  const errors = validateBannerMolde1Copy({
    copy: 'Vamos a Tilcara. ¿Te sumás? Escribinos por MP.',
    salida: baseSalida,
    maxCharacters: 80,
    canalesHabilitados: ['Instagram'],
  })
  assert.deepEqual(errors, [])
})

test('rechaza copy que supera el cap de banner por ancho', () => {
  const result = buildBannerMolde1({ ...baseParams, copyMaxCharacters: 10 })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /copy no pasa el cap/u)
})

test('exige entre 2 y 3 ítems — ni menos ni un listado largo', () => {
  const tooFew = buildBannerMolde1({ ...baseParams, items: ['Llevá agua'] })
  assert.equal(tooFew.ok, false)
  const tooMany = buildBannerMolde1({ ...baseParams, items: ['Uno', 'Dos', 'Tres', 'Cuatro'] })
  assert.equal(tooMany.ok, false)
  const justRight = buildBannerMolde1({ ...baseParams, items: ['Uno', 'Dos', 'Tres'] })
  assert.equal(justRight.ok, true)
})

test('rechaza ítems duplicados', () => {
  const result = buildBannerMolde1({ ...baseParams, items: ['Llevá agua', 'llevá   agua'] })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /duplicados/u)
})

test('rechaza un ítem con dato comercial', () => {
  const result = buildBannerMolde1({ ...baseParams, items: ['Llevá agua', 'Reservá tu lugar'] })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /dato comercial/u)
})

test('rechaza un ítem que supera el cap de banner', () => {
  const result = buildBannerMolde1({ ...baseParams, itemMaxCharacters: 5 })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /ítem no pasa el cap/u)
})

test('sin destino ni nombre verificado, falla explícito', () => {
  const result = buildBannerMolde1({ ...baseParams, salida: { ...baseSalida, destino: '', nombre: '' } })
  assert.equal(result.ok, false)
})

test('fecha_inicio inválida falla explícito', () => {
  const result = buildBannerMolde1({ ...baseParams, salida: { ...baseSalida, fecha_inicio: 'no-es-una-fecha' } })
  assert.equal(result.ok, false)
})
