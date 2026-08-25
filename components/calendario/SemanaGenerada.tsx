import Link from 'next/link'
import { Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { CalendarBatchRun, ContenidoGenerado, Salida, DiaSemana, SlideCarrusel } from '@/types'
import CarruselRenderer from '@/components/carrusel-preview/CarruselRenderer'
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
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Semana lista</div>
        <h1 className="page-title">Tu semana generada</h1>
        <p className="page-subtitle mt-2">Between organizó estas publicaciones según tus salidas y prioridades.</p>
      </div>

      <div className="rounded-[24px] p-6" style={{ backgroundColor: 'rgba(255,255,255,.72)', border: '1px solid var(--linea)', boxShadow: 'var(--sombra-reposo)' }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--cardon-tenue)' }}>
              <CalendarIcon className="w-5 h-5" style={{ color: 'var(--cardon)' }} />
            </div>
            <div>
              <h2 className="section-title">Calendario de publicación</h2>
              <p className="text-[13px]" style={{ color: 'var(--piedra)' }}>{totalPiezas} piezas generadas para esta semana</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AddExtraPieceWrapper runId={latestRun.id} salidas={salidasParaExtra} />

            <div className="px-4 py-2 rounded-full text-[13px] font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--cardon-tenue)', color: 'var(--cardon)', border: '1px solid rgba(62,92,72,.12)' }}>
              <CheckCircle2 className="w-4 h-4" />
              ¡Listo para publicar!
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-2">
          <div className="grid grid-cols-7 gap-3 sm:gap-4 min-w-[1000px]">
          {DIAS_SEMANA.map((diaInfo) => {
            const piezasDelDia = contenidoPorDia.get(diaInfo.id) || []

            return (
              <div
                key={diaInfo.id}
                className="flex flex-col rounded-[16px] overflow-hidden"
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
    </div>
  )
}
