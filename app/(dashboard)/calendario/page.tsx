import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import WeeklyBatchPanel from '@/components/calendario/WeeklyBatchPanel'
import ContenidoTable from '@/components/contenido/ContenidoTable'
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

  // Agrupa las piezas de la última corrida completada por salida, para
  // mostrar "tu semana" directamente acá en vez de mandar al listado
  // general mezclado de cada salida.
  const generatedSlots = (latestCompletedRun?.result?.slots ?? []).filter(
    (slot): slot is typeof slot & { contenidoId: string; salidaId: string } =>
      slot.outcome === 'generated' && Boolean(slot.contenidoId) && Boolean(slot.salidaId),
  )
  const contenidoIds = generatedSlots.map(slot => slot.contenidoId)
  const salidaIdsInRun = [...new Set(generatedSlots.map(slot => slot.salidaId))]

  let contenidoBySalida: { salida: Pick<Salida, 'id' | 'nombre' | 'sheets_exported_at'>; contenido: ContenidoGenerado[] }[] = []

  if (contenidoIds.length > 0) {
    const [{ data: contenidoRows }, { data: salidaRows }] = await Promise.all([
      supabase.from('contenido_generado').select('*').in('id', contenidoIds).order('created_at'),
      supabase.from('salidas').select('id, nombre, sheets_exported_at').in('id', salidaIdsInRun),
    ])
    const salidasById = new Map((salidaRows ?? []).map(s => [s.id, s]))
    contenidoBySalida = salidaIdsInRun
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
              <h3 className="text-[15px] font-semibold" style={{ color: '#EAF2EC' }}>Última semana generada</h3>
              <p className="text-[12.5px] mt-0.5" style={{ color: '#7E9286' }}>
                {new Date(latestCompletedRun!.created_at).toLocaleDateString('es-AR')} · piezas agrupadas por salida.
              </p>
            </div>
            <Link
              href={`/contenido?nuevos=${encodeURIComponent(contenidoIds.join(','))}`}
              className="text-[12.5px] font-semibold flex-shrink-0"
              style={{ color: '#5CE6A0' }}
            >
              Ver toda esta semana →
            </Link>
          </div>
          {contenidoBySalida.map(({ salida, contenido }) => (
            <div key={salida.id} className="flex flex-col gap-2">
              <p className="text-[13px] font-medium" style={{ color: '#5CE6A0' }}>{salida.nombre}</p>
              <ContenidoTable
                contenido={contenido}
                salidaId={salida.id}
                salidaNombre={salida.nombre}
                sheetsExportedAt={salida.sheets_exported_at}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
