import { generateContentForSalida } from '../lib/gemini.ts'
import type { Salida, ClientOnboarding } from '../types/index.ts'

interface TestCase {
  id: string
  name: string
  salida: Salida
  niche: 'trekking' | 'turismo_aventura'
  onboarding: ClientOnboarding | null
  subverticalMap?: Record<string, string>
  forbiddenWords: string[]
  requiredThemes?: string[]
}

async function runTestCase(testCase: TestCase) {
  console.log(`\n${'═'.repeat(80)}`)
  console.log(`🧪 EJECUTANDO TEST: ${testCase.name}`)
  console.log(`📍 Destino: ${testCase.salida.destino} | Tipo de viaje: ${testCase.salida.tipo_viaje}`)
  console.log(`🎯 Nicho: ${testCase.niche}`)
  console.log(`${'═'.repeat(80)}\n`)

  const pieces = await generateContentForSalida(
    testCase.salida,
    {},
    [],
    testCase.niche,
    'Between Outdoor Demo',
    [],
    'vender_salida',
    testCase.subverticalMap ?? {},
    2, // 2 piezas por caso para auditar variación y consistencia
    testCase.onboarding,
    'video' // Formato video solicitado explícitamente
  )

  console.log(`\n📋 PIEZAS GENERADAS PARA: ${testCase.name}`)
  let hasFailures = false

  pieces.forEach((piece: any, idx: number) => {
    console.log(`\n  ┌── [Pieza ${idx + 1}] Vertical: ${piece.vertical ?? 'N/A'}`)
    console.log(`  │ Formato: ${piece.formato}`)
    console.log(`  │ HOOK / TÍTULO: "${piece.titulo}"`)
    console.log(`  │ SUBTÍTULO / TOMA: "${piece.subtitulo}"`)
    console.log(`  │ DESCRIPCIÓN POST: "${piece.descripcion_post}"`)
    console.log(`  │ BULLETS: ${JSON.stringify(piece.bullets)}`)
    console.log(`  │ CTA: "${piece.cta}"`)
    console.log(`  └──────────────────────────────────────────────────────────`)

    // Verificación 1: Prohibición de bullets en video
    if (Array.isArray(piece.bullets) && piece.bullets.length > 0) {
      console.error(`  ❌ FALLA DETECTADA: La pieza de video contiene bullets (${piece.bullets.length} viñetas). Los videos nunca deben llevar bullets.`);
      hasFailures = true
    } else {
      console.log(`  ✅ OK: Video sin bullets.`);
    }

    // Verificación 2: Contaminación de palabras prohibidas
    const fullText = `${piece.titulo} ${piece.subtitulo} ${piece.descripcion_post || ''} ${piece.cta}`.toLowerCase()
    const detectedForbidden = testCase.forbiddenWords.filter(word => fullText.includes(word.toLowerCase()))
    if (detectedForbidden.length > 0) {
      console.error(`  ❌ CONTAMINACIÓN CRUZADA / TÉRMINO PROHIBIDO DETECTADO: Se encontraron términos prohibidos: ${detectedForbidden.join(', ')}`);
      hasFailures = true
    } else {
      console.log(`  ✅ OK: Cero contaminación cruzada.`);
    }

    // Verificación 3: Regla de Horco Molle (nombre completo, nunca solo "HORCO")
    if (testCase.id === 'trekking_local') {
      const loneHorcoMatch = fullText.match(/\bhorco\b(?!\s+molle)/i)
      if (loneHorcoMatch) {
        console.error(`  ❌ FALLA DE REGLA HORCO MOLLE: Se encontró 'HORCO' sin 'MOLLE'. Debe usarse siempre la frase completa 'HORCO MOLLE'.`);
        hasFailures = true
      } else {
        console.log(`  ✅ OK: Regla 'HORCO MOLLE' respetada.`);
      }
    }

    // Verificación 4: Longitud del hook
    const hookWords = (piece.titulo || '').trim().split(/\s+/).length
    if (hookWords > 12) {
      console.warn(`  ⚠️ ADVERTENCIA: El hook tiene ${hookWords} palabras (ideal < 10 palabras).`);
    } else {
      console.log(`  ✅ OK: Hook conciso (${hookWords} palabras).`);
    }
  })

  return !hasFailures
}

