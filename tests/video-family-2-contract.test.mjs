import test from 'node:test'
import assert from 'node:assert/strict'
import {
  declaredListicleCount,
  evaluateListicleEligibility,
  normalizeListicleItems,
  resolveListicleBulletCount,
  validateVideoListicle,
  validateVideoStorytelling,
  validateVideoTips,
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

test('un item que le pega un dato al lugar deja de ser un candidato exacto, aunque el dato sea real', () => {
  const errors = validateVideoListicle({
    titulo: '1 lugar para conocer',
    items: ['Cerro de la Cruz — 20 km'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.ok(errors.some(error => error.includes('no es exactamente uno de los lugares verificados habilitados')))
})

test('un lugar inventado nunca es un candidato válido', () => {
  const errors = validateVideoListicle({
    titulo: '1 lugar para conocer',
    items: ['Bosque inventado'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.ok(errors.some(error => error.includes('no es exactamente uno de los lugares verificados habilitados')))
})

test('un item que copia EXACTO un lugar verificado y atómico de la salida es válido', () => {
  const errors = validateVideoListicle({
    titulo: '3 lugares para conocer',
    items: ['Tafí del Valle', 'Cerro de la Cruz', 'Mirador del Cóndor'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.deepEqual(errors, [])
})

test('la eligibilidad de listicle exige al menos 3 lugares verificados cortos', () => {
  const pobre = { ...salida, puntos_interes: [] }
  const eligibility = evaluateListicleEligibility(pobre)
  assert.equal(eligibility.eligible, false)
  assert.equal(eligibility.candidateCount, 1) // solo el destino
  assert.equal(eligibility.minRequired, 3)

  const rica = evaluateListicleEligibility(salida)
  assert.equal(rica.eligible, true)
  assert.equal(rica.candidateCount, 3)
})

test('la cantidad de bullets la calcula el sistema, nunca supera los candidatos ni el tope duro', () => {
  assert.equal(resolveListicleBulletCount(1), 1)
  assert.equal(resolveListicleBulletCount(3), 3)
  assert.equal(resolveListicleBulletCount(4), 4)
  assert.equal(resolveListicleBulletCount(10), 4) // TARGET_BULLETS, no MAX_BULLETS
})

test('2c: tips que mezclan ancla real, mindset y mención de destino pasan limpio', () => {
  const errors = validateVideoTips({
    titulo: '2 tips para Tafí del Valle',
    items: [
      'Antes de un tramo de 8 km, salí con más agua de la que crees necesitar.',
      'La mejor mochila es la que vaciás de preocupaciones.',
    ],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.deepEqual(errors, [])
})

test('2c: la cantidad declarada distinta de items es rechazo duro', () => {
  const errors = validateVideoTips({
    titulo: '3 tips para Tafí del Valle',
    items: ['Llevá agua.', 'Salí temprano.'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.ok(errors.some(error => error.includes('promete 3 tips')))
})

test('2c: un tip con un dato numérico inventado se rechaza', () => {
  const errors = validateVideoTips({
    titulo: '1 tip para Tafí del Valle',
    items: ['Llevá agua para un tramo de 25 km.'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.ok(errors.some(error => error.includes('25 km')))
})

test('2c: la alarma de humo cualitativa rechaza una ausencia sin respaldo en la salida', () => {
  const errors = validateVideoTips({
    titulo: '1 tip para Tafí del Valle',
    items: ['No hay agua en todo el camino, llevá lo que vas a tomar.'],
    cta: 'Compartí cuál te gustó más',
    salida: { ...salida, puntos_interes: [] },
  })
  assert.ok(errors.some(error => error.includes('ausencia de agua')))
})

test('2c: dos tips duplicados se rechazan', () => {
  const errors = validateVideoTips({
    titulo: '2 tips para Tafí del Valle',
    items: ['Llevá agua.', 'Llevá agua.'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.ok(errors.some(error => error.includes('duplicados')))
})

test('2c: un tip con dato comercial se rechaza', () => {
  const errors = validateVideoTips({
    titulo: '1 tip para Tafí del Valle',
    items: ['Hay cupos limitados para este tramo.'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.ok(errors.some(error => error.includes('dato comercial')))
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
