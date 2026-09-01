import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params
    const { oldContenidoId, newContenidoId } = await request.json()

    if (!oldContenidoId || !newContenidoId) {
      return NextResponse.json({ error: 'Se requieren oldContenidoId y newContenidoId' }, { status: 400 })
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

    const currentResult = run.result || { slots: [], errors: [], remakesUsed: 0 }
    if ((currentResult.remakesUsed || 0) >= 5) {
      return NextResponse.json({ error: 'Límite de 5 rehaceres alcanzado para esta semana' }, { status: 403 })
    }

    // 2. Fetch both rows
    const { data: oldRow } = await admin.from('contenido_generado').select('*').eq('id', oldContenidoId).maybeSingle()
    const { data: newRow } = await admin.from('contenido_generado').select('*').eq('id', newContenidoId).maybeSingle()

    // Verificar si la pieza anterior ya fue publicada
    const { count: publicationCount } = await admin
      .from('content_publications')
      .select('*', { count: 'exact', head: true })
      .eq('contenido_id', oldContenidoId)
    
    if (publicationCount && publicationCount > 0) {
      return NextResponse.json({ error: 'La pieza ya ha sido programada o publicada y no puede rehacerse' }, { status: 403 })
    }

    if (!newRow) {
      return NextResponse.json({ error: 'No se encontró la pieza nueva' }, { status: 404 })
    }

    // Si la pieza anterior existe, le transferimos el horario de publicación a la nueva
    if (oldRow && oldRow.scheduled_at) {
      await admin
        .from('contenido_generado')
        .update({ scheduled_at: oldRow.scheduled_at })
        .eq('id', newContenidoId)
    }

    // 3. Update slot in run.result.slots
    const currentSlots = Array.isArray(currentResult.slots) ? currentResult.slots : []
    const slotIndex = currentSlots.findIndex((s: any) => s.contenidoId === oldContenidoId)
    
    if (slotIndex === -1) {
       return NextResponse.json({ error: 'La pieza anterior no se encontró en el calendario' }, { status: 404 })
    }

    currentSlots[slotIndex] = {
      ...currentSlots[slotIndex],
      formatoContenido: newRow.formato === 'banner' ? 'banner' : newRow.formato === 'video' ? 'video' : 'carrusel',
      formatoCarrusel: newRow.formato_carrusel || newRow.formato,
      contenidoId: newRow.id,
      salidaId: newRow.salida_id
    }

    const updatedResult = {
      ...currentResult,
      slots: currentSlots,
      remakesUsed: (currentResult.remakesUsed || 0) + 1
    }

    const { error: updateError } = await admin
      .from('calendar_batch_runs')
      .update({ result: updatedResult, updated_at: new Date().toISOString() })
      .eq('id', runId)

    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar el calendario: ' + updateError.message }, { status: 500 })
    }

    // Delete the old row to clean up
    if (oldRow) {
      await admin.from('contenido_generado').delete().eq('id', oldContenidoId)
    }

    return NextResponse.json({ success: true, remakesUsed: updatedResult.remakesUsed })
  } catch (error) {
    console.error('[REPLACE_PIECE] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
