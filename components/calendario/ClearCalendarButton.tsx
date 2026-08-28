'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Trash2, X } from 'lucide-react'

interface Props {
  runId: string
  pieceCount: number
}

export default function ClearCalendarButton({ runId, pieceCount }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function clearCalendar() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/generate-batch/${runId}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo vaciar el calendario')
      setOpen(false)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo vaciar el calendario')
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
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[var(--linea)] bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[var(--piedra)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 lg:w-auto"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Vaciar calendario
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" onClick={() => !loading && setOpen(false)}>
          <div className="w-full max-w-[420px] rounded-[22px] bg-[var(--nieve)] p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-red-700">Vaciar semana</p>
                <h3 className="mt-2 text-[20px] font-semibold tracking-[-.025em] text-[var(--tinta)]">¿Borramos estas {pieceCount} piezas?</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={loading} aria-label="Cerrar">
                <X className="h-5 w-5 text-[var(--piedra)]" />
              </button>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-[var(--piedra)]">
              El calendario quedará limpio para generar otra semana. Tus salidas, fotos, videos y carpetas de Drive no se borran.
            </p>

            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">{error}</p>}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-full border border-[var(--linea)] bg-white px-4 py-3 text-[13px] font-semibold text-[var(--tinta)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void clearCalendar()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-red-700 px-4 py-3 text-[13px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {loading ? 'Vaciando…' : 'Sí, vaciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
