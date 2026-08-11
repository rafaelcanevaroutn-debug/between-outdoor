import test from 'node:test'
import assert from 'node:assert/strict'
import { assignDistinctTypographies } from '../lib/generators/video-typography-assignment.ts'
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

test('con más de 5 piezas, rota en el mismo orden — la 6ta repite la de la 1ra', () => {
  const result = assignDistinctTypographies(7)
  assert.equal(result.length, 7)
  assert.deepEqual(result[5], result[0])
  assert.deepEqual(result[6], result[1])
  // Las primeras 5 siguen siendo todas distintas entre sí.
  const firstFive = result.slice(0, 5).map(entry => entry[0])
  assert.equal(new Set(firstFive).size, 5)
})
