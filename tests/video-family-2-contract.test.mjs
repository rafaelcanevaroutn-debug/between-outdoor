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

test('2a original rechaza CTA comerciales rioplatenses, incluido escribinos', () => {
  for (const cta of ['Escribinos por WhatsApp', 'Reservá tu lugar']) {
    const errors = validateVideoListicle({
      titulo: '3 lugares para conocer',
      items: ['Tafí del Valle', 'Cerro de la Cruz', 'Mirador del Cóndor'],
      cta,
      salida,
    })
    assert.ok(errors.some(error => error.includes('no comercial')), cta)
  }
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

test('2c: una única recomendación no alcanza para construir una pieza de consejos', () => {
  const errors = validateVideoTips({
    titulo: '1 consejo para Tafí del Valle',
    items: ['Llevá agua.'],
    cta: 'Compartí cuál te gustó más',
    salida,
  })
  assert.ok(errors.some(error => error.includes('al menos 2 tips')))
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

test('2c: el CTA no habla de un solo tip cuando la pieza contiene varios', () => {
  const errors = validateVideoTips({
    titulo: '2 tips para Tafí del Valle',
    items: ['Llevá agua.', 'Usá calzado cómodo.'],
    cta: 'Guardá este tip para después',
    salida,
  })
  assert.ok(errors.some(error => error.includes('un solo tip')))
})

test('2c: rechaza tips cortados a mitad de una idea', () => {
  for (const item of [
    'El terreno en Tafí del Valle es',
    'No te asustes por la dificultad media, vení',
    'Antes de salir elegí',
  ]) {
    const errors = validateVideoTips({
      titulo: '1 tip para Tafí del Valle',
      items: [item],
      cta: 'Compartí cuál te gustó más',
      salida,
    })
    assert.ok(errors.some(error => error.includes('gramaticalmente inconcluso')), item)
  }
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

test('2c: rechaza CTA y escasez con vocal acentuada', () => {
  for (const item of ['Reservá tu lugar para este tramo.', 'Quedan los últimos lugares.']) {
    const errors = validateVideoTips({titulo: '1 tip para Tafí del Valle', items: [item], cta: 'Compartí cuál te gustó más', salida})
    assert.ok(errors.some(error => error.includes('dato comercial')), item)
  }
})

test('2c original rechaza escribinos y reservá también en el CTA', () => {
  for (const cta of ['Escribinos', 'Reservá']) {
    const errors = validateVideoTips({titulo: '1 tip para Tafí del Valle', items: ['Llevá agua.'], cta, salida})
    assert.ok(errors.some(error => error.includes('no comercial')), cta)
  }
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

test('storytelling rechaza segmentos cortados a mitad de una frase', () => {
  const errors = validateVideoStorytelling({
    apertura: 'El viaje cambia de ritmo',
    desarrollo: [
      'Salimos de Salta con destino',
      'Después caminamos por las',
      'Los primeros días en la Zona',
    ],
    salida,
  })
  assert.equal(errors.filter(error => error.includes('gramaticalmente inconcluso')).length, 3)
})

test('storytelling rechaza noches para un destino como construcción antinatural', () => {
  const errors = validateVideoStorytelling({
    apertura: 'El viaje cambia de ritmo',
    desarrollo: ['Pasamos 4 noches más para Tafí del Valle.', 'Después volvemos con el grupo.'],
    salida,
  })
  assert.ok(errors.some(error => error.includes('noches en [destino]')))
})

test('storytelling no transforma noches verificadas en días', () => {
  const errors = validateVideoStorytelling({
    apertura: 'El viaje cambia de ritmo',
    desarrollo: ['Pasamos 4 días en Tafí del Valle.', 'Después volvemos con el grupo.'],
    salida: {...salida, que_incluye: '4 noches con desayuno'},
  })
  assert.ok(errors.some(error => error.includes('4 días no figura con esa unidad')))
})

test('storytelling rechaza logística aérea y escenas premium no verificadas', () => {
  const errors = validateVideoStorytelling({
    apertura: 'Enero cambia de ritmo',
    desarrollo: [
      'Volamos directo a Tafí del Valle.',
      'Desayunamos frente al mar.',
    ],
    salida,
  })
  assert.ok(errors.some(error => error.includes('vuelo directo')))
  assert.ok(errors.some(error => error.includes('frente al mar')))
})
