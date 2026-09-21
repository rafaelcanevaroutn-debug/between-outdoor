import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
import { createClient } from '@supabase/supabase-js'
import { generateContentForSalida } from '../lib/gemini.ts'
import { generateAdaptiveCarrusel } from '../lib/generators/carrusel-formato'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Faltan variables de Supabase')

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function runTest() {
  console.log('Fetching profile for renzoyfranco...')
  const { data: profiles, error: profileError } = await db
    .from('profiles')
    .select('*')
    .eq('company_name', 'renzoyfranco.viajes')
    
  if (profileError || !profiles || profiles.length === 0) {
    console.error('No se pudo encontrar el perfil:', profileError)
    return
  }
  const profile = profiles[0]

  console.log('Fetching salidas de playa para', profile.company_name)
  const { data: salidas, error: salidasError } = await db
    .from('salidas')
    .select('*')
    .eq('user_id', profile.id)
    .eq('tipo_viaje', 'viaje_playa_caribe')
    .limit(1)

  if (salidasError || !salidas || salidas.length === 0) {
    console.error('No se encontro salida de playa:', salidasError)
    return
  }

  const salida = salidas[0]
  console.log(`Salida encontrada: ${salida.nombre} - ${salida.destino} (${salida.tipo_viaje})`)

  console.log('\n--- GENERANDO VIDEO ---')
  try {
    const videoResult = await generateContentForSalida(
      salida,
      {},
      [],
      'turismo_aventura',
      profile.company_name,
      [],
      'vender_salida',
      {},
      1,
      null,
      'video'
    )
    console.log(JSON.stringify(videoResult, null, 2))
  } catch (e) {
    console.error('Error generando video:', e)
  }

  console.log('\n--- GENERANDO CARRUSEL ---')
  try {
    const carruselResult = await generateContentForSalida(
      salida,
      {},
      [],
      'turismo_aventura',
      profile.company_name,
      [],
      'vender_salida',
      {},
      1,
      null,
      'carrusel'
    )
    console.log(JSON.stringify(carruselResult, null, 2))
  } catch (e) {
    console.error('Error generando carrusel:', e)
  }
}

runTest()
