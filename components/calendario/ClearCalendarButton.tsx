'use client'

import {useState} from 'react'
import {LoaderCircle, Trash2} from 'lucide-react'
import {useRouter} from 'next/navigation'

interface ClearCalendarButtonProps {
  runId: string
  pieceCount: number
}

export default function ClearCalendarButton({runId, pieceCount}: ClearCalendarButtonProps) {
  const router = useRouter()
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function clearCalendar() {
    const confirmed = window.confirm(
      `¿Borrar las ${pieceCount} piezas de esta semana? Se eliminará el calendario visible y esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setClearing(true)
    setError(null)
    try {
      const response = await fetch(`/api/generate-batch/${runId}/clear-week`, {method: 'DELETE'})
      const payload = await response.json().catch(() => ({})) as {error?: string}
      if (!response.ok) throw new Error(payload.error || 'No pudimos borrar el calendario.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos borrar el calendario.')
      setClearing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={clearCalendar}
        disabled={clearing}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--linea)] bg-transparent px-4 text-[12px] font-semibold text-[var(--piedra)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {clearing
          ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        {clearing ? 'Borrando…' : 'Borrar calendario'}
      </button>
      {error && <p role="alert" className="max-w-[220px] text-[11px] leading-snug text-red-700">{error}</p>}
    </div>
  )
}
