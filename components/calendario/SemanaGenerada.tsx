import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { CalendarBatchRun, ContenidoGenerado, Salida } from '@/types'
import RegenerateWeekButton from '@/components/calendario/RegenerateWeekButton'
import EditableWeekCalendar from '@/components/calendario/EditableWeekCalendar'

interface DayColumn {
  isoDate: string
  label: string
  date: string
  isToday: boolean
}

function getWeekDates(offset = 0): DayColumn[] {
  const timezone = 'America/Argentina/Buenos_Aires'
  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayIso = isoFormatter.format(new Date())
  const today = new Date(`${todayIso}T12:00:00-03:00`)
  // Apply week offset
  today.setDate(today.getDate() + (offset * 7))

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
      label: i === 0 && offset === 0 ? 'Hoy' : label,
      date: dateFormatted,
      isToday: i === 0 && offset === 0,
    })
  }

  return days
}

interface SemanaGeneradaProps {
  latestRun?: CalendarBatchRun
  pastPieces?: ContenidoGenerado[]
  weekOffset?: number
  isAdmin?: boolean
}

export default async function SemanaGenerada({ latestRun, pastPieces, weekOffset = 0, isAdmin = false }: SemanaGeneradaProps) {
  const supabase = await createClient()
  const isReadOnly = weekOffset < 0

  const generatedSlots = (latestRun?.result?.slots ?? [])
    .filter((slot): slot is typeof slot & { contenidoId: string } => slot.outcome === 'generated' && Boolean(slot.contenidoId))
  const contenidoIds = generatedSlots.map(slot => slot.contenidoId)
  const extraPieceCount = isReadOnly ? 0 : generatedSlots.filter(slot => slot.label === 'Pieza Extra').length
  const basePieceCount = isReadOnly ? (pastPieces?.length ?? 0) : generatedSlots.length - extraPieceCount

  let contenidoGenerado: ContenidoGenerado[] = isReadOnly ? (pastPieces ?? []) : []
  let salidasById = new Map<string, Pick<Salida, 'id' | 'nombre'>>()

  if (!isReadOnly && contenidoIds.length > 0) {
    const { data: contenidoRows } = await supabase
      .from('contenido_generado')
      .select('*')
      .in('id', contenidoIds)

    contenidoGenerado = (contenidoRows ?? []) as ContenidoGenerado[]
  }

  // Si hay contenido (activo o pasado), buscar los nombres de sus salidas
  if (contenidoGenerado.length > 0) {
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
    .eq('user_id', (latestRun?.user_id ?? pastPieces?.[0]?.user_id))
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

  const weekDates = getWeekDates(weekOffset)
  const totalPiezas = contenidoGenerado.length
  const failedPieces = isReadOnly ? 0 : (latestRun?.result?.slots ?? []).filter(slot => slot.outcome === 'error').length

  const salidaNames = Object.fromEntries([...salidasById.entries()].map(([id, salida]) => [id, salida.nombre]))

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7">
      <div className="grid gap-6 border-b border-[var(--linea)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">Mi semana</p>
          </div>
          <h1 className="font-display text-[32px] font-bold leading-none tracking-[-.045em] text-[var(--tinta)] sm:text-[40px]">{isReadOnly ? 'Historial de publicaciones' : `Semana del ${weekDates[0].date.split(' ')[0]} al ${weekDates[6].date}.`}</h1>
          <p className="mt-3 text-[14px] text-[var(--piedra)]">{totalPiezas} {totalPiezas === 1 ? 'pieza' : 'piezas'} {isReadOnly ? 'publicadas' : 'para revisar y publicar'}.</p>
        </div>
        {!isReadOnly && latestRun && isAdmin && (
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--cardon)]">
              <CheckCircle2 className="h-4 w-4" />
              Semana lista
            </div>
            <div className="w-full lg:w-auto lg:min-w-[330px]">
              <RegenerateWeekButton salidas={salidasParaRegenerar} />
            </div>
          </div>
        )}
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
        isReadOnly={isReadOnly}
        runId={latestRun?.id}
        initialRemakesUsed={(latestRun?.result as any)?.remakesUsed ?? 0}
      />
    </div>
  )
}
