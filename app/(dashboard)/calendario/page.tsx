import { redirect } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import WeeklyBatchPanel from '@/components/calendario/WeeklyBatchPanel'
import type { CalendarBatchRun, CalendarCode } from '@/types'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: runRows }, { count: salidaCount }] = await Promise.all([
    supabase.from('profiles').select('calendario_asignado').eq('id', user.id).single(),
    supabase.from('calendar_batch_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
    supabase.from('salidas').select('*', { count: 'exact', head: true }),
  ])

  const calendarCode = (profile?.calendario_asignado ?? 'CAL-00') as CalendarCode
  const calendar = CALENDAR_CATALOG[calendarCode]
  const latestRun = (runRows?.[0] ?? null) as CalendarBatchRun | null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[20px] font-bold" style={{ color: '#EAF2EC', letterSpacing: '-0.02em' }}>Calendario de contenido</h2>
        <p className="text-[13px] mt-0.5" style={{ color: '#7E9286' }}>Tu semana, generada de una sola vez con las salidas que tenés cargadas</p>
      </div>

      <div
        className="rounded-[18px] flex items-start gap-4"
        style={{ padding: '22px 24px', backgroundColor: '#0D130E', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(52,209,126,0.08)', border: '1px solid rgba(52,209,126,0.15)' }}
        >
          <CalendarDays className="w-5 h-5" style={{ color: '#34D17E' }} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#5CE6A0' }}>{calendarCode} — {calendar.nombre}</p>
          <p className="text-[14px] font-medium mt-1" style={{ color: '#EAF2EC' }}>{calendar.fraseCliente}</p>
          <p className="text-[12.5px] mt-1" style={{ color: '#7E9286' }}>
            {calendar.cadencia.min === calendar.cadencia.max
              ? `${calendar.cadencia.min} piezas por semana`
              : `${calendar.cadencia.min}–${calendar.cadencia.max} piezas por semana`}
            {' · '}¿No es el calendario correcto? Decíselo a tu asesor para que lo cambie.
          </p>
        </div>
      </div>

      <WeeklyBatchPanel
        calendarCode={calendarCode}
        calendarName={calendar.nombre}
        initialRun={latestRun}
        hasSalidas={(salidaCount ?? 0) > 0}
      />
    </div>
  )
}
