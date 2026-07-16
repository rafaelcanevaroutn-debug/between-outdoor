'use client'

import type { CarruselEligibility } from '@/lib/carrusel-eligibility'
import type { FormatoCarrusel, ObjetivoInteraccion } from '@/types'
import type { DiaItinerario } from '@/types'

export interface RelatedSalidaOption {
  id: string
  nombre: string
  destino: string
  fecha_inicio: string
  estado: string
  pais_codigo?: string | null
  itinerario?: string | null
  itinerario_dias?: DiaItinerario[] | null
}

interface Props {
  formato: FormatoCarrusel
  objetivo: ObjetivoInteraccion
  eligibility: CarruselEligibility
  relatedSalidas: RelatedSalidaOption[]
  sourcePastSalidaId: string
  futureRelatedSalidaId: string
  disabled?: boolean
  onFormatoChange: (value: FormatoCarrusel) => void
  onObjetivoChange: (value: ObjetivoInteraccion) => void
  onSourcePastChange: (value: string) => void
  onFutureRelatedChange: (value: string) => void
}

const FORMATOS: { value: FormatoCarrusel; label: string; description: string }[] = [
  { value: 'editorial', label: 'Editorial', description: 'Carrusel temático con el pipeline actual.' },
  { value: 'organico', label: 'Orgánico', description: 'Frase, datos mínimos y protagonismo de las fotos.' },
  { value: 'itinerario', label: 'Itinerario', description: 'Una etapa por cada día estructurado.' },
  { value: 'ascenso', label: 'Ascenso', description: 'Historia real de una salida pasada.' },
  { value: 'calendario', label: 'Calendario', description: 'Fechas futuras y feriados en una sola guía.' },
  { value: 'lugar', label: 'Lugar', description: 'Descubrimiento de puntos de interés verificados.' },
  { value: 'conversacion', label: 'Conversación', description: 'Diálogo breve con giro visual outdoor.' },
]

const OBJETIVOS: { value: ObjetivoInteraccion; label: string }[] = [
  { value: 'convertir', label: 'Convertir' },
  { value: 'comentar', label: 'Comentarios' },
  { value: 'guardar', label: 'Guardados' },
  { value: 'compartir', label: 'Compartidos' },
]

export default function CarruselFormatPanel({
  formato,
  objetivo,
  eligibility,
  relatedSalidas,
  sourcePastSalidaId,
  futureRelatedSalidaId,
  disabled = false,
  onFormatoChange,
  onObjetivoChange,
  onSourcePastChange,
  onFutureRelatedChange,
}: Props) {
  const selected = FORMATOS.find(item => item.value === formato)
  const now = new Date().toISOString().slice(0, 10)
  const past = relatedSalidas.filter(item => item.fecha_inicio < now || item.estado === 'completada')
  const future = relatedSalidas.filter(item => item.fecha_inicio >= now && item.estado !== 'completada')

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs" style={{ color: '#6B8F71' }}>
          Formato de carrusel
          <select value={formato} onChange={e => onFormatoChange(e.target.value as FormatoCarrusel)} disabled={disabled} className="px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4' }}>
            {FORMATOS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs" style={{ color: '#6B8F71' }}>
          Objetivo principal
          <select value={objetivo} onChange={e => onObjetivoChange(e.target.value as ObjetivoInteraccion)} disabled={disabled} className="px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4' }}>
            {OBJETIVOS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <p className="text-xs" style={{ color: '#4A6B4A' }}>{selected?.description}</p>

      {formato === 'ascenso' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-xs" style={{ color: '#6B8F71' }}>
            Salida pasada fuente *
            <select value={sourcePastSalidaId} onChange={e => onSourcePastChange(e.target.value)} disabled={disabled} className="px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4' }}>
              <option value="">Seleccionar…</option>
              {past.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.fecha_inicio}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs" style={{ color: '#6B8F71' }}>
            Próxima salida equivalente
            <select value={futureRelatedSalidaId} onChange={e => onFutureRelatedChange(e.target.value)} disabled={disabled} className="px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4' }}>
              <option value="">Sin salida futura</option>
              {future.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.fecha_inicio}</option>)}
            </select>
          </label>
        </div>
      )}

      {(eligibility.errors.length > 0 || eligibility.warnings.length > 0) && (
        <div className="flex flex-col gap-1.5 rounded-lg px-3 py-2.5" style={{ backgroundColor: eligibility.errors.length > 0 ? 'rgba(239,68,68,.06)' : 'rgba(245,158,11,.06)', border: `1px solid ${eligibility.errors.length > 0 ? 'rgba(239,68,68,.2)' : 'rgba(245,158,11,.2)'}` }}>
          {eligibility.errors.map(error => <p key={error} className="text-xs" style={{ color: '#f87171' }}>• {error}</p>)}
          {eligibility.warnings.map(warning => <p key={warning} className="text-xs" style={{ color: '#F59E0B' }}>• {warning}</p>)}
        </div>
      )}
    </div>
  )
}
