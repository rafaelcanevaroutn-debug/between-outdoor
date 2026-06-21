import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, DEMO_PROFILE } from '@/lib/supabase/admin'
import Papa from 'papaparse'
import type { CSVRow } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const salidaId = searchParams.get('salidaId')
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })

    const supabase = createAdminClient()

    const [{ data: contenido }, { data: salida }] = await Promise.all([
      supabase.from('contenido_generado').select('*').eq('salida_id', salidaId).order('created_at'),
      supabase.from('salidas').select('nombre').eq('id', salidaId).single(),
    ])
    const profile = DEMO_PROFILE

    if (!contenido || contenido.length === 0) {
      return NextResponse.json({ error: 'Sin contenido para exportar' }, { status: 404 })
    }

    const clientName = profile.company_name || profile.full_name || 'Cliente'

    const rows: CSVRow[] = contenido.map(item => ({
      Cliente: clientName,
      Mes: item.mes || '',
      'Video Crudo': item.video_crudo || '',
      Título: item.titulo || '',
      Subtítulo: item.subtitulo || '',
      Bullets: Array.isArray(item.bullets) ? item.bullets.join(' | ') : '',
      CTA: item.cta || '',
    }))

    const csv = Papa.unparse(rows, {
      quotes: true,
      delimiter: ',',
      newline: '\n',
    })

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
