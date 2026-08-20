import test from 'node:test'
import assert from 'node:assert/strict'
import {buildBannerMolde3, buildBannerMolde5, formatVerifiedAvailability} from '../lib/generators/banner-moldes-commercial.ts'

const salida = {
  id: 's1', user_id: 'u1', nombre: 'Cancún completo', destino: 'Riviera Maya', pais_codigo: 'MX',
  fecha_inicio: '2027-03-08', fecha_fin: '2027-03-16', precio_usd: 2900, sena_usd: 200,
  nivel: 'bajo', cupos: 8, cupos_totales: 12, cupos_disponibles: 8, precio_desde: true,
  financiacion: {cuotas_maximas: 6, sin_interes: true}, detalles_agencia: {noches: 8, alojamiento: 'Hotel 4 estrellas', regimen: 'Desayuno + all inclusive', aereos_incluidos: true, traslados_incluidos: true, asistencia_viajero_incluida: true},
  link_inscripcion: null, tipo_viaje: 'grupal', itinerario: null, itinerario_dias: [], puntos_interes: [], que_incluye: null, que_no_incluye: null, estado: 'activa', moneda: 'USD', dias_semana: null,
}

test('Molde 3 usa exclusivamente precio, financiación y cupos verificados', () => {
  const content = buildBannerMolde3({salida, cta: 'Consultá tu lugar', typographyId: 'Inter'})
  assert.equal(content.precio, 'Desde US$ 2.900')
  assert.equal(content.reserva, 'Reserva con US$ 200')
  assert.equal(content.financiacion, 'Hasta 6 cuotas sin interés')
  assert.equal(content.disponibilidad, '8 cupos disponibles')
  assert.throws(() => formatVerifiedAvailability({...salida, cupos_totales: 4}), /inconsistente/u)
})

test('Molde 3 muestra promociones sólo cuando fueron cargadas y nunca las infiere', () => {
  const withoutPromotion = buildBannerMolde3({salida: {...salida, cupos_disponibles: null, cupos: 8}, cta: 'Consultá tu lugar', typographyId: 'Inter'})
  assert.equal(withoutPromotion.precio, 'Desde US$ 2.900')
  assert.equal(withoutPromotion.reserva, 'Reserva con US$ 200')
  assert.doesNotMatch(Object.values(withoutPromotion).join(' '), /OFF|Antes|Efectivo|Promo hasta/u)

  const promoted = buildBannerMolde3({
    salida: {...salida, precio_anterior: 3200, descuento_porcentaje: 10, precio_efectivo: 2700, promo_vigencia_hasta: '2027-03-01'},
    cta: 'Consultá tu lugar', typographyId: 'Inter',
  })
  assert.equal(promoted.precio, 'Desde US$ 2.900 · 10% OFF')
  assert.equal(promoted.reserva, 'Antes US$ 3.200 · Seña US$ 200')
  assert.equal(promoted.financiacion, 'Hasta 6 cuotas sin interés · Efectivo US$ 2.700')
  assert.equal(promoted.disponibilidad, '8 cupos · Promo 1 mar')
})

test('Molde 3 rechaza promociones incoherentes en lugar de recalcularlas', () => {
  const params = {cta: 'Consultá tu lugar', typographyId: 'Inter'}
  assert.throws(() => buildBannerMolde3({...params, salida: {...salida, precio_anterior: 2800}}), /precio_anterior/u)
  assert.throws(() => buildBannerMolde3({...params, salida: {...salida, precio_efectivo: 3000}}), /precio_efectivo/u)
  assert.throws(() => buildBannerMolde3({...params, salida: {...salida, descuento_porcentaje: 100}}), /descuento_porcentaje/u)
})

test('Molde 5 exige el contrato real de agencia y crea iconos semánticos', () => {
  const content = buildBannerMolde5({salida, cta: 'Pedí el itinerario', typographyId: 'PlayfairDisplay'})
  assert.equal(content.noches, '8 noches')
  assert.deepEqual(content.incluye.map(item => item.icon), ['aereos', 'traslados', 'asistencia', 'alojamiento'])
  assert.throws(() => buildBannerMolde5({salida: {...salida, detalles_agencia: null}, cta: 'Pedí el itinerario', typographyId: 'Inter'}), /requiere noches/u)
})
