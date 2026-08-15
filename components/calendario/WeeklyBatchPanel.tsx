'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Clock, Video, ChevronDown } from 'lucide-react'
import FolderPicker from '@/components/fotos/FolderPicker'
import { assignDistinctTypographies } from '@/lib/generators/video-typography-assignment'
import { CANAL_OPTIONS, VIDEO_SUBFAMILIA_OPTIONS } from '@/lib/generators/video-subfamilia-options'
import type { CalendarBatchRenderStatus, CalendarBatchRun, CalendarBatchSlotResult, CalendarCode, Salida, VideoKnowledgeFormat } from '@/types'

type SalidaPickerOption = Pick<Salida, 'id' | 'nombre' | 'fecha_inicio' | 'estado'>

interface WeeklyBatchPanelProps {
  calendarCode: CalendarCode
  calendarName: string
  initialRun: CalendarBatchRun | null
  hasSalidas: boolean
  fotosRootFolderId: string | null
  salidas: SalidaPickerOption[]
}

const POLL_INTERVAL_MS = 5000

const FORMATO_LABELS: Record<string, string> = {
  editorial: 'Editorial',
  organico: 'Orgánico',
  itinerario: 'Itinerario',
  ascenso: 'Ascenso',
  calendario: 'Calendario',
  lugar: 'Lugar',
  conversacion: 'Conversación',
}

const OUTCOME_META: Record<CalendarBatchSlotResult['outcome'], { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  generated: { label: 'Generada', color: '#5CE6A0', Icon: CheckCircle2 },
  ineligible: { label: 'Falta info', color: '#E8B45C', Icon: AlertTriangle },
  error: { label: 'Error', color: '#f87171', Icon: XCircle },
  sin_salida_disponible: { label: 'Sin salida cargada', color: '#7E9286', Icon: HelpCircle },
}

const RENDER_META: Record<CalendarBatchRenderStatus, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  render_pending: { label: 'Texto generado · pendiente de aprobación', color: '#E8B45C', Icon: Clock },
  rendered: { label: 'Generada y renderizada', color: '#5CE6A0', Icon: CheckCircle2 },
  render_failed: { label: 'Texto generado · render fallido', color: '#f87171', Icon: AlertTriangle },
}

function isActive(status: CalendarBatchRun['status'] | undefined) {
  return status === 'pending' || status === 'running'
}

function StepHeader({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold"
        style={{ color: '#5CE6A0', backgroundColor: 'rgba(52,209,126,0.1)', border: '1px solid rgba(52,209,126,0.22)' }}
      >
        {number}
      </div>
      <div>
        <p className="text-[13.5px] font-semibold" style={{ color: '#EAF2EC' }}>{title}</p>
        <p className="text-[12px] mt-0.5" style={{ color: '#7E9286' }}>{description}</p>
      </div>
    </div>
  )
}

function defaultVideoSalidaId(salidas: SalidaPickerOption[]): string {
  const today = new Date().toISOString().slice(0, 10)
  const proxima = salidas
    .filter(s => s.estado !== 'completada' && s.fecha_inicio >= today)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0]
  return proxima?.id ?? salidas[0]?.id ?? ''
}

