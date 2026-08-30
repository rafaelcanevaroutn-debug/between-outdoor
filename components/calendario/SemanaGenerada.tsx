import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { CalendarBatchRun, ContenidoGenerado, Salida } from '@/types'
import AddExtraPieceWrapper from '@/components/calendario/AddExtraPieceWrapper'
import RegenerateWeekButton from '@/components/calendario/RegenerateWeekButton'
import EditableWeekCalendar from '@/components/calendario/EditableWeekCalendar'
import ClearCalendarButton from '@/components/calendario/ClearCalendarButton'

interface DayColumn {
  isoDate: string
  label: string
  date: string
  isToday: boolean
}

function getWeekDates(): DayColumn[] {
  const timezone = 'America/Argentina/Buenos_Aires'
  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayIso = isoFormatter.format(new Date())
  const today = new Date(`${todayIso}T12:00:00-03:00`)
  const days: DayColumn[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const isoDate = isoFormatter.format(d)
    const rawLabel = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: timezone }).format(d)
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
    const dateFormatted = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: timezone }).format(d)

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

  const generatedSlots = (latestRun.result?.slots ?? [])
    .filter((slot): slot is typeof slot & { contenidoId: string } => slot.outcome === 'generated' && Boolean(slot.contenidoId))
  const contenidoIds = generatedSlots.map(slot => slot.contenidoId)
  const extraPieceCount = generatedSlots.filter(slot => slot.label === 'Pieza Extra').length
  const basePieceCount = generatedSlots.length - extraPieceCount

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
    .select('id, nombre, fecha_inicio, tipo_viaje, frecuencia, carpeta_fotos_id, carpeta_videos_id')
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
    carpeta_fotos_id: string | null
    carpeta_videos_id: string | null
  }[]
  const salidasParaRegenerar = salidasParaExtra.filter(salida => salida.carpeta_fotos_id && salida.carpeta_videos_id)

  const weekDates = getWeekDates()
  const totalPiezas = contenidoGenerado.length
  const failedPieces = (latestRun.result?.slots ?? []).filter(slot => slot.outcome === 'error').length

  const salidaNames = Object.fromEntries([...salidasById.entries()].map(([id, salida]) => [id, salida.nombre]))

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
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:w-auto lg:items-center">
            <RegenerateWeekButton salidas={salidasParaRegenerar} />
            <AddExtraPieceWrapper runId={latestRun.id} salidas={salidasParaExtra} />
            <ClearCalendarButton runId={latestRun.id} pieceCount={totalPiezas} />
          </div>
        </div>
      </div>

      {failedPieces > 0 && (
        <div className="flex items-start gap-3 rounded-[16px] border border-[var(--linea)] bg-white/60 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cardon)]" />
          <p className="text-[13px] leading-relaxed text-[var(--piedra)]"><strong className="text-[var(--tinta)]">{failedPieces} {failedPieces === 1 ? 'pieza quedó' : 'piezas quedaron'} pendiente.</strong> El resto de tu semana está disponible y no se perdió ningún dato.</p>
        </div>
      )}

      <EditableWeekCalendar
        days={weekDates}
        initialPieces={contenidoGenerado}
        salidaNames={salidaNames}
        basePieceCount={basePieceCount}
        extraPieceCount={extraPieceCount}
      />
    </div>
  )
}
