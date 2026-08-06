import test from 'node:test'
import assert from 'node:assert/strict'
import {
  declaredListicleCount,
  normalizeListicleItems,
  validateVideoListicle,
  validateVideoStorytelling,
} from '../lib/generators/video-family-2-contract.ts'

const salida = {
  nombre: 'Senderos de Tafí',
  destino: 'Tafí del Valle',
  nivel: 'media',
  itinerario: 'Desde El Mollar hasta el mirador',
  punto_encuentro: 'El Mollar',
  itinerario_dias: [],
  puntos_interes: [
    { nombre: 'Cerro de la Cruz', descripcion: 'Sendero', ubicacion: 'Tafí del Valle', distancia: '8 km', duracion: '3 horas', dificultad: 'media' },
    { nombre: 'Mirador del Cóndor', descripcion: 'Mirador', ubicacion: 'Tafí del Valle' },
  ],
}

test('extrae cantidad inicial y normaliza numeración/duplicados exactos', () => {
  assert.equal(declaredListicleCount('2 lugares para conocer'), 2)
  assert.equal(declaredListicleCount('Lugares para conocer'), null)
  assert.deepEqual(
    normalizeListicleItems(['1. Cerro de la Cruz', '2) Mirador del Cóndor', 'Cerro de la Cruz']),
    ['Cerro de la Cruz', 'Mirador del Cóndor'],
  )
})

test('la cantidad declarada distinta de items es rechazo duro', () => {
  const errors = validateVideoListicle({
    titulo: '3 lugares para conocer',
    items: ['Cerro de la Cruz', 'Mirador del Cóndor'],
    cta: 'Guardalo para tu próxima salida',
    salida,
  })
  assert.ok(errors.some(error => error.includes('promete 3 items')))
})

test('rechaza un dato numérico no verificado en listicle', () => {
  const errors = validateVideoListicle({
    titulo: '1 lugar para conocer',
    items: ['Cerro de la Cruz — 20 km'],
    cta: 'Compartilo con tu compañero de ruta',
    salida,
  })
  assert.ok(errors.some(error => error.includes('20 km')))
})

test('un número correcto no vuelve verificable un lugar inventado', () => {
  const errors = validateVideoListicle({
    titulo: '1 lugar para conocer',
    items: ['Bosque inventado — 8 km'],
    cta: 'Compartilo con tu compañero de ruta',
    salida,
  })
  assert.ok(errors.some(error => error.includes('no contiene un lugar ni dato verificable')))
})

test('storytelling rechaza datos no verificados y cambio de perspectiva', () => {
  const errors = validateVideoStorytelling({
    apertura: 'Venía a conocer Tafí del Valle',
    desarrollo: ['Salimos desde El Mollar', 'Son 9 horas de recorrido'],
    salida,
  })
  assert.ok(errors.some(error => error.includes('9 horas')))
  assert.ok(errors.some(error => error.includes('singular y plural')))
})
