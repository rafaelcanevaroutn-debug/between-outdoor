import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { CalendarBatchRun, ContenidoGenerado, Salida, DiaSemana } from '@/types'
import SemanaGeneradaPieceCell from '@/components/calendario/SemanaGeneradaPieceCell'
import AddExtraPieceWrapper from '@/components/calendario/AddExtraPieceWrapper'

const DIAS_SEMANA: { id: DiaSemana; label: string }[] = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miércoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
  { id: 'sábado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
]

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
    .select('id, nombre, fecha_inicio')
    .eq('user_id', latestRun.user_id)
    .gte('fecha_inicio', new Date().toISOString().slice(0, 10))
    .neq('estado', 'completada')
    .order('fecha_inicio', { ascending: true })

  const salidasParaExtra = (activeSalidas || []) as { id: string; nombre: string; fecha_inicio: string }[]

  // Ya no hacemos fetching de renders del lado del servidor para evitar bloquear la carga inicial (TTFB).
  // Cada pieza (SemanaGeneradaPieceCell) se encarga de fetchear sus propios renders vía /api/fotos/renders.

  const contenidoPorDia = new Map<DiaSemana, ContenidoGenerado[]>()
  const totalPiezas = contenidoGenerado.length
  const failedPieces = (latestRun.result?.slots ?? []).filter(slot => slot.outcome === 'error').length
  let diasAsignados: DiaSemana[] = []

  if (totalPiezas === 1) diasAsignados = ['miércoles']
  else if (totalPiezas === 2) diasAsignados = ['martes', 'jueves']
  else if (totalPiezas === 3) diasAsignados = ['lunes', 'miércoles', 'viernes']
  else if (totalPiezas === 4) diasAsignados = ['lunes', 'miércoles', 'viernes', 'domingo']
  else if (totalPiezas === 5) diasAsignados = ['lunes', 'martes', 'miércoles', 'viernes', 'domingo']
  else if (totalPiezas === 6) diasAsignados = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  else diasAsignados = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

  contenidoGenerado.forEach((contenido, index) => {
    const dia = diasAsignados[index % diasAsignados.length]
    if (!contenidoPorDia.has(dia)) {
      contenidoPorDia.set(dia, [])
    }
    contenidoPorDia.get(dia)!.push(contenido)
  })

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7">
      <div className="flex flex-col gap-5 border-b border-[var(--linea)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">Mi semana</p>
          <h1 className="text-[32px] font-semibold leading-none tracking-[-.045em] text-[var(--tinta)] sm:text-[40px]">Tu contenido está listo.</h1>
          <p className="mt-3 text-[14px] text-[var(--piedra)]">{totalPiezas} {totalPiezas === 1 ? 'pieza organizada' : 'piezas organizadas'} para revisar y publicar.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-[13px] font-semibold text-[var(--cardon)] sm:inline-flex">
            <CheckCircle2 className="h-4 w-4" />
            Semana lista
          </div>
          <AddExtraPieceWrapper runId={latestRun.id} salidas={salidasParaExtra} />
        </div>
      </div>

      {failedPieces > 0 && (
        <div className="flex items-start gap-3 rounded-[16px] border border-[var(--linea)] bg-white/60 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cardon)]" />
          <p className="text-[13px] leading-relaxed text-[var(--piedra)]"><strong className="text-[var(--tinta)]">{failedPieces} {failedPieces === 1 ? 'pieza quedó' : 'piezas quedaron'} pendiente.</strong> El resto de tu semana está disponible y no se perdió ningún dato.</p>
        </div>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-[18px] font-semibold tracking-[-.02em] text-[var(--tinta)]">Calendario de publicación</h2>
          <p className="mt-1 text-[12px] text-[var(--piedra)]">Abrí cualquier pieza para verla completa.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {DIAS_SEMANA.flatMap((diaInfo) => {
            const piezasDelDia = contenidoPorDia.get(diaInfo.id) || []
            return piezasDelDia.map(pieza => (
              <article key={pieza.id} className="overflow-hidden rounded-[20px] border border-[var(--linea)] bg-white/70 p-3 shadow-[var(--sombra-reposo)]">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-[12px] font-semibold uppercase tracking-[.12em] text-[var(--cardon)]">{diaInfo.label}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--cardon)]" />
                </div>
                <SemanaGeneradaPieceCell
                  pieza={pieza}
                  salidaNombre={salidasById.get(pieza.salida_id)?.nombre ?? 'Salida'}
                />
              </article>
            ))
          })}
        </div>
      </section>
    </div>
  )
}
