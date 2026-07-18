import test from 'node:test'
import assert from 'node:assert/strict'
import { groupItineraryDaysByLoad } from '../lib/generators/itinerary-groups.ts'

function makeDays(loads) {
  return loads.map((requiredItems, index) => ({
    numero: index + 1,
    titulo: `Día ${index + 1}`,
    descripcion: `Descripción ${index + 1}`,
    hito: null,
    horario: null,
    testLoad: { requiredItems, textLength: requiredItems * 10 + index },
  }))
}

function group(loads) {
  return groupItineraryDaysByLoad(makeDays(loads), 6, day => day.testLoad)
}

function assertCoverage(groups, dayCount) {
  const numbers = groups.flatMap(item => item.dias.map(day => day.numero))
  assert.deepEqual(numbers, Array.from({ length: dayCount }, (_, index) => index + 1))
  groups.forEach(item => {
    item.dias.forEach((day, index) => {
      if (index > 0) assert.equal(day.numero, item.dias[index - 1].numero + 1)
    })
  })
}

test('hasta seis días conserva un slide por día', () => {
  const groups = group([5, 4, 3, 2, 1, 0])
  assert.deepEqual(groups.map(item => item.label), ['DÍA 1', 'DÍA 2', 'DÍA 3', 'DÍA 4', 'DÍA 5', 'DÍA 6'])
  assert.ok(groups.every(item => item.dias.length === 1))
  assertCoverage(groups, 6)
})

test('Chaltén agrupa DÍAS 6–7 porque son los de menor carga', () => {
  const groups = group([0, 5, 4, 4, 1, 0, 0])
  assert.deepEqual(groups.map(item => item.label), ['DÍA 1', 'DÍA 2', 'DÍA 3', 'DÍA 4', 'DÍA 5', 'DÍAS 6–7'])
  assertCoverage(groups, 7)
})

test('elige globalmente los pares de menor carga sin solaparlos', () => {
  const groups = group([9, 9, 0, 0, 9, 9, 0, 0])
  assert.deepEqual(groups.map(item => item.label), ['DÍA 1', 'DÍA 2', 'DÍAS 3–4', 'DÍA 5', 'DÍA 6', 'DÍAS 7–8'])
  assert.ok(groups.every(item => item.dias.length <= 2))
  assertCoverage(groups, 8)
})

test('hasta doce días nunca reúne más de dos días por slide', () => {
  const groups = group(Array.from({ length: 12 }, (_, index) => index))
  assert.equal(groups.length, 6)
  assert.ok(groups.every(item => item.dias.length === 2))
  assertCoverage(groups, 12)
})

test('recién con más de doce días permite un grupo de tres', () => {
  const groups = group(Array.from({ length: 13 }, (_, index) => index))
  assert.equal(groups.length, 6)
  assert.deepEqual(groups.map(item => item.dias.length).sort((a, b) => a - b), [2, 2, 2, 2, 2, 3])
  assertCoverage(groups, 13)
})

test('mantiene cobertura, orden y el menor tamaño máximo entre 1 y 30 días', () => {
  for (let dayCount = 1; dayCount <= 30; dayCount++) {
    const groups = group(Array.from({ length: dayCount }, (_, index) => (index * 7) % 5))
    const expectedGroups = Math.min(dayCount, 6)
    const expectedMaxSize = Math.ceil(dayCount / expectedGroups)
    assert.equal(groups.length, expectedGroups, `${dayCount} días`)
    assert.ok(groups.every(item => item.dias.length <= expectedMaxSize), `${dayCount} días`)
    if (dayCount <= 12) assert.ok(groups.every(item => item.dias.length <= 2), `${dayCount} días`)
    assertCoverage(groups, dayCount)
  }
})
