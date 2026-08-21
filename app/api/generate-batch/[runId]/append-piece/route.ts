import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params
    const { contenidoIds } = await request.json()
    
    if (!contenidoIds || !Array.isArray(contenidoIds) || contenidoIds.length === 0) {
      return NextResponse.json({ error: 'Se requieren contenidoIds' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!callerProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const admin = createAdminClient()
    
    // 1. Check if run exists and user has access
    const { data: run } = await admin
      .from('calendar_batch_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (!run) return NextResponse.json({ error: 'Corrida no encontrada' }, { status: 404 })
    if (run.user_id !== user.id && callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // 2. Fetch the newly generated content rows
    const { data: contenidoRows } = await admin
      .from('contenido_generado')
      .select('*')
      .in('id', contenidoIds)
      
    if (!contenidoRows || contenidoRows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron las piezas de contenido' }, { status: 404 })
    }

    // 3. Append to run.result.slots
    const currentResult = run.result || { slots: [], errors: [] }
    const currentSlots = Array.isArray(currentResult.slots) ? currentResult.slots : []
    const nextIndex = currentSlots.length > 0 ? Math.max(...currentSlots.map((s: any) => s.index ?? 0)) + 1 : 0

    const newSlots = contenidoRows.map((row, i) => ({
      index: nextIndex + i,
      label: 'Pieza Extra',
      formatoCarrusel: row.formato_carrusel || row.formato,
      outcome: 'generated',
      contenidoId: row.id,
      salidaId: row.salida_id
    }))

    const updatedResult = {
      ...currentResult,
      slots: [...currentSlots, ...newSlots]
    }

    const { error: updateError } = await admin
      .from('calendar_batch_runs')
      .update({ result: updatedResult, updated_at: new Date().toISOString() })
      .eq('id', runId)

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar el calendario: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, added: newSlots.length })
  } catch (error) {
    console.error('[APPEND_PIECE] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
