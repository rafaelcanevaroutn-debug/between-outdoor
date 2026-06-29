'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronRight, ChevronDown } from 'lucide-react'

interface GenerateButtonProps {
  salidaId: string
}

const CANTIDAD_OPTIONS = [1, 2, 3, 6, 10, 15, 20, 30]
type Objetivo = 'vender_salida' | 'mantener_cuenta'
type Formato = 'carrusel' | 'video' | 'flyer'

const FORMATO_OPTIONS: { value: Formato; label: string }[] = [
  { value: 'carrusel', label: 'Carrusel' },
  { value: 'video',    label: 'Video' },
  { value: 'flyer',    label: 'Flyer' },
]

export default function GenerateButton({ salidaId }: GenerateButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formato, setFormato] = useState<Formato>('carrusel')
  const [cantidad, setCantidad] = useState(6)
  const [objetivo, setObjetivo] = useState<Objetivo>('vender_salida')

  async function handleGenerate() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidaId, cantidad, objetivo, formato }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al generar contenido')
        setLoading(false)
        return
      }

      router.push(`/salidas/${salidaId}/contenido`)
    } catch (err) {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selectores de formato, modo y cantidad */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm" style={{ color: '#6B8F71' }}>Formato:</p>
          <div className="relative">
            <select
              value={formato}
              onChange={e => setFormato(e.target.value as Formato)}
              disabled={loading}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: '#111A11',
                border: '1px solid #1E2D1E',
                color: '#F0FFF4',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {FORMATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm" style={{ color: '#6B8F71' }}>Modo:</p>
          <div className="relative">
            <select
              value={objetivo}
              onChange={e => setObjetivo(e.target.value as Objetivo)}
              disabled={loading}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: '#111A11',
                border: `1px solid ${objetivo === 'mantener_cuenta' ? '#8B5CF6' : '#1E2D1E'}`,
                color: objetivo === 'mantener_cuenta' ? '#C4B5FD' : '#F0FFF4',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="vender_salida">Vender salida</option>
              <option value="mantener_cuenta">Mantener cuenta</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm" style={{ color: '#6B8F71' }}>Piezas:</p>
          <div className="relative">
            <select
              value={cantidad}
              onChange={e => setCantidad(Number(e.target.value))}
              disabled={loading}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: '#111A11',
                border: '1px solid #1E2D1E',
                color: '#F0FFF4',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {CANTIDAD_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-150 disabled:opacity-70"
        style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#5CE6A0' }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#34D17E' }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generando con IA...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generar {cantidad} piezas con IA
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
      {loading && (
        <p className="text-xs text-center" style={{ color: '#6B8F71' }}>
          Generando {cantidad} piezas — puede tomar hasta {Math.round(cantidad * 4)} segundos. No cerrés la página.
        </p>
      )}
      {error && (
        <p className="text-xs text-center" style={{ color: '#f87171' }}>{error}</p>
      )}
    </div>
  )
}