function createMockSalida(overrides: Partial<Salida> & Pick<Salida, 'id' | 'user_id' | 'nombre' | 'destino' | 'tipo_viaje'>): Salida {
  return {
    pais_codigo: 'AR',
    fecha_inicio: '2026-03-15',
    fecha_fin: '2026-03-15',
    precio_usd: 100,
    sena_usd: 20,
    nivel: 'baja',
    cupos: 10,
    link_inscripcion: null,
    itinerario: null,
    itinerario_dias: [],
    puntos_interes: [],
    que_incluye: null,
    que_no_incluye: null,
    estado: 'activa',
    moneda: 'USD',
    dias_semana: null,
    hora_encuentro: null,
    punto_encuentro: null,
    frecuencia: null,
    lugares_recurrentes: null,
    grupo_info: null,
    carpeta_fotos_id: null,
    carpeta_fotos_nombre: null,
    carpeta_videos_id: null,
    carpeta_videos_nombre: null,
    zona_geografica: null,
    context_tags: null,
    sheets_exported_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockOnboarding(overrides: Partial<ClientOnboarding> & { user_id: string }): ClientOnboarding {
  const { user_id, ...rest } = overrides
  return {
    user_id,
    avatar_edad_genero: null,
    avatar_experiencia: null,
    avatar_objeciones: null,
    avatar_motor: null,
    marca_personalidad: null,
    marca_lineas_rojas: null,
    marca_autoridad: null,
    marca_testimonios: null,
    objetivos_corto_plazo: null,
    servicios_estrella: null,
    servicios_moneda: null,
    calendario: null,
    embudo_paso: null,
    material_visual: null,
    completed_at: new Date().toISOString(),
    ...rest,
  }
}

async function main() {
  console.log('🚀 INICIANDO SUITE DE PRUEBAS DE AISLAMIENTO MULTI-VERTICAL (GEMINI REAL)')

  const testCases: TestCase[] = [
    // 1. Trekking Local / Recurrente
    {
      id: 'trekking_local',
      name: 'Trekking Local / Recurrente — Horco Molle (Tucumán)',
      niche: 'trekking',
      salida: createMockSalida({
        id: 'mock-local-1',
        user_id: 'mock-user',
        nombre: 'Grupo Semanal Trekking Horco Molle',
        destino: 'Horco Molle',
        tipo_viaje: 'salida_recurrente',
        fecha_inicio: '2026-03-15',
        fecha_fin: '2026-03-15',
        precio_usd: 15,
        sena_usd: 5,
        nivel: 'baja',
        cupos: 15,
        zona_geografica: 'NOA',
        punto_encuentro: 'Rotonda de Horco Molle',
        hora_encuentro: '16:00',
        dias_semana: ['martes', 'jueves'],
        lugares_recurrentes: ['Horco Molle', 'San Javier'],
        itinerario: 'Caminata aeróbica y senderismo por yungas de baja dificultad',
        que_incluye: 'Guía de grupo, hidratación y coordinación',
      }),
      onboarding: createMockOnboarding({
        user_id: 'mock-user',
        content_profile: 'grupo_recurrente_local',
        campaign_context: {
          territorio: 'Yerba Buena, Tucumán',
          actividad: 'Trekking en grupo',
          punto_encuentro: 'Rotonda de Horco Molle',
          cta_primario: 'comentario',
          frecuencia_confirmada: true,
          dias_confirmados: ['martes', 'jueves'],
        },
        marca_personalidad: 'Cercano, motivador, comunitario y terrenal',
      }),
      forbiddenWords: ['cumbre', 'hazaña', 'hielo', 'crampones', 'vuelos', 'all inclusive', 'resort', 'caribe', 'mandanos un dm'],
    },

    // 2. Trekking Expedición / Alta Montaña
    {
      id: 'trekking_expedicion',
      name: 'Trekking Expedición / Alta Montaña — El Chaltén (Santa Cruz)',
      niche: 'trekking',
      salida: createMockSalida({
        id: 'mock-expedicion-1',
        user_id: 'mock-user',
        nombre: 'Expedición Fitz Roy y Laguna de los Tres',
        destino: 'El Chaltén',
        tipo_viaje: 'expedicion_premium',
        fecha_inicio: '2026-11-10',
        fecha_fin: '2026-11-15',
        precio_usd: 850,
        sena_usd: 150,
        nivel: 'alta',
        cupos: 8,
        zona_geografica: 'Patagonia',
        itinerario: 'Día 1: Arribo y briefing. Día 2: Laguna Capri y Poincenot. Día 3: Laguna de los Tres (Fitz Roy). Día 4: Laguna Torre. Día 5: Regreso.',
        que_incluye: 'Guía de montaña EPGAMT, carpas 4 estaciones, todas las comidas en campamento y transfer desde El Calafate.',
      }),
      onboarding: createMockOnboarding({
        user_id: 'mock-user',
        content_profile: 'standard_outdoor',
        marca_personalidad: 'Técnico, respetuoso de la montaña, inspirador pero seguro',
      }),
      forbiddenWords: ['martes a las 16', 'después del trabajo', 'salida periurbana', 'all inclusive', 'resort', 'playa', 'mar turquesa', 'itinerario'],
    },


    // 3. Viajes Internacionales — Playa y Caribe
    {
      id: 'playa_caribe',
      name: 'Viaje Internacional — Cancún y Playa del Carmen (México)',
      niche: 'turismo_aventura',
      salida: createMockSalida({
        id: 'mock-caribe-1',
        user_id: 'mock-user',
        nombre: 'Caribe Relax: Cancún y Playa del Carmen',
        destino: 'Cancún y Playa del Carmen',
        tipo_viaje: 'viaje_playa_caribe',
        fecha_inicio: '2026-10-05',
        fecha_fin: '2026-10-12',
        precio_usd: 1200,
        sena_usd: 200,
        nivel: 'baja',
        cupos: 12,
        itinerario: '7 días de resort frente al mar, excursión a cenotes sagrados, snorkel en arrecife y tiempo libre de relax.',
        que_incluye: 'Vuelos, hotel all-inclusive 5 estrellas, traslados privados in/out y pase a cenotes.',
      }),
      onboarding: createMockOnboarding({
        user_id: 'mock-user',
        content_profile: 'dupla_viajes_internacionales',
        campaign_context: {
          territorio: 'Caribe Mexicano',
          actividad: 'Playa y Relax',
          cta_primario: 'comentario',
        },
        marca_personalidad: 'Relajado, sensorial, disfrute y desconexión',
      }),
      // Prohibición terminante de vocabulario de montaña/trekking y viejos CTAs
      forbiddenWords: ['trekking', 'sendero', 'desnivel', 'bastones', 'cumbre', 'vivac', 'carpa', 'mochila de marcha', 'epgamt', 'fechas 2026', 'pedí la info'],
    },


    // 4. Viajes Internacionales — Europa y Ciudades Culturales
    {
      id: 'europa_ciudad',
      name: 'Viaje Internacional — Madrid y Roma Cultural (Europa)',
      niche: 'turismo_aventura',
      subverticalMap: { promocional: 'europa_ciudad', conversion: 'europa_ciudad', aspiracional: 'europa_ciudad' },
      salida: createMockSalida({
        id: 'mock-europa-1',
        user_id: 'mock-user',
        nombre: 'Circuito Capitales Europeas: Madrid y Roma',
        destino: 'Madrid y Roma',
        tipo_viaje: 'salida_un_dia', // Tipo genérico para probar resolución por destino/subvertical
        fecha_inicio: '2026-09-18',
        fecha_fin: '2026-09-28',
        precio_usd: 2100,
        sena_usd: 300,
        nivel: 'baja',
        cupos: 10,
        itinerario: '10 días recorriendo museos icónicos (Prado, Vaticano), plazas históricas, gastronomía local y barrios tradicionales.',
        que_incluye: 'Vuelos internacionales, hoteles 4 estrellas céntricos, traslados en tren de alta velocidad y entradas a museos.',
      }),
      onboarding: createMockOnboarding({
        user_id: 'mock-user',
        content_profile: 'dupla_viajes_internacionales',
        marca_personalidad: 'Curioso, sofisticado, cultural y cálido',
      }),
      // Prohibición de montaña Y prohibición de playa
      forbiddenWords: ['trekking', 'sendero', 'desnivel', 'bastones', 'cumbre', 'carpa', 'epgamt', 'all inclusive', 'mar turquesa', 'playa'],
    },


  ]

  let totalPassed = 0
  for (const tc of testCases) {
    const passed = await runTestCase(tc)
    if (passed) totalPassed++
  }

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`🏁 RESUMEN DE PRUEBAS DE AISLAMIENTO: ${totalPassed}/${testCases.length} pasaron exitosamente.`)
  console.log(`${'═'.repeat(80)}\n`)

  if (totalPassed < testCases.length) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error fatal en suite de pruebas:', err)
  process.exit(1)
})
