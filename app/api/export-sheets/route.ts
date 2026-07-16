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

    console.log(`[SHEETS] Exportando ${contenido.length} piezas de salidaId=${salidaId}`)

    const rows = contenido.map((item, idx) => {
      // Use the stored formato field; fall back to vertical default only if missing
      const formato = (item.formato as string) || VERTICAL_FORMATO_DEFAULT[item.vertical as Vertical] || 'video'
      const isCarrusel = formato === 'carrusel'

      // Carruseles nuevos: slides_data = [{n_slide, rol, texto_principal, texto_apoyo}]
      // Carruseles legacy: slides = string[] (campo viejo, puede no existir)
      type SlideObj = { n_slide: number; rol: string; hablante?: string | null; pill_text?: string | null; texto_principal: string | null; texto_apoyo: string | null; indicacion_imagen?: string | null }
      const slidesData: SlideObj[] = Array.isArray(item.slides_data) ? (item.slides_data as SlideObj[]) : []
      const slidesLegacy: string[] = Array.isArray(item.slides) ? (item.slides as string[]) : []

      // Prefer slides_data (new); fall back to legacy string array
      const slideTexts: string[] = slidesData.length > 0
        ? slidesData.map(s => [s.hablante || s.pill_text, s.texto_principal || '[SOLO FOTO]', s.texto_apoyo].filter(Boolean).join(' — '))
        : slidesLegacy

      console.log(
        `[SHEETS] [${idx + 1}/${contenido.length}] id=${item.id} | formato_stored=${item.formato ?? '(null)'} | formato_used=${formato} | isCarrusel=${isCarrusel} | slides_data.length=${slidesData.length} | slides_legacy.length=${slidesLegacy.length} | slideTexts.length=${slideTexts.length}`,
      )
      if (slideTexts.length > 0) {
        slideTexts.slice(0, 5).forEach((t, i) => console.log(`[SHEETS]   slide${i + 1}: ${t.slice(0, 80)}`))
      }

      return {
        cliente:   clientName,
        brand:     'mv',
        mes:       item.mes || '',
        estado:    'Pendiente',
        carpeta:   item.video_crudo || '',
        titulo:    isCarrusel ? (item.angulo || '') : (item.titulo || ''),
        subtitulo: isCarrusel ? (item.descripcion_post || '') : (item.subtitulo || ''),
        bullets:   isCarrusel ? slideTexts.map((text, slideIndex) => `Slide ${slideIndex + 1}: ${text}`).join('\n') : (Array.isArray(item.bullets)
          ? (item.bullets as string[]).map(b => `• ${b}`).join('\n')
          : ''),
        cta:       item.cta_comentario || item.cta || '',
        formato:   item.formato_carrusel ? `${formato}_${item.formato_carrusel}` : formato,
        slide1:    slideTexts[0] ?? '',
        slide2:    slideTexts[1] ?? '',
        slide3:    slideTexts[2] ?? '',
        slide4:    slideTexts[3] ?? '',
        slide5:    slideTexts[4] ?? '',
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
