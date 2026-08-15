import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  claimBatchIndex,
  getRotatedBatchItem,
} from '../lib/batch-rotation.ts'

test('dos lotes consecutivos arrancan por temas distintos en round-robin', () => {
  const temas = ['destinos', 'seguridad', 'preparacion_fisica']

  assert.equal(getRotatedBatchItem(temas, 0), 'destinos')
  assert.equal(getRotatedBatchItem(temas, 1), 'seguridad')
  assert.equal(getRotatedBatchItem(temas, 2), 'preparacion_fisica')
  assert.equal(getRotatedBatchItem(temas, 3), 'destinos')

  const lote = temas.map((_, itemIndex) => getRotatedBatchItem(temas, 1, itemIndex))
  assert.deepEqual(lote, ['seguridad', 'preparacion_fisica', 'destinos'])
  assert.equal(new Set(lote).size, temas.length)
})

test('dos reservas concurrentes reciben índices distintos', async () => {
  let nextIndex = 0
  let queue = Promise.resolve()
  const fakeSupabase = {
    rpc: async () => {
      const previous = queue
      let release
      queue = new Promise(resolve => { release = resolve })
      await previous
      await new Promise(resolve => setImmediate(resolve))
      const data = nextIndex
      nextIndex += 1
      release()
      return { data, error: null }
    },
  }

  const [first, second] = await Promise.all([
    claimBatchIndex(fakeSupabase, 'user-1', 'carrusel'),
    claimBatchIndex(fakeSupabase, 'user-1', 'carrusel'),
  ])

  assert.deepEqual([first, second], [0, 1])
})

test('la migración garantiza el incremento atómico con clave genérica', async () => {
  const sql = await readFile(new URL('../supabase/migrations/022_batch_rotation_counters.sql', import.meta.url), 'utf8')

  assert.match(sql, /PRIMARY KEY \(user_id, formato\)/)
  assert.match(sql, /ON CONFLICT \(user_id, formato\) DO UPDATE/)
  assert.match(sql, /next_batch_index = counters\.next_batch_index \+ 1/)
  assert.match(sql, /RETURNING counters\.next_batch_index - 1/)
})
