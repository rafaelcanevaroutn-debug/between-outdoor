import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import WeeklyBatchPanel from '@/components/calendario/WeeklyBatchPanel'
import CarruselFeedGrid from '@/components/carrusel-preview/CarruselFeedGrid'
import type { CalendarBatchRun, CalendarCode, ContenidoGenerado, Salida } from '@/types'

const FORMAT_LABELS: Record<string, string> = {
  editorial: 'Editorial',
  organico: 'Orgánico',
  itinerario: 'Itinerario',
  ascenso: 'Ascenso',
  calendario: 'Fechas',
  lugar: 'Lugar',
  conversacion: 'Conversación',
}

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: branding }, { data: runRows }, { count: salidaCount }] = await Promise.all([
    supabase.from('profiles').select('calendario_asignado').eq('id', user.id).single(),
    supabase.from('brand_identity').select('fotos_folder_id').eq('user_id', user.id).single(),
    supabase.from('calendar_batch_runs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('salidas').select('*', { count: 'exact', head: true }),
  ])

  const calendarCode = (profile?.calendario_asignado ?? 'CAL-00') as CalendarCode
  const calendar = CALENDAR_CATALOG[calendarCode]
  const runs = (runRows ?? []) as CalendarBatchRun[]
  const latestRun = runs[0] ?? null
  const latestCompletedRun = runs.find(r => r.status === 'completed' && r.result) ?? null
  const contenidoIds = (latestCompletedRun?.result?.slots ?? [])
    .filter((slot): slot is typeof slot & { contenidoId: string } => slot.outcome === 'generated' && Boolean(slot.contenidoId))
    .map(slot => slot.contenidoId)

  // Trae directo de contenido_generado por user_id (mismo alcance que
  // ContenidoHub en /contenido) en vez de depender de
  // calendar_batch_runs.result.slots — así el feed muestra todo lo
  // generado del cliente, no solo lo que quedó referenciado por el
  // último batch (esas referencias quedan huérfanas si el contenido se
  // borra o se regenera después).
  const { data: contenidoRows } = await supabase
    .from('contenido_generado')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const salidaIds = [...new Set((contenidoRows ?? []).map(c => c.salida_id))]

  let contenidoBySalida: { salida: Pick<Salida, 'id' | 'nombre' | 'sheets_exported_at'>; contenido: ContenidoGenerado[] }[] = []

  if (salidaIds.length > 0) {
    const { data: salidaRows } = await supabase
      .from('salidas')
      .select('id, nombre, sheets_exported_at')
      .in('id', salidaIds)
    const salidasById = new Map((salidaRows ?? []).map(s => [s.id, s]))
    contenidoBySalida = salidaIds
      .map(salidaId => ({
        salida: salidasById.get(salidaId),
        contenido: (contenidoRows ?? []).filter(c => c.salida_id === salidaId) as ContenidoGenerado[],
      }))
      .filter((group): group is { salida: Pick<Salida, 'id' | 'nombre' | 'sheets_exported_at'>; contenido: ContenidoGenerado[] } =>
        Boolean(group.salida) && group.contenido.length > 0,
      )
  }

  return (
    <div className="flex flex-col gap-6">
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
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#5CE6A0' }}>Tu plan semanal</p>
          <p className="text-[16px] font-semibold mt-1" style={{ color: '#EAF2EC' }}>{calendar.nombre}</p>
          <p className="text-[13px] mt-1" style={{ color: '#9DB0A4' }}>{calendar.fraseCliente}</p>
          <p className="text-[12.5px] mt-1" style={{ color: '#7E9286' }}>
            {calendar.cadencia.min === calendar.cadencia.max
              ? `${calendar.cadencia.min} piezas por semana`
              : `${calendar.cadencia.min}–${calendar.cadencia.max} piezas por semana`}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {calendar.slots.map((slot, index) => (
              <span
                key={`${slot.label}-${index}`}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ color: '#C8DDD0', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {slot.label} · {FORMAT_LABELS[slot.formatosCarrusel[0]] ?? slot.formatosCarrusel[0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <WeeklyBatchPanel
        calendarCode={calendarCode}
        calendarName={calendar.nombre}
        initialRun={latestRun}
        hasSalidas={(salidaCount ?? 0) > 0}
        fotosRootFolderId={branding?.fotos_folder_id?.trim() || null}
      />

      {contenidoBySalida.length > 0 && (
        <div className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: '#EAF2EC' }}>Tu contenido</h3>
              <p className="text-[12.5px] mt-0.5" style={{ color: '#7E9286' }}>Piezas generadas, agrupadas por salida.</p>
            </div>
            {latestCompletedRun && contenidoIds.length > 0 && (
              <Link
                href={`/contenido?nuevos=${encodeURIComponent(contenidoIds.join(','))}`}
                className="text-[12.5px] font-semibold flex-shrink-0"
                style={{ color: '#5CE6A0' }}
              >
                Ver última corrida →
              </Link>
            )}
          </div>
          <CarruselFeedGrid
            groups={contenidoBySalida.map(g => ({ salidaId: g.salida.id, salidaNombre: g.salida.nombre, contenido: g.contenido }))}
          />
        </div>
      )}
    </div>
  )
}
