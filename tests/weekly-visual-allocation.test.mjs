import test from 'node:test'
import assert from 'node:assert/strict'
import { createWeeklyVisualAllocator } from '../lib/weekly-visual-allocation.ts'

const assets = Array.from({ length: 16 }, (_, index) => ({
  id: `foto-${index + 1}`,
  name: `foto-${index + 1}.jpg`,
}))

test('dos banners reciben fotos distintas cuando el banco alcanza', () => {
  const allocator = createWeeklyVisualAllocator(new Map([['salida', assets]]), 'semana-35')
  const first = allocator.allocate('salida', 1)
  const second = allocator.allocate('salida', 1)
  assert.notEqual(first.ids[0], second.ids[0])
})

test('un carrusel de cinco slides no repite ninguna foto', () => {
  const allocator = createWeeklyVisualAllocator(new Map([['salida', assets]]), 'semana-35')
  const carousel = allocator.allocate('salida', 5)
  assert.equal(carousel.ids.length, 5)
  assert.equal(new Set(carousel.ids).size, 5)
})

test('dos carruseles agotan primero fotos nuevas y reutilizan sólo si hace falta', () => {
  const allocator = createWeeklyVisualAllocator(new Map([['salida', assets.slice(0, 8)]]), 'semana-35')
  const first = allocator.allocate('salida', 5)
  const second = allocator.allocate('salida', 5)
  assert.equal(first.ids.filter(id => second.ids.includes(id)).length, 2)
  assert.equal(new Set(second.ids).size, 5)
  assert.equal(second.reusedAfterExhaustion, true)
})

test('con una sola foto permite repetir después de reconocer que agotó el banco', () => {
  const allocator = createWeeklyVisualAllocator(new Map([['salida', assets.slice(0, 1)]]), 'semana-35')
  const selection = allocator.allocate('salida', 5)
  assert.deepEqual(selection.ids, Array(5).fill('foto-1'))
  assert.equal(selection.reusedAfterExhaustion, true)
})
