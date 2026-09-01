'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import CalendarSelector from '@/components/calendario/CalendarSelector'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import type { CalendarCode } from '@/types'

interface CalendarAssignmentPopoverProps {
  clientId: string
  initialCalendar: CalendarCode
}

export default function CalendarAssignmentPopover({
  clientId,
  initialCalendar,
}: CalendarAssignmentPopoverProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [calendar, setCalendar] = useState(initialCalendar)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function assignCalendar(nextCalendar: CalendarCode) {
    if (nextCalendar === calendar || saving) return

    const previousCalendar = calendar
    setCalendar(nextCalendar)
    setSaving(true)
    setStatus('idle')
    setError(null)

    try {
      const response = await fetch('/api/admin/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          calendario_asignado: nextCalendar,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo asignar el calendario')
      }

      setStatus('saved')
      router.refresh()
    } catch (assignmentError) {
      setCalendar(previousCalendar)
      setStatus('error')
      setError(assignmentError instanceof Error ? assignmentError.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const definition = CALENDAR_CATALOG[calendar]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen(current => !current)
          setStatus('idle')
          setError(null)
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors"
        style={{
          color: 'var(--tinta)',
          backgroundColor: 'var(--nieve)',
          borderColor: open ? 'var(--cardon)' : 'var(--linea)',
        }}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold" style={{ color: 'var(--piedra)' }}>
            {calendar}
          </span>
          <span className="block truncate text-[12px]">{definition.nombre}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--piedra)' }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Asignar calendario editorial"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-[min(720px,calc(100vw-48px))] rounded-2xl border p-4 shadow-2xl"
          style={{
            backgroundColor: 'var(--nieve)',
            borderColor: 'var(--linea)',
            boxShadow: 'var(--sombra-alta)',
          }}
        >
          <div className="mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--tinta)' }}>
              Asignar calendario
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--piedra)' }}>
              El cambio se guarda al elegir una opciÃ³n.
            </p>
          </div>

          <CalendarSelector value={calendar} onChange={assignCalendar} disabled={saving} />

          <div aria-live="polite" className="mt-3 min-h-5 text-xs">
            {saving && <span style={{ color: 'var(--piedra)' }}>Guardandoâ€¦</span>}
            {!saving && status === 'saved' && <span style={{ color: 'var(--cardon)' }}>Calendario guardado.</span>}
            {!saving && status === 'error' && <span style={{ color: '#f87171' }}>{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
