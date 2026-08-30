import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCarruselEligibility } from '../lib/carrusel-eligibility.ts'
import { validateLocalRecurringContentRequest } from '../lib/local-recurring-content-policy.ts'

const recurring = { tipo_viaje: 'salida_recurrente' }
const standard = { tipo_viaje: 'salida_un_dia' }

test('acepta únicamente el banco específico del grupo recurrente', () => {
  for (const formatoCarrusel of ['organico', 'itinerario', 'editorial']) {
    assert.equal(validateLocalRecurringContentRequest({ salida: recurring, formato: 'carrusel', formatoCarrusel }), null)
  }
  for (const videoSubfamilia of ['3b', '3a', '1c', '3e', '4']) {
    assert.equal(validateLocalRecurringContentRequest({ salida: recurring, formato: 'video', videoSubfamilia }), null)
  }
  assert.equal(validateLocalRecurringContentRequest({ salida: recurring, formato: 'banner', bannerMolde: 6 }), null)
})

test('bloquea familias ajenas aunque se intente llamar a la API directamente', () => {
  for (const formatoCarrusel of ['conversacion', 'calendario', 'ascenso', 'lugar']) {
    assert.match(validateLocalRecurringContentRequest({ salida: recurring, formato: 'carrusel', formatoCarrusel }), /solo podés generar carruseles/i)
  }
  for (const videoSubfamilia of ['1a', '2c', '3c', '3d', '5']) {
    assert.match(validateLocalRecurringContentRequest({ salida: recurring, formato: 'video', videoSubfamilia }), /solo podés generar videos/i)
  }
  assert.match(validateLocalRecurringContentRequest({ salida: recurring, formato: 'banner', bannerMolde: 1 }), /banner de Comunidad/i)
  assert.match(validateLocalRecurringContentRequest({ salida: recurring, formato: 'carrusel_promo' }), /banco específico/i)
})

test('no modifica las salidas convencionales', () => {
  assert.equal(validateLocalRecurringContentRequest({ salida: standard, formato: 'carrusel', formatoCarrusel: 'editorial' }), null)
  assert.equal(validateLocalRecurringContentRequest({ salida: standard, formato: 'video', videoSubfamilia: '2c' }), null)
})

test('calendario recurrente no exige una fecha futura única', () => {
  const result = evaluateCarruselEligibility('calendario', {
    tipo_viaje: 'salida_recurrente',
    destino: 'Tucumán',
    fecha_inicio: null,
    fecha_fin: null,
    itinerario_dias: [],
    puntos_interes: [],
  }, { futureSalidasCount: 0, holidayCount: 0 })
  assert.equal(result.eligible, true)
  assert.deepEqual(result.warnings, [])
})

test('información del grupo no exige un itinerario día por día', () => {
  const result = evaluateCarruselEligibility('itinerario', {
    tipo_viaje: 'salida_recurrente',
    destino: 'Tucumán',
    fecha_inicio: null,
    fecha_fin: null,
    itinerario_dias: [],
    puntos_interes: [],
  }, { hasPhotos: true })
  assert.equal(result.eligible, true)
  assert.deepEqual(result.errors, [])
})
