'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Sparkles, X } from 'lucide-react'

interface RegenerateSalidaOption {
  id: string
  nombre: string
  fecha_inicio: string | null
}

interface RegenerateWeekButtonProps {
  salidas: RegenerateSalidaOption[]
  clientId?: string
  isAgency?: boolean
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

export default function RegenerateWeekButton({ salidas, clientId, isAgency }: RegenerateWeekButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [salidaId, setSalidaId] = useState(salidas[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function regenerate() {
    if (!isAgency && !salidaId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salidaId: isAgency ? undefined : salidaId,
          ...(clientId ? { clientId } : {}),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo iniciar la generación')
      }
      setOpen(false)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos iniciar la generación. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError('')
          setOpen(true)
        }}
        disabled={!isAgency && salidas.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--cardon)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50 lg:w-auto"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Generar nueva semana
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-[460px] rounded-[22px] bg-[var(--nieve)] p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--cardon)]">Nueva semana</p>
                <h3 className="mt-1 text-[20px] font-semibold tracking-[-.025em] text-[var(--tinta)]">Generar próxima semana</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                aria-label="Cerrar"
                className="rounded-full p-1 text-[var(--piedra)] hover:bg-[var(--linea)] hover:text-[var(--tinta)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isAgency ? (
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--piedra)]">
              Se generará un lote de 14 piezas listas para publicar, rotando dinámicamente entre tus próximas salidas. Las semanas que ya tenés se conservan en tu <strong>Historial de publicaciones</strong>.
            </p>
          ) : (
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--piedra)]">
              Se generará un lote de 10 piezas listas para publicar. Las semanas que ya tenés se conservan automáticamente en tu <strong>Historial de publicaciones</strong>.
            </p>
          )}

          {!isAgency && (
            <div className="mt-4 flex flex-col gap-2">
              <label htmlFor="calendar-salida-picker" className="text-[12px] font-semibold text-[var(--tinta)]">
                ¿De qué salida querés generar el contenido?
              </label>
              <select
                id="calendar-salida-picker"
                value={salidaId}
                onChange={event => setSalidaId(event.target.value)}
                disabled={loading}
                aria-label="Salida para la nueva semana"
                className="w-full rounded-[14px] border-2 border-[var(--linea)] bg-white px-4 py-3 text-[14px] font-semibold text-[var(--tinta)] outline-none focus:border-[var(--cardon)] transition-colors"
              >
                {salidas.map(salida => (
                  <option key={salida.id} value={salida.id}>
                    {salida.nombre} {salida.fecha_inicio ? `(${formatDate(salida.fecha_inicio)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-full border border-[var(--linea)] bg-white px-4 py-3 text-[13px] font-semibold text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={loading || (!isAgency && !salidaId)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--cardon)] px-4 py-3 text-[13px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Iniciando…' : 'Generar semana'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
