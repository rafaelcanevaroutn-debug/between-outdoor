import { createAdminClient } from '../lib/supabase/admin.ts'
import { generateContentForSalida } from '../lib/gemini.ts'
import type { Salida, ClientOnboarding, Profile } from '../types/index.ts'

async function main() {
  const admin = createAdminClient()

  console.log('[TEST] Buscando salida local de referencia "Horco Molle"...')
  const { data: salidas, error } = await admin
    .from('salidas')
    .select('*')
    .ilike('nombre', '%horco molle%')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !salidas || salidas.length === 0) {
    console.error('No se encontró salida para Horco Molle:', error)
    return
  }

  const salida = salidas[0] as Salida
  console.log(`[TEST] Salida encontrada: "${salida.nombre}" (ID: ${salida.id})`)
  console.log(`[TEST] Destino: ${salida.destino} | Tipo: ${salida.tipo_viaje} | Días: ${salida.dias_semana?.join(', ')}`)
  console.log(`[TEST] Punto de encuentro: ${salida.punto_encuentro} | Hora: ${salida.hora_encuentro}`)

  // Cargar perfil y onboarding
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', salida.user_id)
    .single()

  const { data: onboarding } = await admin
    .from('client_onboarding')
    .select('*')
    .eq('user_id', salida.user_id)
    .maybeSingle()

  const niche = (profile?.niche || 'trekking') as any
  const clientName = profile?.company_name || profile?.full_name || 'Guía Outdoor'

  console.log(`[TEST] Cliente: "${clientName}" | Nicho: ${niche}`)
  console.log(`\n[TEST] ════════════════════════════════════════════════════════════════════`)
  console.log(`[TEST] Generando 5 copys para una semana de contenido (SOLO TEXTO / CERO RENDERS)`)
  console.log(`[TEST] ════════════════════════════════════════════════════════════════════\n`)

  const pieces = await generateContentForSalida(
    salida,
    {}, // sin carpetas de Drive (solo texto)
    [], // knowledgeBase DB vacía para usar el nuevo sistema de archivos knowledge/
    niche,
    clientName,
    [], // sin ejemplos TikTok externos
    'vender_salida',
    {},
    5, // 5 piezas para la semana
    onboarding as ClientOnboarding | null
  )

  console.log('\n\n════════════════════════════════════════════════════════════════════════════')
  console.log('                 RESULTADOS: COPYS DE LA SEMANA GENERADOS                   ')
  console.log('════════════════════════════════════════════════════════════════════════════\n')

  pieces.forEach((piece: any, index: number) => {
    console.log(`┌── [PIEZA ${index + 1}/5] Vertical: ${piece.vertical?.toUpperCase() || 'GENERAL'} ${piece.subvertical ? '(' + piece.subvertical + ')' : ''}`)
    console.log(`│ Formato sugerido: ${piece.formato || 'post'}`)
    console.log(`│ HOOK / TÍTULO: "${piece.titulo}"`)
    console.log(`│ SUBTÍTULO:     "${piece.subtitulo}"`)
    console.log(`│ BULLETS:`)
    if (Array.isArray(piece.bullets)) {
      piece.bullets.forEach((b: string) => console.log(`│   • ${b}`))
    }
    console.log(`│ CTA:           "${piece.cta}"`)
    console.log(`└──────────────────────────────────────────────────────────────────────────\n`)
  })
}

main().catch(err => {
  console.error('[TEST ERROR]:', err)
  process.exit(1)
})
