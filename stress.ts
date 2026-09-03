import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { createAdminClient } from './lib/supabase/admin'
import { runWeeklyBatch } from './lib/orchestrators/weekly-batch'
import { performance } from 'perf_hooks'

async function run() {
  const admin = createAdminClient()
  
  console.log('Buscando un cliente de prueba...')
  const { data: users, error } = await admin.from('profiles').select('id, calendario_asignado').eq('role', 'cliente').limit(1)
  if (error || !users || users.length === 0) {
    console.error('No se encontro cliente para el test', error)
    return
  }
  const clientId = users[0].id

  // Creamos unos runs falsos para stress
  const N = 5
  console.log(`Iniciando stress test con N=${N} concurrencias...`)
  
  const runIds = []
  for (let i = 0; i < N; i++) {
    const { data } = await admin.from('calendar_batch_runs').insert({
      user_id: clientId,
      status: 'pending',
      result: null
    }).select('id').single()
    if (data) runIds.push(data.id)
  }

  const start = performance.now()
  
  await Promise.allSettled(
    runIds.map(runId => {
      console.log(`Disparando batch run: ${runId}`)
      const batchStart = performance.now()
      return runWeeklyBatch({ admin, runId, clientId }).then(() => {
        console.log(`Batch ${runId} finalizado en ${((performance.now() - batchStart) / 1000).toFixed(2)}s`)
      })
    })
  )

  const end = performance.now()
  console.log(`Stress test finalizado. Tiempo total para ${N} ejecuciones paralelas: ${((end - start) / 1000).toFixed(2)}s`)
}

run().catch(console.error)
