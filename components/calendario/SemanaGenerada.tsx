import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { CalendarBatchRun, ContenidoGenerado, Salida } from '@/types'
import SemanaGeneradaPieceCell from '@/components/calendario/SemanaGeneradaPieceCell'
import AddExtraPieceWrapper from '@/components/calendario/AddExtraPieceWrapper'
import RegenerateWeekButton from '@/components/calendario/RegenerateWeekButton'

interface DayColumn {
  isoDate: string
  label: string
  date: string
  isToday: boolean
}

function getWeekDates(): DayColumn[] {
  const today = new Date()
  const days: DayColumn[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const isoDate = d.toISOString().slice(0, 10)
    const rawLabel = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(d)
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
    const dateFormatted = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(d)

    days.push({
      isoDate,
      label: i === 0 ? 'Hoy' : label,
      date: dateFormatted,
      isToday: i === 0,
    })
  }

  return days
}

export default async function SemanaGenerada({ latestRun }: { latestRun: CalendarBatchRun }) {
  const supabase = await createClient()

  const contenidoIds = (latestRun.result?.slots ?? [])
    .filter((slot): slot is typeof slot & { contenidoId: string } => slot.outcome === 'generated' && Boolean(slot.contenidoId))
    .map(slot => slot.contenidoId)

  let contenidoGenerado: ContenidoGenerado[] = []
  let salidasById = new Map<string, Pick<Salida, 'id' | 'nombre'>>()

  if (contenidoIds.length > 0) {
    const { data: contenidoRows } = await supabase
      .from('contenido_generado')
      .select('*')
      .in('id', contenidoIds)

    contenidoGenerado = (contenidoRows ?? []) as ContenidoGenerado[]

    const salidaIds = [...new Set(contenidoGenerado.map(c => c.salida_id))]
    if (salidaIds.length > 0) {
      const { data: salidaRows } = await supabase
        .from('salidas')
        .select('id, nombre')
        .in('id', salidaIds)

      salidasById = new Map((salidaRows ?? []).map(s => [s.id, s]))
    }
  }

  const { data: activeSalidas } = await supabase
    .from('salidas')
    .select('id, nombre, fecha_inicio, tipo_viaje, frecuencia')
    .eq('user_id', latestRun.user_id)
    .eq('estado', 'activa')
    .or(`fecha_inicio.gte.${new Date().toISOString().slice(0, 10)},tipo_viaje.eq.salida_recurrente`)
    .order('fecha_inicio', { ascending: true, nullsFirst: true })

  const salidasParaExtra = (activeSalidas || []) as {
    id: string
    nombre: string
    fecha_inicio: string | null
    tipo_viaje: Salida['tipo_viaje']
    frecuencia: Salida['frecuencia']
  }[]

  const weekDates = getWeekDates()
  const totalPiezas = contenidoGenerado.length
  const failedPieces = (latestRun.result?.slots ?? []).filter(slot => slot.outcome === 'error').length

  const contenidoPorFecha = new Map<string, ContenidoGenerado[]>()
  contenidoGenerado.forEach((contenido, index) => {
    const isoDate = contenido.scheduled_at
      ? contenido.scheduled_at.slice(0, 10)
      : weekDates[index % weekDates.length].isoDate
    if (!contenidoPorFecha.has(isoDate)) {
      contenidoPorFecha.set(isoDate, [])
    }
    contenidoPorFecha.get(isoDate)!.push(contenido)
  })

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7">
      <div className="grid gap-6 border-b border-[var(--linea)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">Mi semana</p>
          <h1 className="text-[32px] font-semibold leading-none tracking-[-.045em] text-[var(--tinta)] sm:text-[40px]">Tu contenido está listo.</h1>
          <p className="mt-3 text-[14px] text-[var(--piedra)]">{totalPiezas} {totalPiezas === 1 ? 'pieza organizada' : 'piezas organizadas'} para revisar y publicar.</p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--cardon)]">
            <CheckCircle2 className="h-4 w-4" />
            Semana lista
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:items-center">
            <RegenerateWeekButton />
            <AddExtraPieceWrapper runId={latestRun.id} salidas={salidasParaExtra} />
          </div>
        </div>
      </div>

      {failedPieces > 0 && (
        <div className="flex items-start gap-3 rounded-[16px] border border-[var(--linea)] bg-white/60 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cardon)]" />
          <p className="text-[13px] leading-relaxed text-[var(--piedra)]"><strong className="text-[var(--tinta)]">{failedPieces} {failedPieces === 1 ? 'pieza quedó' : 'piezas quedaron'} pendiente.</strong> El resto de tu semana está disponible y no se perdió ningún dato.</p>
        </div>
      )}

      <section className="overflow-hidden rounded-[24px] border border-[var(--linea)] bg-white/65 shadow-[var(--sombra-reposo)]">
        <div className="flex items-center justify-between border-b border-[var(--linea)] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-.02em] text-[var(--tinta)]">Semana de contenido</h2>
            <p className="mt-1 text-[12px] text-[var(--piedra)]">Deslizá para recorrer los siete días.</p>
          </div>
          <span className="rounded-full bg-[var(--cardon-tenue)] px-3 py-1.5 text-[11px] font-semibold text-[var(--cardon)]">Semana actual</span>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-7 border-b border-[var(--linea)] bg-[var(--nieve)]/75">
              {weekDates.map(dayInfo => (
                <div key={dayInfo.isoDate} className={`border-r border-[var(--linea)] px-3 py-3 text-center last:border-r-0 ${dayInfo.isToday ? 'bg-[var(--cardon-tenue)]' : ''}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[.12em] ${dayInfo.isToday ? 'text-[var(--cardon)] font-bold' : 'text-[var(--piedra)]'}`}>{dayInfo.label}</p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--tinta)]">{dayInfo.date}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {weekDates.map(dayInfo => {
                const piezasDelDia = contenidoPorFecha.get(dayInfo.isoDate) || []
                return (
                  <div key={dayInfo.isoDate} className={`min-h-[330px] border-r border-[var(--linea)] p-2.5 last:border-r-0 ${dayInfo.isToday ? 'bg-[var(--cardon-tenue)]/25' : ''}`}>
                    {piezasDelDia.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {piezasDelDia.map(pieza => (
                          <SemanaGeneradaPieceCell
                            key={pieza.id}
                            pieza={pieza}
                            salidaNombre={salidasById.get(pieza.salida_id)?.nombre ?? 'Salida'}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[300px] items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--linea)]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
