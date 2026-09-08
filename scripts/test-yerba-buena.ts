import { createAdminClient } from '../lib/supabase/admin.ts'
import { generateVideoFamilia3 } from '../lib/generators/video-familia-3.ts'
import { generateAdaptiveCarrusel } from '../lib/generators/carrusel-formato.ts'
import type { Salida, VideoFamilia3Subfamilia } from '../types/index.ts'

async function run() {
  const admin = createAdminClient()

  // 1. Buscar la salida
  const { data: salidas, error } = await admin
    .from('salidas')
    .select('*')
    .ilike('destino', '%yerba buena%')
    .limit(1)

  if (error || !salidas || salidas.length === 0) {
    console.error('No se encontró salida para Yerba Buena')
    return
  }
  const salida = salidas[0] as Salida
  console.log(`[TEST] Salida encontrada: ${salida.nombre} (${salida.destino})`)
  console.log(`[TEST] Tipo de viaje: ${salida.tipo_viaje}`)

  // Buscar el perfil
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', salida.user_id)
    .single()

  console.log(`[TEST] Generando Video POV (Familia 3b)...`)
  try {
    const video = await generateVideoFamilia3({
      subfamilia: '3b',
      salida,
      niche: profile?.niche || 'turismo_aventura',
      clientName: profile?.company_name || 'Cliente Test',
      clientOnboarding: null,
      tipografiasPermitidas: ['Playfair Display', 'Inter'],
      clipDurationSeconds: 6,
    })
    console.log(`\n=== RESULTADO VIDEO POV ===`)
    console.log(`COPY: ${video.copy}`)
    console.log(`DESCRIPCIÓN: ${video.descripcion_post}`)
  } catch (err) {
    console.error(`[TEST] Error generando video:`, err)
  }

  console.log(`\n[TEST] Generando Carrusel (Orgánico)...`)
  try {
    const carrusel = await generateAdaptiveCarrusel({
      formato: 'organico',
      salida,
      niche: profile?.niche || 'turismo_aventura',
      clientName: profile?.company_name || 'Cliente Test',
      clientOnboarding: null,
      carpeta: '',
      objetivo: 'convertir',
      mesAnio: 'Noviembre 2026',
    })
    console.log(`\n=== RESULTADO CARRUSEL ===`)
    console.log(`ANGULO: ${carrusel.angulo}`)
    carrusel.slides.forEach(s => {
      console.log(`[Slide ${s.n_slide} - ${s.rol}] ${s.texto_principal} ${s.texto_apoyo ? '(' + s.texto_apoyo + ')' : ''}`)
    })
    console.log(`DESCRIPCIÓN: ${carrusel.descripcion_post}`)
  } catch (err) {
    console.error(`[TEST] Error generando carrusel:`, err)
  }
}

run().catch(console.error)
