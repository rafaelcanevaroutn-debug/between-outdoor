import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
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

  const [{ data: profile }, { data: branding }, { data: runRows }, { data: salidasForPicker }] = await Promise.all([
    supabase.from('profiles').select('calendario_asignado').eq('id', user.id).single(),
    supabase.from('brand_identity').select('fotos_folder_id').eq('user_id', user.id).single(),
    supabase.from('calendar_batch_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('salidas').select('id, nombre, fecha_inicio, estado, carpeta_fotos_id').eq('user_id', user.id).order('fecha_inicio'),
  ])
  const salidaCount = salidasForPicker?.length ?? 0

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
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#5CE6A0]">Pieza generada</p>
            <h1 className="text-[20px] font-bold text-[#EAF2EC]">Revisá y aprobá desde el calendario</h1>
          </div>
          <SemanaGeneradaPieceCell pieza={highlightedPiece as ContenidoGenerado} salidaNombre={salidaNombre} initiallyOpen />
          <Link href="/calendario" className="text-sm font-semibold text-[#5CE6A0]">Volver al calendario semanal →</Link>
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

  if (latestCompletedRun) {
    return <SemanaGenerada latestRun={latestCompletedRun} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-2xl flex flex-col md:flex-row items-center md:items-start gap-5 text-center md:text-left"
        style={{ padding: '24px 28px', backgroundColor: '#0D130E', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(52,209,126,0.1)', border: '1px solid rgba(52,209,126,0.2)' }}
        >
          <CalendarDays className="w-5 h-5" style={{ color: '#5CE6A0' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5CE6A0' }}>Tu plan semanal actual</p>
          <p className="text-[20px] font-bold tracking-tight" style={{ color: '#EAF2EC' }}>{calendar.nombre}</p>
          <p className="text-[14px] mt-1.5 leading-relaxed max-w-2xl" style={{ color: '#9DB0A4' }}>
            {calendar.fraseCliente}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#34D17E' }} />
            <span className="text-[13px] font-medium" style={{ color: '#C8DDD0' }}>
              Genera {calendar.cadencia.min === calendar.cadencia.max ? calendar.cadencia.min : `${calendar.cadencia.min} a ${calendar.cadencia.max}`} posteos por semana
            </span>
          </div>
        </div>
      </div>

      <WeeklyBatchPanel
        calendarCode={calendarCode}
        calendarName={calendar.nombre}
        initialRun={latestRun}
        hasSalidas={salidaCount > 0}
        salidas={salidasForPicker ?? []}
      />
    </div>
  )
}
