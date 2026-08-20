import test from 'node:test'
import assert from 'node:assert/strict'

import {rebuildBannerContentFromEditableRow} from '../lib/banner-content-insert.ts'

function row(content, overrides = {}) {
  return {
    titulo: null,
    subtitulo: null,
    bullets: [],
    cta: null,
    generation_metadata: {banner_content_contract: content},
    ...overrides,
  }
}

test('reconstruye Molde 2 desde la ficha editada sin recuperar copy viejo', () => {
  const rebuilt = rebuildBannerContentFromEditableRow(row({
    contentKind: 'banner/molde-2', lugar: 'Viejo', fecha: 'Vieja',
    ficha: [{etiqueta: 'distancia', valor: '10 km'}, {etiqueta: 'duración', valor: '2 h'}, {etiqueta: 'dificultad', valor: 'Media'}],
    cta: 'Viejo', typographyId: 'Inter',
  }, {
    titulo: 'Laguna Torre', subtitulo: '12 de enero',
    bullets: ['distancia: 18 km', 'duración: 6 h', 'dificultad: Alta'], cta: 'Guardalo',
  }))
  assert.equal(rebuilt.lugar, 'Laguna Torre')
  assert.deepEqual(rebuilt.ficha[1], {etiqueta: 'duración', valor: '6 h'})
  assert.equal(rebuilt.cta, 'Guardalo')
})

test('Molde 3 conserva qué campos opcionales existen y toma todos los valores editados', () => {
  const rebuilt = rebuildBannerContentFromEditableRow(row({
    contentKind: 'banner/molde-3', lugar: 'Viejo', fecha: 'Vieja', precio: '$1',
    financiacion: '3 cuotas', disponibilidad: '9 cupos', cta: 'Viejo', typographyId: 'Inter',
  }, {
    titulo: 'México', subtitulo: '8 de marzo',
    bullets: ['Desde USD 2.900', '6 cuotas', '4 cupos'], cta: 'Consultá',
  }))
  assert.equal(rebuilt.precio, 'Desde USD 2.900')
  assert.equal(rebuilt.financiacion, '6 cuotas')
  assert.equal(rebuilt.disponibilidad, '4 cupos')
  assert.equal(rebuilt.reserva, undefined)
})

test('Molde 4 reconstruye salidas editadas y exige mantener su cantidad', () => {
  const original = {
    contentKind: 'banner/molde-4', titulo: 'Agenda',
    salidas: [{lugar: 'A', fecha: '1', precio: '$1'}, {lugar: 'B', fecha: '2', precio: '$2'}], cta: 'Ver', typographyId: 'Inter',
  }
  const rebuilt = rebuildBannerContentFromEditableRow(row(original, {
    titulo: 'Próximas salidas', bullets: ['Tilcara · 6 de diciembre · USD 420', 'Ushuaia · 8 de febrero · Desde USD 1.200'], cta: 'Elegí',
  }))
  assert.deepEqual(rebuilt.salidas[1], {lugar: 'Ushuaia', fecha: '8 de febrero', precio: 'Desde USD 1.200'})
  assert.throws(() => rebuildBannerContentFromEditableRow(row(original, {titulo: 'Agenda', bullets: ['Tilcara · 6 de diciembre · USD 420'], cta: 'Ver'})), /exactamente 2/u)
})

test('Molde 5 conserva iconos y aplica etiquetas editadas', () => {
  const rebuilt = rebuildBannerContentFromEditableRow(row({
    contentKind: 'banner/molde-5', lugar: 'Viejo', fecha: 'Vieja', noches: '1 noche',
    alojamiento: 'Hostel', regimen: 'Sin comidas',
    incluye: [{icon: 'aereos', label: 'Aéreos'}, {icon: 'traslados', label: 'Traslados'}],
    precio: 'USD 2.900', cta: 'Viejo', typographyId: 'Playfair Display',
  }, {
    titulo: 'Riviera Maya', subtitulo: '8 de marzo',
    bullets: ['8 noches', 'Hotel 4 estrellas', 'Media pensión', 'Desde USD 2.700', 'Vuelos incluidos', 'Transfer privado'],
    cta: 'Pedí el itinerario',
  }))
  assert.equal(rebuilt.noches, '8 noches')
  assert.equal(rebuilt.precio, 'Desde USD 2.700')
  assert.deepEqual(rebuilt.incluye, [
    {icon: 'aereos', label: 'Vuelos incluidos'},
    {icon: 'traslados', label: 'Transfer privado'},
  ])
})

test('Molde 6 usa mensaje y convocatoria editados', () => {
  const rebuilt = rebuildBannerContentFromEditableRow(row({
    contentKind: 'banner/molde-6', mensaje: 'Viejo', convocatoria: 'Vieja', typographyId: 'Inter',
  }, {titulo: 'Volvé a mirar lejos', subtitulo: 'Sumate al grupo'}))
  assert.equal(rebuilt.mensaje, 'Volvé a mirar lejos')
  assert.equal(rebuilt.convocatoria, 'Sumate al grupo')
})

test('rechaza ediciones que pierden estructura antes del renderer', () => {
  assert.throws(() => rebuildBannerContentFromEditableRow(row({
    contentKind: 'banner/molde-2', lugar: 'A', fecha: 'B',
    ficha: [{etiqueta: 'distancia', valor: '1'}, {etiqueta: 'duración', valor: '2'}, {etiqueta: 'acceso', valor: '3'}],
    cta: 'C', typographyId: 'Inter',
  }, {titulo: 'A', subtitulo: 'B', bullets: ['texto sin etiqueta', 'duración: 2 h', 'acceso: libre'], cta: 'C'})), /etiqueta: valor/u)
})
