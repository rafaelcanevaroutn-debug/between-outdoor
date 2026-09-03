import test from 'node:test'
import assert from 'node:assert/strict'
import { runWeeklyBatch } from '../lib/orchestrators/weekly-batch.ts'

// --- Mocks equivalentes a los del test original pero para el orquestador principal ---
function mockAdmin() {
  const tableState = new Map()
  let nextId = 1

  function getTable(name) {
    if (!tableState.has(name)) tableState.set(name, [])
    return tableState.get(name)
  }

  const queryBuilder = (tableName, currentQuery = []) => ({
    select: () => queryBuilder(tableName, currentQuery),
    eq: (key, val) => queryBuilder(tableName, [...currentQuery, row => row[key] === val]),
    in: (key, vals) => queryBuilder(tableName, [...currentQuery, row => vals.includes(row[key])]),
    gte: (key, val) => queryBuilder(tableName, [...currentQuery, row => row[key] >= val]),
    order: () => queryBuilder(tableName, currentQuery),
    limit: () => queryBuilder(tableName, currentQuery),
    single: async () => {
      const table = getTable(tableName)
      const matches = table.filter(row => currentQuery.every(cond => cond(row)))
      if (matches.length === 0) return { data: null, error: new Error('Not found') }
      return { data: matches[0], error: null }
    },
    insert: (data) => {
      const table = getTable(tableName)
      const items = Array.isArray(data) ? data : [data]
      const inserted = items.map(item => ({ id: `id-${nextId++}`, ...item }))
      table.push(...inserted)
      return {
        select: () => ({
          single: async () => ({ data: inserted[0], error: null }),
          then: (res, rej) => Promise.resolve({ data: inserted, error: null }).then(res, rej),
        }),
        then: (res, rej) => Promise.resolve({ data: inserted, error: null }).then(res, rej),
      }
    },
    update: (data) => {
      const executeUpdate = (filterConds = []) => {
        const table = getTable(tableName)
        const allConds = [...currentQuery, ...filterConds]
        const matches = table.filter(row => allConds.every(cond => cond(row)))
        for (const match of matches) {
          Object.assign(match, data)
        }
        return {
          select: () => ({ single: async () => ({ data: matches[0], error: null }) }),
          then: (res, rej) => Promise.resolve({ data: matches, error: null }).then(res, rej)
        }
      }
      return {
        eq: (key, val) => executeUpdate([row => row[key] === val]),
        select: () => executeUpdate().select(),
        then: (res, rej) => executeUpdate().then(res, rej)
      }
    },
    then: (res, rej) => {
      const table = getTable(tableName)
      const matches = table.filter(row => currentQuery.every(cond => cond(row)))
      return Promise.resolve({ data: matches, error: null }).then(res, rej)
    }
  })

  return {
    from: (tableName) => queryBuilder(tableName),
    rpc: async (fnName, params) => {
      // Mock for claim_calendar_batch_rotation
      return { data: 0, error: null }
    },
    _state: tableState,
    _seed: (tableName, data) => getTable(tableName).push(...data)
  }
}

// Interceptamos fetch global para no disparar MATI real
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  if (url.toString().includes('/api/v1/')) {
    // Simulamos respuesta OK de Mati
    return new Response(JSON.stringify({ folder_id: 'mati-folder-test' }), { status: 200 })
  }
  return originalFetch(url, options)
}

test('Stress test: 50 batches paralelos', async () => {
  const admin = mockAdmin()

  // Seed db with profiles and salidas
  const clientId = 'cliente-stress'
  admin._seed('profiles', [{ id: clientId, role: 'cliente', name: 'Test Client', calendario_asignado: 'CAL-02', niche: 'Trekking' }])
  admin._seed('salidas', [
    { id: 'salida-1', user_id: clientId, nombre: 'Salida 1', fecha_inicio: '2026-09-01', pais_codigo: 'AR', estado: 'activa', tipo_viaje: 'expedicion_premium', carpeta_fotos_id: 'fake-folder' },
    { id: 'salida-2', user_id: clientId, nombre: 'Salida 2', fecha_inicio: '2026-09-05', pais_codigo: 'AR', estado: 'activa', tipo_viaje: 'expedicion_premium', carpeta_fotos_id: 'fake-folder' }
  ])

  const CONCURRENCY = 50
  const start = performance.now()

  // Ejecutamos N instancias en paralelo de runWeeklyBatch
  const promises = []
  for (let i = 0; i < CONCURRENCY; i++) {
    // Pre-insertar run
    admin._seed('calendar_batch_runs', [{ id: `run-${i}`, user_id: clientId, status: 'pending' }])
    
    promises.push(runWeeklyBatch({ admin, runId: `run-${i}`, clientId }))
  }

  await Promise.allSettled(promises)

  const end = performance.now()
  const elapsedSeconds = (end - start) / 1000

  // Validar resultados
  const runs = admin._state.get('calendar_batch_runs') || []
  const generated = admin._state.get('contenido_generado') || []
  const matis = admin._state.get('carrusel_mati_dispatches') || []

  // Con 50 batches, cada uno de CAL-02 tiene slots específicos.
  console.log(`⏱️ Stress test 50 batches en paralelo: ${elapsedSeconds.toFixed(2)}s`)
  console.log(`📊 Generados: ${generated.length} contenidos, ${matis.length} dispatches`)

  // Todos los runs deberían estar completados (success o con algun error, pero no fallar catastroficamente en el event loop)
  const allCompleted = runs.every(r => r.status === 'success' || r.status === 'error' || r.status === 'partial')
  assert.ok(allCompleted, 'Todos los runs deberían haber completado su estado')
  
  // Al paralelizarlos no debería haber cuello de botella mayor al de las promesas
  assert.ok(elapsedSeconds < 5, 'Debería resolverse en menos de 5 segundos al estar mockeado y paralelizado')
})

test('Restaurar mocks', () => {
  globalThis.fetch = originalFetch
})
