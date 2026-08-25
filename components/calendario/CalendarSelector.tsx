'use client'

import { Check } from 'lucide-react'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import type { CalendarCode, FormatoCarrusel } from '@/types'

interface CalendarSelectorProps {
  value: CalendarCode | null
  onChange: (code: CalendarCode) => void
  disabled?: boolean
}

const FORMAT_LABELS: Record<FormatoCarrusel, string> = {
  editorial: 'Editorial',
  organico: 'Orgánico',
  itinerario: 'Itinerario',
  ascenso: 'Ascenso',
  calendario: 'Fechas',
  lugar: 'Lugar',
  conversacion: 'Conversación',
}

const CALENDARS = Object.values(CALENDAR_CATALOG)

function cadenceLabel(min: number, max: number): string {
  return min === max ? `${min} piezas por semana` : `${min}–${max} piezas por semana`
}

function formatsForCalendar(code: CalendarCode): FormatoCarrusel[] {
  const calendar = CALENDAR_CATALOG[code]
  return [...new Set(calendar.slots.flatMap(slot => [
    ...slot.formatosCarrusel,
    ...(slot.rotacionSemanal ?? []),
    ...(slot.fallbackFormatoSinSalidaPasada ? [slot.fallbackFormatoSinSalidaPasada] : []),
    ...(slot.formatoSiNoCumpleCondicion ? [slot.formatoSiNoCumpleCondicion] : []),
  ]))]
}

export default function CalendarSelector({ value, onChange, disabled = false }: CalendarSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Elegí un plan semanal"
      className="grid grid-cols-1 lg:grid-cols-2 gap-3"
    >
      {CALENDARS.map(calendar => {
        const selected = value === calendar.code
        return (
          <button
            key={calendar.code}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(calendar.code)}
            className="relative text-left rounded-2xl p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: selected ? 'var(--cardon-tenue)' : 'var(--nieve)',
              border: selected ? '1px solid rgba(62, 92, 72, 0.45)' : '1px solid var(--linea)',
              boxShadow: selected ? '0 8px 24px rgba(22,25,21,.06)' : 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold" style={{ color: 'var(--tinta)' }}>{calendar.nombre}</p>
                <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: 'var(--piedra)' }}>{calendar.fraseCliente}</p>
              </div>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  color: selected ? 'var(--nieve)' : 'transparent',
                  backgroundColor: selected ? 'var(--cardon)' : 'transparent',
                  border: selected ? '1px solid var(--cardon)' : '1px solid var(--piedra-clara)',
                }}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
            </div>

            <p className="text-[12px] mt-3 leading-relaxed" style={{ color: 'var(--piedra)' }}>
              {calendar.objetivoNegocio}
            </p>

            <div className="flex items-center justify-between gap-3 mt-4">
              <span className="text-[11px] font-semibold" style={{ color: selected ? 'var(--cardon)' : 'var(--piedra)' }}>
                {cadenceLabel(calendar.cadencia.min, calendar.cadencia.max)}
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {formatsForCalendar(calendar.code).map(format => (
                  <span
                    key={format}
                    className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ color: 'var(--piedra)', backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}
                  >
                    {FORMAT_LABELS[format]}
                  </span>
                ))}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
