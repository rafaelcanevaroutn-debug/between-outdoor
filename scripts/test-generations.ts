import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
import { generateVideoFamilia4 } from '../lib/generators/video-familia-4'
import type { Salida, CampaignContext } from '../types'
// If generateCarruselFormat is not exported from here or doesn't exist, we will mock or omit it for this simple type check
// import { generateCarruselFormat } from '../lib/generators/carrusel-formato'

async function run() {
  console.log('--- TEST 1: GRUPO EN FORMACIÓN (Familia 4) ---')
  const salidaLocal = {
    id: 'test-local-1',
    user_id: 'test-user-1',
    nombre: 'Trekking Tucumán',
    destino: 'Trekking en Tucumán',
    dias_semana: [],
    nivel: 'baja' as const,
    cupos: 15,
    precio_usd: 0,
    sena_usd: null,
    pais_codigo: 'AR',
    estado: 'activa',
    estado_grupo: 'formacion', // GRUPO EN FORMACIÓN
    frecuencia_prevista: 'Fines de semana (por definir)',
    fecha_inicio: '',
    fecha_fin: '',
    horario_inicio: null,
    horario_fin: null,
    punto_encuentro: null,
    zona_geografica: 'Tucumán',
    context_tags: ['Trekking', 'Naturaleza'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tipo_viaje: 'salida_recurrente',
    tipo_grupo: 'abierto',
    requisitos: [],
    servicios_incluidos: [],
    servicios_no_incluidos: [],
    itinerario: '', // itinerario is string
    cupo_maximo: null,
    precio: null,
    moneda: 'ARS',
    requiere_experiencia: false
  } as unknown as Salida

  const res1 = await generateVideoFamilia4({
    salida: salidaLocal,
    niche: 'trekking', // uppercase T -> lowercase t
    clientName: 'Test Agency',
    clientOnboarding: null,
    tipografiasPermitidas: ['Inter'],
    canalesHabilitados: ['Instagram']
  })
  console.log(JSON.stringify(res1, null, 2))

  console.log('\n\n--- TEST 2: SALIDA CON ITINERARIO (Carrusel) ---')
  const salidaItinerario = {
    id: 'test-itinerario-1',
    user_id: 'test-user-1',
    nombre: 'Expedición Chaltén',
    destino: 'Expedición Chaltén',
    dias_semana: [],
    nivel: 'alta' as const,
    cupos: 10,
    precio_usd: 500,
    sena_usd: 100,
    pais_codigo: 'AR',
    estado: 'activa',
    fecha_inicio: '2026-11-01',
    fecha_fin: '2026-11-05',
    horario_inicio: '08:00',
    horario_fin: '18:00',
    punto_encuentro: 'Terminal de Omnibus El Chaltén',
    zona_geografica: 'Patagonia',
    context_tags: ['Montaña', 'Expedición'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tipo_viaje: 'viaje_unico', // Instead of expedicion
    tipo_grupo: 'abierto',
    requisitos: ['Buen estado físico'],
    servicios_incluidos: ['Guía', 'Seguro'],
    servicios_no_incluidos: ['Comida'],
    itinerario: 'Dia 1: Llegada, Dia 2: Laguna de los tres', // as string
    cupo_maximo: 10,
    precio: 500,
    moneda: 'USD',
    requiere_experiencia: true
  } as unknown as Salida

  const campaignContext: CampaignContext = {
    // formato doesn't exist on CampaignContext
    estado_grupo: null,
    frecuencia_prevista: null
  }

  // Omitted carrusel call since the import isn't found
  console.log('CampaignContext:', campaignContext)
  console.log('Salida:', salidaItinerario)
}

run().catch(console.error)
