import test from 'node:test'
import assert from 'node:assert/strict'
import { validateVideoFamily5Copy } from '../lib/generators/video-family-5-contract.ts'

function salida(overrides = {}) {
  return {
    nombre: 'Senderos de Tafí',
    destino: 'Tafí del Valle',
    nivel: 'media',
    itinerario: 'Desde El Mollar hasta el mirador',
    punto_encuentro: 'El Mollar',
    itinerario_dias: [],
    puntos_interes: [
      { nombre: 'Cerro de la Cruz', descripcion: 'Sendero sin fuente de agua en el tramo final', ubicacion: 'Tafí del Valle', distancia: '8 km', duracion: '3 horas', dificultad: 'media' },
    ],
    ...overrides,
  }
}

test('un consejo de mindset puro, sin datos técnicos ni lugares, pasa limpio', () => {
  const errors = validateVideoFamily5Copy({
    copy: 'El cansancio que elegís siempre pesa menos que el que te imponen.',
    salida: salida(),
  })
  assert.deepEqual(errors, [])
})

test('un dato numérico verificado en la salida pasa', () => {
  const errors = validateVideoFamily5Copy({
    copy: 'Antes de un tramo de 8 km, salí con más agua de la que crees necesitar.',
    salida: salida(),
  })
  assert.deepEqual(errors, [])
})

test('un dato numérico inventado se rechaza', () => {
  const errors = validateVideoFamily5Copy({
    copy: 'Antes de un tramo de 25 km, llevá doble de agua.',
    salida: salida(),
  })
  assert.ok(errors.some(error => error.includes('25 km')))
})

test('la alarma de humo cualitativa: afirmar ausencia de agua sin respaldo en la salida se rechaza', () => {
  const errors = validateVideoFamily5Copy({
    copy: 'No hay agua en todo el camino, llevá lo que vas a tomar.',
    salida: salida({ puntos_interes: [] }),
  })
  assert.ok(errors.some(error => error.includes('ausencia de agua')))
})

test('la alarma de humo no dispara si existe una palabra relacionada en algún campo de la salida', () => {
  const errors = validateVideoFamily5Copy({
    copy: 'No hay agua en el tramo final, llevá lo que vas a tomar.',
    salida: salida(),
  })
  assert.deepEqual(errors, [])
})

test('mencionar el destino o un lugar verificado se rechaza, incluso en un consejo anclado', () => {
  const errors = validateVideoFamily5Copy({
    copy: 'En Tafí del Valle no hay sombra en el tramo final, llevá protector solar.',
    salida: salida(),
  })
  assert.ok(errors.some(error => error.includes('menciona un destino o lugar verificado')))
})

test('un dato comercial, CTA o fecha se rechaza', () => {
  const errors = validateVideoFamily5Copy({
    copy: 'Reservá tu lugar antes del 2026 y llevá agua suficiente.',
    salida: salida(),
  })
  assert.ok(errors.some(error => error.includes('dato comercial')))
})
