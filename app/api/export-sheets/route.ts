import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { appendRowsToSheet, readSheetHeaders } from '@/lib/google-sheets'
import { VERTICAL_FORMATO_DEFAULT } from '@/lib/verticals'
import type { Vertical } from '@/types'

/** GET /api/export-sheets — dry run: returns detected headers + column mapping without writing */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const mapping = await readSheetHeaders()
    return NextResponse.json({ mapping })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al leer headers' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { salidaId } = await request.json()
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
    const dry = request.nextUrl.searchParams.get('dry') === 'true'

    const rows = contenido.map(item => {
      const formato = VERTICAL_FORMATO_DEFAULT[item.vertical as Vertical] ?? 'video'
      const isCarrusel = formato === 'carrusel'
      const slides: string[] = Array.isArray(item.slides) ? item.slides as string[] : []

      return {
        cliente:   clientName,
        brand:     'mv',
        mes:       item.mes || '',
        estado:    'Pendiente',
        carpeta:   item.video_crudo || '',
        titulo:    isCarrusel ? '' : (item.titulo || ''),
        subtitulo: isCarrusel ? '' : (item.subtitulo || ''),
        bullets:   isCarrusel ? '' : (Array.isArray(item.bullets)
          ? (item.bullets as string[]).map(b => `• ${b}`).join('\n')
          : ''),
        cta:       item.cta || '',
        formato,
        slide1:    slides[0] ?? '',
        slide2:    slides[1] ?? '',
        slide3:    slides[2] ?? '',
        slide4:    slides[3] ?? '',
        slide5:    slides[4] ?? '',
      }
    })

    if (dry) {
      const mapping = await readSheetHeaders()
      return NextResponse.json({ dry: true, rows, mapping: mapping.fieldMapping })
    }

    const result = await appendRowsToSheet(rows)
    console.log(`[SHEETS] ${result.written} piezas de "${salida?.nombre}" → fila ${result.firstRow}`)
    console.log('[SHEETS] mapping usado:', JSON.stringify(result.mapping.fieldMapping))

    // Mark salida as exported so the button becomes inactive
    await admin.from('salidas').update({ sheets_exported_at: new Date().toISOString() }).eq('id', salidaId)

    return NextResponse.json({ success: true, written: result.written, firstRow: result.firstRow })
  } catch (error) {
    console.error('[SHEETS] Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al exportar' },
      { status: 500 },
    )
  }
}
