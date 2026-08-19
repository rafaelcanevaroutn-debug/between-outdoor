import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {bannerCommercialFormFromSalida, bannerCommercialPayload} from '../lib/banner-commercial-form.ts'

test('serializa cupos, financiación y paquete de agencia sin inventar campos vacíos', () => {
  const payload = bannerCommercialPayload({
    ...bannerCommercialFormFromSalida(),
    cupos_totales: '12', cupos_disponibles: '5', precio_desde: true,
    cuotas_maximas: '6', sin_interes: true, descripcion_financiacion: '6 cuotas verificadas',
    noches: '8', alojamiento: 'Hotel 4 estrellas', regimen: 'Media pensión',
    aereos_incluidos: true, traslados_incluidos: true,
  })
  assert.equal(payload.cupos_totales, 12)
  assert.equal(payload.cupos_disponibles, 5)
  assert.deepEqual(payload.financiacion, {cuotas_maximas: 6, sin_interes: true, descripcion_verificada: '6 cuotas verificadas'})
  assert.deepEqual(payload.detalles_agencia, {
    noches: 8, alojamiento: 'Hotel 4 estrellas', regimen: 'Media pensión',
    aereos_incluidos: true, traslados_incluidos: true,
  })
})

test('campos comerciales vacíos persisten null y no objetos ambiguos', () => {
  const payload = bannerCommercialPayload(bannerCommercialFormFromSalida())
  assert.deepEqual(payload, {cupos_totales: null, cupos_disponibles: null, precio_desde: false, financiacion: null, detalles_agencia: null})
})

test('rechaza disponibilidad incoherente y números inválidos antes de guardar', () => {
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), cupos_totales: '10', cupos_disponibles: '11'}), /no puede superar/u)
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), noches: '1.5'}), /entero positivo/u)
})

test('crear y editar salida exponen y persisten el mismo contrato comercial', () => {
  const edit = fs.readFileSync(new URL('../components/salidas/SalidaEditForm.tsx', import.meta.url), 'utf8')
  const create = fs.readFileSync(new URL('../app/(dashboard)/salidas/nueva/page.tsx', import.meta.url), 'utf8')
  for (const source of [edit, create]) {
    assert.match(source, /CommercialBannerFields/u)
    assert.match(source, /bannerCommercialPayload\(commercial\)/u)
  }
})
