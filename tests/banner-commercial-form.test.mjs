import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {bannerCommercialFormFromSalida, bannerCommercialPayload} from '../lib/banner-commercial-form.ts'

test('serializa cupos, financiación y paquete de agencia sin inventar campos vacíos', () => {
  const payload = bannerCommercialPayload({
    ...bannerCommercialFormFromSalida(),
    cupos_totales: '12', cupos_disponibles: '5', precio_desde: true,
    precio_anterior: '3400', descuento_porcentaje: '14.7', precio_efectivo: '2750', promo_vigencia_hasta: '2027-02-28',
    cuotas_maximas: '6', sin_interes: true, descripcion_financiacion: '6 cuotas verificadas',
    noches: '8', alojamiento: 'Hotel 4 estrellas', regimen: 'Media pensión',
    aereos_incluidos: true, traslados_incluidos: true,
  })
  assert.equal(payload.cupos_totales, 12)
  assert.equal(payload.cupos_disponibles, 5)
  assert.equal(payload.precio_anterior, 3400)
  assert.equal(payload.descuento_porcentaje, 14.7)
  assert.equal(payload.precio_efectivo, 2750)
  assert.equal(payload.promo_vigencia_hasta, '2027-02-28')
  assert.deepEqual(payload.financiacion, {cuotas_maximas: 6, sin_interes: true, descripcion_verificada: '6 cuotas verificadas'})
  assert.deepEqual(payload.detalles_agencia, {
    noches: 8, alojamiento: 'Hotel 4 estrellas', regimen: 'Media pensión',
    aereos_incluidos: true, traslados_incluidos: true,
  })
})

test('campos comerciales vacíos persisten null y no objetos ambiguos', () => {
  const payload = bannerCommercialPayload(bannerCommercialFormFromSalida())
  assert.deepEqual(payload, {
    cupos_totales: null, cupos_disponibles: null, precio_desde: false,
    precio_anterior: null, descuento_porcentaje: null, precio_efectivo: null, promo_vigencia_hasta: null,
    financiacion: null, detalles_agencia: null,
  })
})

test('rechaza disponibilidad incoherente y números inválidos antes de guardar', () => {
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), cupos_totales: '10', cupos_disponibles: '11'}), /no puede superar/u)
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), noches: '1.5'}), /entero positivo/u)
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), descuento_porcentaje: '100'}), /menor que 100/u)
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), promo_vigencia_hasta: '2027-02-31'}), /fecha válida/u)
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), precio_anterior: '900'}, {precioActual: 1000}), /mayor que/u)
  assert.throws(() => bannerCommercialPayload({...bannerCommercialFormFromSalida(), precio_efectivo: '1100'}, {precioActual: 1000}), /menor que/u)
})

test('hidrata promociones existentes sin calcular campos ausentes', () => {
  const form = bannerCommercialFormFromSalida({precio_anterior: 4200, descuento_porcentaje: null, precio_efectivo: 2800, promo_vigencia_hasta: '2027-03-01'})
  assert.equal(form.precio_anterior, '4200')
  assert.equal(form.descuento_porcentaje, '')
  assert.equal(form.precio_efectivo, '2800')
  assert.equal(form.promo_vigencia_hasta, '2027-03-01')
})

test('crear y editar salida exponen y persisten el mismo contrato comercial', () => {
  const unifiedForm = fs.readFileSync(new URL('../components/salidas/SalidaForm.tsx', import.meta.url), 'utf8')
  assert.match(unifiedForm, /CommercialBannerFields/u)
  assert.match(unifiedForm, /bannerCommercialFormFromSalida\(salida\)/u)
  assert.match(unifiedForm, /bannerCommercialPayload\(commercial, \{/u)
  assert.match(unifiedForm, /\.\.\.commercialPayload/u)
})
