import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import WeeklyBatchPanel from '@/components/calendario/WeeklyBatchPanel'
import type { CalendarBatchRun, CalendarCode, ContenidoGenerado, Salida } from '@/types'
import SemanaGenerada from '@/components/calendario/SemanaGenerada'
import SemanaGeneradaPieceCell from '@/components/calendario/SemanaGeneradaPieceCell'

const FORMAT_LABELS: Record<string, string> = {
  editorial: 'Editorial',
  organico: 'Orgánico',
  itinerario: 'Itinerario',
  ascenso: 'Ascenso',
  calendario: 'Fechas',
  lugar: 'Lugar',
  conversacion: 'Conversación',
}

export default async function CalendarioPage({searchParams}: {searchParams: Promise<{pieza?: string}>}) {
  const {pieza: highlightedPieceId} = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: runRows }, { data: salidasForPicker }] = await Promise.all([
    supabase.from('profiles').select('calendario_asignado').eq('id', user.id).single(),
    supabase.from('calendar_batch_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('salidas').select('id, nombre, fecha_inicio, estado, carpeta_fotos_id, carpeta_videos_id').eq('user_id', user.id).order('fecha_inicio'),
  ])

  if (highlightedPieceId) {
    const {data: highlightedPiece} = await supabase
      .from('contenido_generado')
      .select('*')
      .eq('id', highlightedPieceId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (highlightedPiece) {
      const salidaNombre = salidasForPicker?.find(salida => salida.id === highlightedPiece.salida_id)?.nombre ?? 'Salida'
      return (
        <div className="flex max-w-md flex-col gap-5">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--cardon)]">Pieza generada</p>
            <h1 className="text-[20px] font-bold text-[var(--tinta)]">Revisá y aprobá desde el calendario</h1>
          </div>
          <SemanaGeneradaPieceCell pieza={highlightedPiece as ContenidoGenerado} salidaNombre={salidaNombre} initiallyOpen />
          <Link href="/calendario" className="text-sm font-semibold text-[var(--cardon)] hover:underline">Volver al calendario semanal →</Link>
        </div>
      )
    }
  }

  const calendarCode = (profile?.calendario_asignado ?? 'CAL-00') as CalendarCode
  const calendar = CALENDAR_CATALOG[calendarCode]
  const runs = (runRows ?? []) as CalendarBatchRun[]
  const latestRun = runs[0] ?? null
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const startOfWeek = new Date(now.setDate(diff))
  startOfWeek.setHours(0, 0, 0, 0)

  const latestCompletedRun = runs.find(r => {
    if (r.status !== 'completed' || !r.result) return false
    const runDate = new Date(r.created_at)
    return runDate >= startOfWeek
  }) ?? null

  let verifiedRunToDisplay: CalendarBatchRun | null = null

  if (latestCompletedRun) {
    const contenidoIds = (latestCompletedRun.result?.slots ?? [])
      .filter((slot: any) => slot.outcome === 'generated' && Boolean(slot.contenidoId))
      .map((slot: any) => slot.contenidoId)

    if (contenidoIds.length > 0) {
      // Verificar que realmente existen en la DB (por si fueron eliminadas manualmente)
      const { count } = await supabase
        .from('contenido_generado')
        .select('*', { count: 'exact', head: true })
        .in('id', contenidoIds)

      if (count && count > 0) {
        verifiedRunToDisplay = latestCompletedRun
      }
    }
  }

  if (verifiedRunToDisplay && !isActiveRun(latestRun)) {
    return <SemanaGenerada latestRun={verifiedRunToDisplay} />
  }

  return (
    <div>
      <WeeklyBatchPanel
        calendarCode={calendarCode}
        calendarName={calendar.nombre}
        initialRun={latestRun}
        salidas={salidasForPicker ?? []}
      />
    </div>
  )
}

function isActiveRun(run: CalendarBatchRun | null) {
  return run?.status === 'pending' || run?.status === 'running'
}
