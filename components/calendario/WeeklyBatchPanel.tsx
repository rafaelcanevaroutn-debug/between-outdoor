'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { CalendarBatchRun, CalendarCode, Salida } from '@/types'

type SalidaPickerOption = Pick<Salida, 'id' | 'nombre' | 'fecha_inicio' | 'estado' | 'carpeta_fotos_id'>

interface WeeklyBatchPanelProps {
  calendarCode: CalendarCode
  calendarName: string
  initialRun: CalendarBatchRun | null
  hasSalidas: boolean
  salidas: SalidaPickerOption[]
}

const POLL_INTERVAL_MS = 5000

function isActive(status: CalendarBatchRun['status'] | undefined) {
  return status === 'pending' || status === 'running'
}

export default function WeeklyBatchPanel({ calendarCode, calendarName, initialRun, hasSalidas, salidas }: WeeklyBatchPanelProps) {
  const router = useRouter()
  const [run, setRun] = useState<CalendarBatchRun | null>(initialRun)
  const [triggerError, setTriggerError] = useState('')
  const [triggering, setTriggering] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isActive(run?.status)) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate-batch/${run!.id}`)
        if (!res.ok) return
        const data: CalendarBatchRun = await res.json()
        setRun(data)
        if (data.status === 'completed' || data.status === 'error') {
          router.refresh()
        }
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
    setTriggerError('')
    setTriggering(true)
    try {
      const res = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
      setTriggerError('Tuvimos un problema de conexión. Intentá de nuevo.')
      setTriggering(false)
    }
  }

  const running = isActive(run?.status)
  const showButton = !running

  const today = new Date().toISOString().slice(0, 10)
  const activeSalidas = salidas.filter(s => s.estado !== 'completada' && s.fecha_inicio >= today)
  const missingPhotos = activeSalidas.filter(s => !s.carpeta_fotos_id)
  const hasMissingPhotos = missingPhotos.length > 0

  return (
    <div className="flex flex-col gap-5">
      {!hasSalidas && (
        <div className="rounded-2xl px-5 py-4 text-[14px] flex items-center gap-3" style={{ backgroundColor: '#FEF3CD', border: '1px solid #F5D280', color: '#92611A' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>No tenés salidas activas cargadas. Necesitamos al menos una salida para poder armar tu contenido semanal.</span>
        </div>
      )}

      {showButton && (
        <div className="rounded-2xl px-6 py-8 text-center flex flex-col items-center" style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', boxShadow: 'var(--sombra-reposo)' }}>
          <h2 className="text-[22px] font-bold" style={{ color: 'var(--tinta)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>¡Todo listo para armar tu semana!</h2>
          <p className="text-[14px] mt-2 mb-6 max-w-md" style={{ color: 'var(--piedra)' }}>
            La Inteligencia Artificial redactará los textos y unirá las fotos de tus viajes para crear los posteos automáticamente.
          </p>

          {hasMissingPhotos && (
            <div className="mb-6 rounded-xl p-4 text-[14px] flex flex-col gap-2 text-left" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B' }}>
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>Atención: Faltan carpetas de fotos</span>
              </div>
              <p>Tenés salidas próximas que no tienen fotos asignadas. Para generar posteos de calidad (y no diseños por defecto vacíos), por favor vinculá una carpeta de imágenes a estas salidas:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {missingPhotos.map(s => (
                  <li key={s.id}>
                    <Link href={`/salidas/${s.id}`} className="underline underline-offset-2 hover:opacity-80">
                      {s.nombre} ({s.fecha_inicio})
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={triggering || !hasSalidas || hasMissingPhotos}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-bold text-[16px] transition-all duration-200 disabled:opacity-40 hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'var(--cardon)', color: 'var(--nieve)', cursor: triggering || !hasSalidas || hasMissingPhotos ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px -8px rgba(62,92,72,.35)' }}
          >
            <Sparkles className="w-5 h-5" />
            {run?.status === 'completed' || run?.status === 'error' ? 'Volver a generar la semana' : 'Generar mi semana'}
          </button>
          {triggerError && <p className="text-[13px] font-medium mt-3" style={{ color: '#991B1B' }}>{triggerError}</p>}
        </div>
      )}

      {running && (
        <div className="flex flex-col gap-4 rounded-2xl px-8 py-10 text-center" style={{ backgroundColor: 'var(--cardon-tenue)', border: '1px solid var(--linea)' }}>
          <div className="mx-auto w-14 h-14 relative flex items-center justify-center">
            <svg className="animate-spin h-full w-full absolute inset-0" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--piedra-clara)' }}>
              <circle className="opacity-100" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            </svg>
            <svg className="animate-spin h-full w-full absolute inset-0" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--cardon)' }}>
              <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <Sparkles className="w-5 h-5 absolute" style={{ color: 'var(--cardon)' }} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold" style={{ color: 'var(--tinta)' }}>
              Between está creando tu contenido...
            </h3>
            <p className="text-[14px] mt-2 max-w-sm mx-auto" style={{ color: 'var(--piedra)' }}>
              Este proceso analiza tus salidas y redacta posteos personalizados. Puede tomar varios minutos, <strong>podés irte de esta pantalla y volver luego.</strong>
            </p>
          </div>
        </div>
      )}

      {run?.status === 'error' && (
        <div className="rounded-2xl px-5 py-4 text-[14px] flex items-center gap-3 mt-4" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B' }}>
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>Ups, ocurrió un error: {run.error ?? 'desconocido'}. Por favor, intentá de nuevo.</span>
        </div>
      )}
    </div>
  )
}