export default function WeeklyBatchPanel({ calendarCode, calendarName, initialRun, hasSalidas, fotosRootFolderId, salidas }: WeeklyBatchPanelProps) {
  const router = useRouter()
  const [run, setRun] = useState<CalendarBatchRun | null>(initialRun)
  const [triggerError, setTriggerError] = useState('')
  const [triggering, setTriggering] = useState(false)
  const [carpetaFotos, setCarpetaFotos] = useState<string | null>(null)
  const [carpetaFotosId, setCarpetaFotosId] = useState<string | null>(null)
  const [videoSubfamilias, setVideoSubfamilias] = useState<VideoKnowledgeFormat[]>([])
  const [videoSalidaId, setVideoSalidaId] = useState(() => defaultVideoSalidaId(salidas))
  const [canalesHabilitados, setCanalesHabilitados] = useState<string[]>([])
  const [publicationDate, setPublicationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isActive(run?.status)) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate-batch/${run!.id}`)
        if (!res.ok) return
        const data: CalendarBatchRun = await res.json()
        setRun(data)
        if (data.status === 'completed' || data.status === 'error') router.refresh()
      } catch {
        // red intermitente — reintenta en el próximo tick, no aborta el polling
      }
    }

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [router, run?.id, run?.status])

  async function handleGenerate() {
    if (!carpetaFotos || !carpetaFotosId) {
      setTriggerError('Elegí una carpeta con imágenes para generar y renderizar la semana.')
      return
    }
    if (videoSubfamilias.length > 0 && !videoSalidaId) {
      setTriggerError('Elegí a qué salida aplica el video de la semana.')
      return
    }
    if ((videoSubfamilias.includes('4') || videoSubfamilias.includes('5')) && canalesHabilitados.length === 0) {
      setTriggerError('Familia 4 y el fallback comercial de Familia 5 necesitan al menos un canal habilitado.')
      return
    }
    setTriggerError('')
    setTriggering(true)
    try {
      const typographyAssignments = assignDistinctTypographies(videoSubfamilias.length)
      const videoPiezas = videoSubfamilias.map((subfamilia, i) => ({
        subfamilia,
        salidaId: videoSalidaId,
        tipografiasPermitidas: typographyAssignments[i],
        ...((subfamilia === '4' || subfamilia === '5') && { canalesHabilitados, publicationDate }),
      }))

      const res = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carpetaFotos, carpetaFotosId, ...(videoPiezas.length > 0 && { videoPiezas }) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTriggerError(data.error || 'No se pudo iniciar la generación')
        setTriggering(false)
        return
      }
      setRun({
        id: data.runId,
        user_id: '',
        calendar_code: calendarCode,
        status: 'pending',
        result: null,
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch {
      setTriggerError('Error de red. Intentá de nuevo.')
    } finally {
      setTriggering(false)
    }
  }

  const running = isActive(run?.status)
  const showButton = !running
  const videoReady = videoSubfamilias.length === 0
    || (Boolean(videoSalidaId) && (!(videoSubfamilias.includes('4') || videoSubfamilias.includes('5')) || canalesHabilitados.length > 0))
  const canGenerate = hasSalidas && Boolean(fotosRootFolderId) && Boolean(carpetaFotos) && Boolean(carpetaFotosId) && videoReady
  const rendering = running && Boolean(run?.result?.slots.some(slot => slot.renderStatus === 'render_pending'))
  const renderedCount = run?.result?.slots.filter(slot => slot.renderStatus === 'rendered').length ?? 0
  const renderFailedCount = run?.result?.slots.filter(slot => slot.renderStatus === 'render_failed').length ?? 0

  return (
    <div className="flex flex-col gap-4">
      {!hasSalidas && (
        <div className="rounded-xl px-4 py-3 text-[13px]" style={{ backgroundColor: 'rgba(232,180,92,0.08)', border: '1px solid rgba(232,180,92,0.25)', color: '#E8B45C' }}>
          Todavía no tenés salidas cargadas — el batch no va a tener con qué generar. Cargá al menos una salida primero.
        </div>
      )}

      {showButton && fotosRootFolderId && (
        <div className="rounded-xl px-5 py-4" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
          <StepHeader number={1} title="Elegí las imágenes" description="Usaremos esta carpeta en todas las piezas de la semana." />
          <div className="mt-4 pl-10">
            <FolderPicker
              rootFolderId={fotosRootFolderId}
              value={carpetaFotos}
              onChange={setCarpetaFotos}
              onFolderIdChange={setCarpetaFotosId}
            />
          </div>
        </div>
      )}

      {showButton && hasSalidas && (
        <div className="rounded-xl px-5 py-4" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" style={{ color: '#6B8F71' }} />
            <p className="text-[13.5px] font-semibold" style={{ color: '#EAF2EC' }}>Agregar video (opcional)</p>
          </div>
          <p className="text-[12px] mt-0.5 mb-3" style={{ color: '#7E9286' }}>
            Sumá piezas de video-familias a esta corrida — no forman parte de los slots fijos del calendario, se eligen a mano cada semana.
          </p>

          <div className="flex flex-wrap gap-2">
            {VIDEO_SUBFAMILIA_OPTIONS.map(opt => {
              const active = videoSubfamilias.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVideoSubfamilias(prev => active ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                  disabled={triggering}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'rgba(52,209,126,.12)' : '#111A11',
                    color: active ? '#34D17E' : '#6B8F71',
                    border: `1px solid ${active ? 'rgba(52,209,126,.3)' : '#1E2D1E'}`,
                    cursor: triggering ? 'not-allowed' : 'pointer',
                  }}
                >
                  {opt.value.toUpperCase()} · {opt.label}
                </button>
              )
            })}
          </div>

          {videoSubfamilias.length > 0 && (
            <div className="flex flex-col gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #1E2D1E' }}>
              <div className="flex items-center gap-2">
                <p className="text-xs" style={{ color: '#6B8F71' }}>Salida:</p>
                <div className="relative">
                  <select
                    value={videoSalidaId}
                    onChange={e => setVideoSalidaId(e.target.value)}
                    disabled={triggering}
                    className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium focus:outline-none"
                    style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4', cursor: triggering ? 'not-allowed' : 'pointer' }}
                  >
                    {salidas.length === 0 && <option value="">Sin salidas</option>}
                    {salidas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
                </div>
              </div>

              {(videoSubfamilias.includes('4') || videoSubfamilias.includes('5')) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs" style={{ color: '#6B8F71' }}>Familia 4 / fallback de Familia 5:</p>
                  {CANAL_OPTIONS.map(canal => {
                    const active = canalesHabilitados.includes(canal)
                    return (
                      <button
                        key={canal}
                        type="button"
                        onClick={() => setCanalesHabilitados(prev => active ? prev.filter(c => c !== canal) : [...prev, canal])}
                        disabled={triggering}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: active ? 'rgba(52,209,126,.12)' : '#111A11',
                          color: active ? '#34D17E' : '#6B8F71',
                          border: `1px solid ${active ? 'rgba(52,209,126,.3)' : '#1E2D1E'}`,
                          cursor: triggering ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {canal}
                      </button>
                    )
                  })}
                  <input
                    type="date"
                    value={publicationDate}
                    onChange={e => setPublicationDate(e.target.value)}
                    disabled={triggering}
                    className="px-2.5 py-1 rounded-lg text-xs focus:outline-none"
                    style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4' }}
                  />
                </div>
              )}
              {(videoSubfamilias.includes('4') || videoSubfamilias.includes('5')) && canalesHabilitados.length === 0 && (
                <p className="text-xs" style={{ color: '#E8B45C' }}>Familia 4 y el fallback de Familia 5 no generan sin al menos un canal habilitado.</p>
              )}
            </div>
          )}
        </div>
      )}

      {showButton && !fotosRootFolderId && (
        <div className="rounded-xl px-4 py-3 text-[13px]" style={{ backgroundColor: 'rgba(232,180,92,0.08)', border: '1px solid rgba(232,180,92,0.25)', color: '#E8B45C' }}>
          Configurá tu banco de imágenes en Fotos antes de generar la semana.
        </div>
      )}

      {showButton && (
        <div className="rounded-xl px-5 py-4" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
          <StepHeader number={2} title="Generá la semana" description={`Crearemos todas las piezas del plan ${calendarName} en una sola corrida.`} />
          <button
            onClick={handleGenerate}
            disabled={triggering || !canGenerate}
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] transition-all duration-150 disabled:opacity-50"
            style={{ backgroundColor: '#34D17E', color: '#0A0F0A', cursor: triggering || !canGenerate ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!triggering && canGenerate) e.currentTarget.style.backgroundColor = '#5CE6A0' }}
            onMouseLeave={e => { if (!triggering && canGenerate) e.currentTarget.style.backgroundColor = '#34D17E' }}
          >
            <Sparkles className="w-4 h-4" />
            {run?.status === 'completed' || run?.status === 'error' ? 'Generar una nueva semana' : 'Generar mi semana'}
          </button>
        </div>
      )}

      {running && (
        <div className="flex items-center gap-3 rounded-xl px-5 py-4" style={{ backgroundColor: '#0D130E', border: '1px solid rgba(52,209,126,0.22)' }}>
          <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: '#5CE6A0' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="text-[13.5px] font-medium" style={{ color: '#EAF2EC' }}>
              {rendering ? 'Los textos están listos · revisalos en el feed para aprobar el render' : 'Generando tu semana con IA…'}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: '#7E9286' }}>Puede tomar varios minutos — no hace falta que te quedes en esta pantalla.</p>
          </div>
        </div>
      )}

      {triggerError && <p className="text-xs" style={{ color: '#f87171' }}>{triggerError}</p>}

      {run?.status === 'error' && (
        <p className="text-[13px]" style={{ color: '#f87171' }}>La corrida falló: {run.error ?? 'error desconocido'}</p>
      )}

      {run?.result && (
        <div className="flex flex-col gap-3 rounded-xl px-5 py-4" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
          <StepHeader number={3} title="Revisá el resultado" description="Abrí cada pieza para revisar el texto y el render final." />
          <p className="text-[13px]" style={{ color: '#7E9286' }}>
            <span style={{ color: '#5CE6A0', fontWeight: 600 }}>{run.result.generated} generadas</span>
            {run.result.failed > 0 && <> · <span style={{ color: '#E8B45C', fontWeight: 600 }}>{run.result.failed} con problemas</span></>}
            {renderedCount > 0 && <> · <span style={{ color: '#5CE6A0', fontWeight: 600 }}>{renderedCount} renderizadas</span></>}
            {renderFailedCount > 0 && <> · <span style={{ color: '#f87171', fontWeight: 600 }}>{renderFailedCount} con render fallido</span></>}
            {Boolean(run.result.videoGenerated) && <> · <span style={{ color: '#5CE6A0', fontWeight: 600 }}>{run.result.videoGenerated} video{run.result.videoGenerated === 1 ? '' : 's'}</span></>}
            {Boolean(run.result.videoFailed) && <> · <span style={{ color: '#f87171', fontWeight: 600 }}>{run.result.videoFailed} video{run.result.videoFailed === 1 ? '' : 's'} con error</span></>}
          </p>
          {Boolean(run.result.videoGenerated) && (
            <p className="text-[12px]" style={{ color: '#7E9286' }}>
              El video queda pendiente de aprobación en <Link href="/contenido" className="font-medium" style={{ color: '#5CE6A0' }}>/contenido</Link> — no se disparó a Mati todavía.
            </p>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E2D1E' }}>
            {run.result.slots.map((slot, i) => {
              const meta = slot.outcome === 'generated' && slot.renderStatus
                ? RENDER_META[slot.renderStatus]
                : OUTCOME_META[slot.outcome]
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ backgroundColor: '#0D130E', borderTop: i > 0 ? '1px solid #1E2D1E' : undefined }}
                >
                  <meta.Icon className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: '#EAF2EC' }}>
                      {slot.label} <span style={{ color: '#7E9286', fontWeight: 400 }}>· {FORMATO_LABELS[slot.formatoCarrusel] ?? slot.formatoCarrusel}</span>
                    </p>
                    {slot.reason && (
                      <p className="text-[12px] mt-0.5" style={{ color: '#7E9286' }}>{slot.reason}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                  {slot.salidaId && slot.contenidoId && (
                    <Link
                      href={`/salidas/${slot.salidaId}/contenido?nuevos=${slot.contenidoId}`}
                      className="text-[12px] font-medium flex-shrink-0"
                      style={{ color: '#5CE6A0' }}
                    >
                      Ver →
                    </Link>
                  )}
                  {slot.salidaId && !slot.contenidoId && slot.outcome !== 'sin_salida_disponible' && (
                    <Link
                      href={`/salidas/${slot.salidaId}/contenido`}
                      className="text-[12px] font-medium flex-shrink-0"
                      style={{ color: '#E8B45C' }}
                    >
                      Completar a mano →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
