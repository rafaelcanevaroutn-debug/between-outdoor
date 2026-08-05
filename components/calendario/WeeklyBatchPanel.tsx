'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import type { CalendarBatchRun, CalendarBatchSlotResult, CalendarCode } from '@/types'

interface WeeklyBatchPanelProps {
  calendarCode: CalendarCode
  calendarName: string
  initialRun: CalendarBatchRun | null
  hasSalidas: boolean
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

function isActive(status: CalendarBatchRun['status'] | undefined) {
  return status === 'pending' || status === 'running'
}

export default function WeeklyBatchPanel({ calendarCode, calendarName, initialRun, hasSalidas }: WeeklyBatchPanelProps) {
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
      } catch {
        // red intermitente — reintenta en el próximo tick, no aborta el polling
      }
    }

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [run?.id, run?.status])

  async function handleGenerate() {
    setTriggerError('')
    setTriggering(true)
    try {
      const res = await fetch('/api/generate-batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
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

  return (
    <div className="flex flex-col gap-4">
      {!hasSalidas && (
        <div className="rounded-xl px-4 py-3 text-[13px]" style={{ backgroundColor: 'rgba(232,180,92,0.08)', border: '1px solid rgba(232,180,92,0.25)', color: '#E8B45C' }}>
          Todavía no tenés salidas cargadas — el batch no va a tener con qué generar. Cargá al menos una salida primero.
        </div>
      )}

      {showButton && (
        <button
          onClick={handleGenerate}
          disabled={triggering || !hasSalidas}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-150 disabled:opacity-50 w-fit"
          style={{ backgroundColor: '#34D17E', color: '#0A0F0A', cursor: triggering || !hasSalidas ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!triggering && hasSalidas) e.currentTarget.style.backgroundColor = '#5CE6A0' }}
          onMouseLeave={e => { if (!triggering && hasSalidas) e.currentTarget.style.backgroundColor = '#34D17E' }}
        >
          <Sparkles className="w-5 h-5" />
          {run?.status === 'completed' || run?.status === 'error' ? `Generar mi semana de nuevo (${calendarName})` : `Generar mi semana (${calendarName})`}
        </button>
      )}

      {running && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
          <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: '#5CE6A0' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="text-[13.5px] font-medium" style={{ color: '#EAF2EC' }}>Generando tu semana con IA…</p>
            <p className="text-[12px] mt-0.5" style={{ color: '#7E9286' }}>Puede tomar varios minutos — no hace falta que te quedes en esta pantalla.</p>
          </div>
        </div>
      )}

      {triggerError && <p className="text-xs" style={{ color: '#f87171' }}>{triggerError}</p>}

      {run?.status === 'error' && (
        <p className="text-[13px]" style={{ color: '#f87171' }}>La corrida falló: {run.error ?? 'error desconocido'}</p>
      )}

      {run?.status === 'completed' && run.result && (
        <div className="flex flex-col gap-3">
          <p className="text-[13px]" style={{ color: '#7E9286' }}>
            <span style={{ color: '#5CE6A0', fontWeight: 600 }}>{run.result.generated} generadas</span>
            {run.result.failed > 0 && <> · <span style={{ color: '#E8B45C', fontWeight: 600 }}>{run.result.failed} con problemas</span></>}
          </p>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E2D1E' }}>
            {run.result.slots.map((slot, i) => {
              const meta = OUTCOME_META[slot.outcome]
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
                      href={`/salidas/${slot.salidaId}/contenido`}
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
