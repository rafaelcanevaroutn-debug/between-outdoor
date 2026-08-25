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
  const failedPieces = (latestRun.result?.slots ?? []).filter(slot => slot.outcome !== 'generated').length
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">Semana lista</p>
          <h1 className="text-[32px] font-semibold leading-none tracking-[-.045em] text-[var(--tinta)] sm:text-[40px]">Tu contenido está listo.</h1>
          <p className="mt-3 text-[14px] text-[var(--piedra)]">Revisá cada pieza y publicala cuando quieras.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-[var(--cardon)]">
          <CheckCircle2 className="h-4 w-4" />
          {totalPiezas} {totalPiezas === 1 ? 'pieza generada' : 'piezas generadas'}
        </div>
      </div>

      {failedPieces > 0 && (
        <div className="flex items-start gap-3 rounded-[16px] border border-[var(--linea)] bg-white/60 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cardon)]" />
          <p className="text-[13px] leading-relaxed text-[var(--piedra)]"><strong className="text-[var(--tinta)]">{failedPieces} {failedPieces === 1 ? 'pieza quedó' : 'piezas quedaron'} pendiente.</strong> El resto de tu semana está disponible y no se perdió ningún dato.</p>
        </div>
      )}

      <div className="rounded-[24px] border border-[var(--linea)] bg-white/70 p-4 shadow-[var(--sombra-reposo)] sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-.02em] text-[var(--tinta)]">Calendario de publicación</h2>
            <p className="mt-1 text-[12px] text-[var(--piedra)]">Abrí una pieza para verla completa.</p>
          </div>
          <AddExtraPieceWrapper runId={latestRun.id} salidas={salidasParaExtra} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {DIAS_SEMANA.map((diaInfo) => {
            const piezasDelDia = contenidoPorDia.get(diaInfo.id) || []

            return (
              <div
                key={diaInfo.id}
                className={`${piezasDelDia.length === 0 ? 'hidden xl:flex' : 'flex'} flex-col overflow-hidden rounded-[16px]`}
                style={{
                  backgroundColor: 'var(--nieve)',
                  border: '1px solid var(--linea)',
                  minHeight: '200px'
                }}
              >
                <div className="py-2.5 px-3 text-center border-b" style={{ borderColor: 'var(--linea)', backgroundColor: 'transparent' }}>
                  <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--tinta)' }}>
                    {diaInfo.label}
                  </span>
                </div>

                <div className="p-3 flex flex-col gap-3 flex-1">
                  {piezasDelDia.length > 0 ? (
                    piezasDelDia.map(pieza => (
                      <SemanaGeneradaPieceCell
                        key={pieza.id}
                        pieza={pieza}
                        salidaNombre={salidasById.get(pieza.salida_id)?.nombre ?? 'Salida'}
                      />
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[12px] italic text-center px-2" style={{ color: 'var(--piedra)' }}>Sin publicación programada</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
