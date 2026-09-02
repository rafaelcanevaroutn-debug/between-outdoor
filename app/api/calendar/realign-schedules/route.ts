import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ScheduleUpdateItem {
  id: string
  scheduledAt: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json().catch(() => null) as { updates?: unknown } | null
    if (!body || !Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json({ error: 'Se requiere una lista de actualizaciones (updates)' }, { status: 400 })
    }

    const updates = body.updates as ScheduleUpdateItem[]
    const now = Date.now()
    const minFutureMs = now + 5 * 60_000

    // Validar cada elemento antes de actualizar
    const validated: { id: string; scheduledAt: string }[] = []
    for (const item of updates) {
      if (!item || typeof item.id !== 'string' || !item.id.trim()) continue
      if (typeof item.scheduledAt !== 'string' || !item.scheduledAt.trim()) continue

      const targetDate = new Date(item.scheduledAt)
      if (Number.isNaN(targetDate.getTime())) {
        return NextResponse.json({ error: `Fecha inválida para la pieza ${item.id}` }, { status: 400 })
      }
      if (targetDate.getTime() <= minFutureMs) {
        return NextResponse.json({
          error: `El nuevo horario para la pieza ${item.id} debe ser al menos 5 minutos hacia adelante`,
        }, { status: 400 })
      }

      validated.push({ id: item.id.trim(), scheduledAt: targetDate.toISOString() })
    }

    if (validated.length === 0) {
      return NextResponse.json({ error: 'No se encontraron actualizaciones válidas' }, { status: 400 })
    }

    const admin = createAdminClient()
    const pieceIds = validated.map(v => v.id)

    // Verificar si alguna de las piezas ya fue publicada/enviada a redes
    const { data: activePublications, error: pubError } = await admin
      .from('content_publications')
      .select('contenido_id, status')
      .in('contenido_id', pieceIds)
      .eq('user_id', user.id)
      .in('status', ['syncing', 'published'])

    if (pubError) {
      return NextResponse.json({ error: 'Error verificando estado de publicaciones' }, { status: 500 })
    }

    const lockedPieceIds = new Set((activePublications ?? []).map(p => p.contenido_id))
    const updatable = validated.filter(v => !lockedPieceIds.has(v.id))

    const nowIso = new Date().toISOString()
    const updatedRows: Array<{ id: string; scheduled_at: string }> = []

    // Actualizar cada pieza
    for (const item of updatable) {
      const { data, error } = await admin
        .from('contenido_generado')
        .update({ scheduled_at: item.scheduledAt, updated_at: nowIso })
        .eq('id', item.id)
        .eq('user_id', user.id)
        .select('id, scheduled_at')
        .maybeSingle()

      if (!error && data) {
        updatedRows.push(data)
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedRows.length,
      updated: updatedRows,
    })
  } catch (error) {
    console.error('Error en realign-schedules:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error al reacomodar horarios',
    }, { status: 500 })
  }
}
