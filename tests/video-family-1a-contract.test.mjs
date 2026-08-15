import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeVideoFamily1aDiscourse,
  validateVideoFamily1aDiscourse,
} from '../lib/generators/video-family-1a-contract.ts'

function salida(overrides = {}) {
  return {
    destino: 'Tafí del Valle',
    puntos_interes: [{ nombre: 'La Ciénega', ubicacion: 'Tafí del Valle' }],
    ...overrides,
  }
}

test('normaliza espacios sin convertir el discurso en una lista de piezas', () => {
  assert.equal(
    normalizeVideoFamily1aDiscourse('  Primero, el silencio.\r\n\r\n Después, la pregunta. \n Al final, una respuesta.  '),
    'Primero, el silencio.\nDespués, la pregunta.\nAl final, una respuesta.',
  )
})

test('acepta una pieza en prosa con entrada, desarrollo y desenlace', () => {
  assert.deepEqual(validateVideoFamily1aDiscourse({
    discurso: 'Al principio creemos que avanzar es no detenerse. Después entendemos que algunas pausas también cambian el rumbo. Al final, seguir no es correr: es elegir de nuevo.',
    salida: salida(),
  }), [])
})

test('rechaza la frase suelta que pertenece a Familia 3a', () => {
  const errors = validateVideoFamily1aDiscourse({
    discurso: 'Todo cambia cuando decidís avanzar.',
    salida: salida(),
  })
  assert.ok(errors.some(error => error.includes('entrada, desarrollo y desenlace')))
})

test('rechaza listas, venta, fechas y CTA', () => {
  const errors = validateVideoFamily1aDiscourse({
    discurso: '- Primero soñá.\n- Después reservá tu cupo.\n- Viajá en agosto.',
    salida: salida(),
  })
  assert.ok(errors.some(error => error.includes('lista')))
  assert.ok(errors.some(error => error.includes('comercial')))
})

test('rechaza un recorrido concreto o un lugar verificado', () => {
  for (const discurso of [
    'Salimos temprano. Subimos al refugio. Llegamos cuando cayó el sol.',
    'Hay una pregunta. La Ciénega espera. La respuesta llega después.',
  ]) {
    const errors = validateVideoFamily1aDiscourse({ discurso, salida: salida() })
    assert.ok(errors.some(error => error.includes('recorrido concreto')), discurso)
  }
})

test('rechaza los clichés explícitos que el spec marca como incorrectos', () => {
  const errors = validateVideoFamily1aDiscourse({
    discurso: 'Seguí tus sueños. Todo lo que deseás está del otro lado del miedo. Y nunca dejes de creer.',
    salida: salida(),
  })
  assert.ok(errors.some(error => error.includes('cliché')))
})
