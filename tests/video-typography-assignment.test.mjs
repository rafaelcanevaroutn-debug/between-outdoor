import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignDistinctTypographies,
  assignDistinctTypographiesFromPools,
  curatedVideoTypographyPool,
  resolveClientVideoTypographyPool,
} from '../lib/generators/video-typography-assignment.ts'
import { VIDEO_TYPOGRAPHY_CATALOG } from '../lib/generators/video-typography.ts'

test('con 1 pieza, la regla no aplica — devuelve el catálogo completo', () => {
  const result = assignDistinctTypographies(1)
  assert.equal(result.length, 1)
  assert.deepEqual([...result[0]].sort(), [...VIDEO_TYPOGRAPHY_CATALOG].sort())
})

test('con 0 piezas, devuelve un array vacío sin explotar', () => {
  assert.deepEqual(assignDistinctTypographies(0), [])
})

test('con 2-5 piezas, cada una recibe una sola tipografía y todas son distintas entre sí', () => {
  for (const count of [2, 3, 4, 5]) {
    const result = assignDistinctTypographies(count)
    assert.equal(result.length, count)
    for (const entry of result) assert.equal(entry.length, 1)
    const assigned = result.map(entry => entry[0])
    assert.equal(new Set(assigned).size, count, `deberían ser ${count} tipografías distintas`)
    for (const font of assigned) assert.ok(VIDEO_TYPOGRAPHY_CATALOG.includes(font))
  }
})

test('agota el catálogo completo antes de repetir tipografías', () => {
  const result = assignDistinctTypographies(VIDEO_TYPOGRAPHY_CATALOG.length + 2)
  assert.equal(result.length, VIDEO_TYPOGRAPHY_CATALOG.length + 2)
  assert.deepEqual(result[VIDEO_TYPOGRAPHY_CATALOG.length], result[0])
  assert.deepEqual(result[VIDEO_TYPOGRAPHY_CATALOG.length + 1], result[1])
  const firstCycle = result.slice(0, VIDEO_TYPOGRAPHY_CATALOG.length).map(entry => entry[0])
  assert.equal(new Set(firstCycle).size, VIDEO_TYPOGRAPHY_CATALOG.length)
})

test('la semana agota los pools configurados antes de repetir una fuente', () => {
  const result = assignDistinctTypographiesFromPools([
    ['poppins', 'plex', 'Inter'],
    ['poppins', 'plex', 'Inter'],
    ['poppins', 'plex', 'Inter'],
  ], 0)
  assert.deepEqual(result, [['poppins'], ['plex'], ['Inter']])
})

test('cada familia tiene un pool curado con más de una alternativa', () => {
  for (const family of ['2b', '3a', '3b', '3c', '3d', '3e', '4']) {
    const pool = curatedVideoTypographyPool(family)
    assert.ok(pool.length >= 3, `${family} debería tener variedad tipográfica`)
    assert.equal(new Set(pool).size, pool.length)
  }
})

test('una cuenta configurada nunca recupera una tipografía ajena del catálogo genérico', () => {
  assert.deepEqual(
    resolveClientVideoTypographyPool('3c', [], ['cormorant', 'poppins']),
    ['cormorant', 'poppins'],
  )
  assert.deepEqual(
    resolveClientVideoTypographyPool('3c', ['oswald'], ['cormorant', 'poppins']),
    ['oswald'],
  )
})
