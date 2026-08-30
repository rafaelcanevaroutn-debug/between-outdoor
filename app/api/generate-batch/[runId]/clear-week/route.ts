import {NextResponse} from 'next/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {createClient} from '@/lib/supabase/server'

function startOfCurrentWeek() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function DELETE(_request: Request, {params}: {params: Promise<{runId: string}>}) {
  const {runId} = await params
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const {data: callerProfile} = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!callerProfile) return NextResponse.json({error: 'Perfil no encontrado'}, {status: 404})

  const admin = createAdminClient()
  const {data: requestedRun, error: requestedRunError} = await admin
    .from('calendar_batch_runs')
    .select('id, user_id')
    .eq('id', runId)
    .maybeSingle()

  if (requestedRunError) return NextResponse.json({error: 'No pudimos verificar el calendario.'}, {status: 500})
  if (!requestedRun) return NextResponse.json({error: 'Calendario no encontrado'}, {status: 404})
  if (requestedRun.user_id !== user.id && callerProfile.role !== 'admin') {
    return NextResponse.json({error: 'No autorizado'}, {status: 403})
  }

  // Se limpian todas las corridas completas de la semana. Si elimináramos solo
  // la última, la pantalla volvería a mostrar inmediatamente la corrida anterior.
  const {data: weekRuns, error: weekRunsError} = await admin
    .from('calendar_batch_runs')
    .select('id, result')
    .eq('user_id', requestedRun.user_id)
    .eq('status', 'completed')
    .gte('created_at', startOfCurrentWeek().toISOString())

  if (weekRunsError) return NextResponse.json({error: 'No pudimos leer la semana.'}, {status: 500})

  const runs = weekRuns ?? []
  const contentIds = [...new Set(runs.flatMap(run => {
    const result = run.result as {slots?: Array<{contenidoId?: string}>} | null
    return (result?.slots ?? [])
      .map(slot => slot.contenidoId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  }))]

  if (contentIds.length > 0) {
    const {error: contentDeleteError} = await admin
      .from('contenido_generado')
      .delete()
      .eq('user_id', requestedRun.user_id)
      .in('id', contentIds)
    if (contentDeleteError) {
      return NextResponse.json({error: 'No pudimos borrar las piezas. No se modificó el historial.'}, {status: 500})
    }
  }

  const runIds = runs.map(run => run.id)
  if (runIds.length > 0) {
    const {error: runsDeleteError} = await admin
      .from('calendar_batch_runs')
      .delete()
      .eq('user_id', requestedRun.user_id)
      .in('id', runIds)
    if (runsDeleteError) {
      return NextResponse.json({error: 'Las piezas se borraron, pero no pudimos limpiar el historial.'}, {status: 500})
    }
  }

  return NextResponse.json({ok: true, deletedPieces: contentIds.length, deletedRuns: runIds.length})
}
