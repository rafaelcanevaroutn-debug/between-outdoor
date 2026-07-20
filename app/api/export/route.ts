import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Papa from 'papaparse'
import type { CSVRow } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const salidaId = searchParams.get('salidaId')
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    const admin = createAdminClient()
    const [{ data: contenido }, { data: salida }] = await Promise.all([
      admin.from('contenido_generado').select('*').eq('salida_id', salidaId).order('created_at'),
      admin.from('salidas').select('nombre').eq('id', salidaId).single(),
    ])

    if (!contenido || contenido.length === 0) {
      return NextResponse.json({ error: 'Sin contenido para exportar' }, { status: 404 })
    }

    const clientName = profile?.company_name || profile?.full_name || 'Cliente'

    const rows: CSVRow[] = contenido.map(item => ({
      Cliente: clientName,
      Mes: item.mes || '',
      Formato: item.formato || '',
      'Formato Carrusel': item.formato_carrusel || '',
      Objetivo: item.objetivo_interaccion || '',
      Ángulo: item.angulo || '',
      'Descripción Post': item.descripcion_post || '',
      'Video Crudo': item.video_crudo || '',
      Título: item.titulo || '',
      Subtítulo: item.subtitulo || '',
      Bullets: Array.isArray(item.bullets) ? item.bullets.join(' | ') : '',
      CTA: item.cta_comentario || item.cta || '',
      Slides: Array.isArray(item.slides_data)
        ? item.slides_data.map((slide: { n_slide?: number; hablante?: string | null; pill_text?: string | null; texto_principal?: string | null; texto_apoyo?: string | null; indicacion_imagen?: string | null }) => [
            `Slide ${slide.n_slide ?? ''}`,
            slide.hablante || slide.pill_text,
            slide.texto_principal || '[SOLO FOTO]',
            slide.texto_apoyo,
            slide.indicacion_imagen ? `Imagen: ${slide.indicacion_imagen}` : null,
          ].filter(Boolean).join(' — ')).join('\n')
        : '',
      Fuentes: Array.isArray(item.generation_metadata?.fuentes)
        ? JSON.stringify(item.generation_metadata.fuentes)
        : '',
    }))

    const csv = Papa.unparse(rows, { quotes: true, delimiter: ',', newline: '\n' })
    const fileName = `contenido_${(salida?.nombre || 'salida').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al exportar' },
      { status: 500 }
    )
  }
}
