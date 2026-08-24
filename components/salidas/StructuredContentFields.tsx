'use client'

import { useState } from 'react'
import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
import type { DiaItinerario, PuntoInteres } from '@/types'

interface StructuredContentFieldsProps {
  destino: string
  itinerarioDias: DiaItinerario[]
  puntosInteres: PuntoInteres[]
  onItinerarioChange: (dias: DiaItinerario[]) => void
  onPuntosInteresChange: (puntos: PuntoInteres[]) => void
  disabled?: boolean
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors'
const inputStyle = { backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E', color: '#F0FFF4' }

export default function StructuredContentFields({
  destino,
  itinerarioDias,
  puntosInteres,
  onItinerarioChange,
  onPuntosInteresChange,
  disabled = false,
}: StructuredContentFieldsProps) {
  const [rawItinerary, setRawItinerary] = useState('')
  const [rawPlaces, setRawPlaces] = useState('')
  const [organizing, setOrganizing] = useState<'itinerario' | 'puntos_interes' | 'verificar_puntos' | null>(null)
  const [error, setError] = useState('')
  const [errorScope, setErrorScope] = useState<'itinerario' | 'puntos_interes' | null>(null)

  async function organize(tipo: 'itinerario' | 'puntos_interes') {
    const texto = tipo === 'itinerario' ? rawItinerary : rawPlaces
    if (!texto.trim()) {
      setError('Pegá primero la información que querés organizar.')
      setErrorScope(tipo)
      return
    }
    if ((tipo === 'itinerario' ? itinerarioDias : puntosInteres).length > 0 && !confirm('Esto reemplazará las tarjetas actuales con la información organizada. ¿Continuar?')) return
    setOrganizing(tipo)
    setError('')
    setErrorScope(null)
    try {
      const response = await fetch('/api/salidas/organizar-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, texto }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo organizar la información')
      if (tipo === 'itinerario') onItinerarioChange(result.data as DiaItinerario[])
      else onPuntosInteresChange(result.data as PuntoInteres[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo organizar la información')
      setErrorScope(tipo)
    } finally {
      setOrganizing(null)
    }
  }

  async function verifyPlaces() {
    if (!destino.trim()) {
      setError('Cargá primero el destino de la salida.')
      setErrorScope('puntos_interes')
      return
    }
    if (puntosInteres.length > 0 && !confirm('Esto reemplazará los lugares actuales por una selección investigada y verificada. ¿Continuar?')) return
    setOrganizing('verificar_puntos')
    setError('')
    setErrorScope(null)
    try {
      const response = await fetch('/api/salidas/verificar-lugares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destino, itinerarioDias, puntosInteres }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudieron verificar los lugares')
      onPuntosInteresChange(result.data as PuntoInteres[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron verificar los lugares')
      setErrorScope('puntos_interes')
    } finally {
      setOrganizing(null)
    }
  }

  return (
    <>
      <section className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Itinerario del viaje</h2>
            <p className="text-xs mt-1" style={{ color: '#4A6B4A' }}>Pegá el itinerario como lo tengas. La IA estructurará los días automáticamente.</p>
          </div>
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0A0F0A', border: '1px solid rgba(52,209,126,.2)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#34D17E' }} />
            <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>Pegá el itinerario completo</p>
          </div>
          <p className="text-xs" style={{ color: '#6B8F71' }}>Puede venir de WhatsApp, una web o un documento. No hace falta ordenarlo ni completar campos.</p>
          <textarea value={rawItinerary} onChange={e => setRawItinerary(e.target.value)} disabled={disabled || organizing !== null} rows={7} placeholder={'Ejemplo:\nDía 1: llegada a El Chaltén y alojamiento.\nDía 2: salida 7:00 hacia Laguna de los Tres...'} className={`${inputClass} resize-y`} style={inputStyle} />
          <button type="button" onClick={() => organize('itinerario')} disabled={disabled || organizing !== null || !rawItinerary.trim()} className="self-start flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}>
            {organizing === 'itinerario' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {organizing === 'itinerario' ? 'Organizando…' : 'Organizar itinerario con IA'}
          </button>
          {error && errorScope === 'itinerario' && <p role="alert" className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(239,68,68,.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,.2)' }}>{error}</p>}
        </div>

        {itinerarioDias.length > 0 && (
          <div className="rounded-xl p-4 mt-2" style={{ backgroundColor: 'rgba(52,209,126,.1)', border: '1px solid rgba(52,209,126,.2)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#34D17E' }}>✓ {itinerarioDias.length} días estructurados por IA:</p>
            <ul className="flex flex-col gap-2">
              {itinerarioDias.map((dia, index) => (
                <li key={index} className="text-sm" style={{ color: '#F0FFF4' }}>
                  <span className="font-bold opacity-80 mr-2">Día {dia.numero}:</span>
                  {dia.titulo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Lugares que aparecen en esta experiencia</h2>
            <p className="text-xs mt-1" style={{ color: '#4A6B4A' }}>Senderos, miradores, lagunas u otros lugares detectados por IA.</p>
          </div>
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0A0F0A', border: '1px solid rgba(52,209,126,.2)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#34D17E' }} />
            <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>Pegá toda la información sobre los lugares</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#6B8F71' }}>Incluí enlaces o indicá de dónde sale la información cuando los tengas. Sin una fuente, el lugar se guarda como pendiente de verificar y no se usa todavía para afirmar datos en el carrusel Lugar.</p>
          <textarea value={rawPlaces} onChange={e => setRawPlaces(e.target.value)} disabled={disabled || organizing !== null} rows={7} placeholder={'Ejemplo:\nVisitamos Laguna de los Tres. El recorrido es de aproximadamente 20 km...\nFuente: https://sitio-oficial/...'} className={`${inputClass} resize-y`} style={inputStyle} />
          <button type="button" onClick={() => organize('puntos_interes')} disabled={disabled || organizing !== null || !rawPlaces.trim()} className="self-start flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}>
            {organizing === 'puntos_interes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {organizing === 'puntos_interes' ? 'Organizando…' : 'Detectar y organizar lugares'}
          </button>
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: 'rgba(52,209,126,.04)', border: '1px solid rgba(52,209,126,.3)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#34D17E' }} />
            <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>Buscar y verificar lugares automáticamente</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#6B8F71' }}>La IA toma el destino y el itinerario, investiga entre 3 y 6 lugares con Google Search y completa las fuentes. Después podés revisar todo antes de guardar.</p>
          <button type="button" onClick={verifyPlaces} disabled={disabled || organizing !== null || !destino.trim()} className="self-start flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}>
            {organizing === 'verificar_puntos' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {organizing === 'verificar_puntos' ? 'Buscando y verificando…' : 'Buscar lugares y fuentes con IA'}
          </button>
          {error && errorScope === 'puntos_interes' && <p role="alert" className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(239,68,68,.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,.2)' }}>{error}</p>}
        </div>

        <details className="group">
          <summary className="list-none cursor-pointer flex items-center gap-2 text-xs font-semibold" style={{ color: '#6B8F71' }}>
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            ¿Qué cuenta como fuente verificable?
          </summary>
          <p className="text-xs leading-relaxed mt-2 pl-6" style={{ color: '#4A6B4A' }}>Una página oficial, la web del destino, una ficha técnica del guía, un documento propio confirmado o un enlace donde figure el dato. Sirve para evitar que la IA invente distancias, duración o dificultad.</p>
        </details>

        {puntosInteres.length > 0 && (
          <div className="rounded-xl p-4 mt-2" style={{ backgroundColor: 'rgba(52,209,126,.1)', border: '1px solid rgba(52,209,126,.2)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#34D17E' }}>✓ {puntosInteres.length} lugares detectados por IA:</p>
            <ul className="flex flex-col gap-2">
              {puntosInteres.map((punto, index) => (
                <li key={index} className="text-sm flex items-center justify-between gap-4" style={{ color: '#F0FFF4' }}>
                  <span className="truncate">
                    <span className="font-bold opacity-80 mr-2">{index + 1}.</span>
                    {punto.nombre}
                  </span>
                  {punto.fuente && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(52,209,126,.2)', color: '#34D17E' }}>Verificado</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  )
}
