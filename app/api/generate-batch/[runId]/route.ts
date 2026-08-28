import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CalendarBatchResult } from '@/types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const admin = createAdminClient()
  const { data: run } = await admin
    .from('calendar_batch_runs')
    .select('id, user_id, calendar_code, status, result, error, created_at, updated_at')
    .eq('id', runId)
    .single()

  if (!run) return NextResponse.json({ error: 'Corrida no encontrada' }, { status: 404 })
  if (run.user_id !== user.id && callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  return NextResponse.json(run)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const admin = createAdminClient()
  const { data: run, error: runError } = await admin
    .from('calendar_batch_runs')
    .select('id, user_id, status, result')
    .eq('id', runId)
    .maybeSingle()

  if (runError) return NextResponse.json({ error: 'No se pudo cargar el calendario' }, { status: 500 })
  if (!run) return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 })
  if (run.user_id !== user.id && callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (run.status === 'pending' || run.status === 'running') {
    return NextResponse.json({ error: 'Esperá a que termine la generación antes de vaciar el calendario' }, { status: 409 })
  }

  const runResult = run.result as CalendarBatchResult | null
  const contentIds = [...new Set(
    (runResult?.slots ?? [])
      .map(slot => slot.contenidoId)
      .filter((id): id is string => Boolean(id)),
  )]

  if (contentIds.length === 0) return NextResponse.json({ deleted: 0 })

  const { data: activePublications, error: publicationsError } = await admin
    .from('content_publications')
    .select('id, status')
    .in('contenido_id', contentIds)
    .in('status', ['preparing', 'syncing', 'draft', 'scheduled', 'published'])
    .limit(1)

  if (publicationsError) {
    return NextResponse.json({ error: 'No se pudo verificar si hay publicaciones programadas' }, { status: 500 })
  }
  if ((activePublications ?? []).length > 0) {
    return NextResponse.json({
      error: 'Hay contenido programado o publicado. Cancelalo antes de vaciar el calendario.',
    }, { status: 409 })
  }

  const { data: deletedRows, error: deleteError } = await admin
    .from('contenido_generado')
    .delete()
    .eq('user_id', run.user_id)
    .in('id', contentIds)
    .select('id')

  if (deleteError) return NextResponse.json({ error: 'No se pudo vaciar el calendario' }, { status: 500 })

  return NextResponse.json({ deleted: deletedRows?.length ?? 0 })
}
