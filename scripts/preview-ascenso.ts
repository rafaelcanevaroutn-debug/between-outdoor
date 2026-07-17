import { createClient } from '@supabase/supabase-js'
import { generateAdaptiveCarrusel } from '../lib/generators/carrusel-formato'

async function main() {
  const salidaId = process.argv[2]
  const declaredChanges = process.argv[3]?.trim() || null
  if (!salidaId) throw new Error('Uso: preview-ascenso.ts <salida-id>')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de Supabase')

  const db = createClient(url, key)
  const { data: salida, error } = await db.from('salidas').select('*').eq('id', salidaId).single()
  if (error) throw error
  const [{ data: onboarding }, { data: profile }] = await Promise.all([
    db.from('client_onboarding').select('*').eq('user_id', salida.user_id).single(),
    db.from('profiles').select('company_name, full_name, niche').eq('id', salida.user_id).single(),
  ])

  const simulatedPast = {
    ...salida,
    fecha_inicio: '2025-12-27',
    fecha_fin: '2026-01-02',
    estado: 'completada',
  }
  const output = await generateAdaptiveCarrusel({
    formato: 'ascenso',
    salida,
    sourcePastSalida: simulatedPast,
    sourcePastItineraryConfirmed: true,
    sourcePastChanges: declaredChanges,
    futureRelatedSalida: salida,
    niche: profile?.niche ?? 'trekking',
    clientName: profile?.company_name || profile?.full_name || 'Caminantes de montaña',
    clientOnboarding: onboarding ?? null,
    objetivo: 'convertir',
    carpeta: 'SIMULACIÓN SIN FOTOS',
    mesAnio: 'diciembre 2026',
  })

  process.stdout.write(`${JSON.stringify({
    simulacion: true,
    fuenteConfirmada: true,
    cambiosDeclarados: declaredChanges,
    angulo: output.angulo,
    descripcion: output.descripcion_post,
    slides: output.slides.map(slide => ({
      n: slide.n_slide,
      rol: slide.rol,
      tipo: slide.tipo,
      texto: slide.texto_principal,
      apoyo: slide.texto_apoyo,
    })),
    cta: output.cta_comentario,
  }, null, 2)}\n`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
