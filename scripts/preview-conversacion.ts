import { createClient } from '@supabase/supabase-js'
import { generateAdaptiveCarrusel } from '../lib/generators/carrusel-formato'

async function main() {
  const salidaId = process.argv[2]
  const count = Math.min(4, Math.max(1, Number(process.argv[3] ?? 1)))
  if (!salidaId) throw new Error('Uso: preview-conversacion.ts <salida-id>')
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
  const outputs = []
  const avoidConversationLines: string[] = []
  for (let index = 0; index < count; index++) {
    const output = await generateAdaptiveCarrusel({
      formato: 'conversacion',
      salida,
      niche: profile?.niche ?? 'trekking',
      clientName: profile?.company_name || profile?.full_name || 'Caminantes de montaña',
      clientOnboarding: onboarding ?? null,
      objetivo: 'convertir',
      carpeta: 'Chalten/Paisajes',
      mesAnio: 'diciembre 2026',
      avoidConversationLines,
      variantIndex: index + 1,
      variantCount: count,
      avoidAngles: outputs.map(item => item.angulo),
    })
    avoidConversationLines.push(...output.slides.flatMap(slide => slide.texto_principal ? [slide.texto_principal] : []))
    outputs.push({
      angulo: output.angulo,
      descripcion: output.descripcion_post,
      slides: output.slides.map(slide => ({
        n: slide.n_slide,
        tipo: slide.tipo,
        hablante: slide.hablante,
        texto: slide.texto_principal,
        apoyo: slide.texto_apoyo,
        imagen: slide.indicacion_imagen,
      })),
      cta: output.cta_comentario,
    })
  }
  process.stdout.write(`${JSON.stringify(outputs, null, 2)}\n`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
