import { createClient } from '@supabase/supabase-js'
import { generateAdaptiveCarrusel } from '../lib/generators/carrusel-formato'

async function main() {
  const salidaId = process.argv[2]
  if (!salidaId) throw new Error('Uso: preview-calendario.ts <salida-id>')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de Supabase')

  const db = createClient(url, key)
  const { data: salida, error } = await db.from('salidas').select('*').eq('id', salidaId).single()
  if (error) throw error
  const [{ data: onboarding }, { data: profile }, { data: futureRows }] = await Promise.all([
    db.from('client_onboarding').select('*').eq('user_id', salida.user_id).single(),
    db.from('profiles').select('company_name, full_name, niche').eq('id', salida.user_id).single(),
    db.from('salidas').select('*').eq('user_id', salida.user_id).gte('fecha_inicio', '2026-07-16').order('fecha_inicio').limit(3),
  ])

  const common = {
    formato: 'calendario' as const,
    niche: profile?.niche ?? 'trekking',
    clientName: profile?.company_name || profile?.full_name || 'Caminantes de montaña',
    clientOnboarding: onboarding ?? null,
    objetivo: 'guardar' as const,
    carpeta: 'SIMULACIÓN SIN FOTOS',
    mesAnio: 'próximos 60 días',
  }

  const actualFuture = futureRows?.length ? futureRows : [salida]
  const defaultOutput = await generateAdaptiveCarrusel({
    ...common,
    salida,
    futureSalidas: actualFuture,
    holidays: [],
  })

  const holidaySalida = {
    ...salida,
    id: `${salida.id}-simulacion-feriado`,
    fecha_inicio: '2026-12-05',
    fecha_fin: '2026-12-08',
  }
  const holidayOutput = await generateAdaptiveCarrusel({
    ...common,
    salida: holidaySalida,
    futureSalidas: [holidaySalida],
    holidays: [
      { fecha: '2026-12-07', nombre: 'Día no laborable con fines turísticos', tipo: 'turistico', fuente: 'Resolución 164/2025' },
      { fecha: '2026-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'feriado_nacional', fuente: 'Argentina.gob.ar' },
    ],
  })

  const present = (output: typeof defaultOutput) => ({
    angulo: output.angulo,
    descripcion: output.descripcion_post,
    slides: output.slides.map(slide => ({
      n: slide.n_slide,
      rol: slide.rol,
      tipo: slide.tipo,
      pill: slide.pill_text,
      texto: slide.texto_principal,
      apoyo: slide.texto_apoyo,
    })),
    cta: output.cta_comentario,
  })

  process.stdout.write(`${JSON.stringify({
    proximas_salidas_reales: present(defaultOutput),
    feriado_simulado: present(holidayOutput),
  }, null, 2)}\n`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
