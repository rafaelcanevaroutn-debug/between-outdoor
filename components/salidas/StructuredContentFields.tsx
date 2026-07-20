'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
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

function renumberDays(dias: DiaItinerario[]): DiaItinerario[] {
  return dias.map((dia, index) => ({ ...dia, numero: index + 1 }))
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
      style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
    >
      {children}
    </button>
  )
}

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

  function addDay() {
    onItinerarioChange([
      ...itinerarioDias,
      { numero: itinerarioDias.length + 1, titulo: '', descripcion: '', horario: '', hito: '' },
    ])
  }

  function updateDay(index: number, patch: Partial<DiaItinerario>) {
    onItinerarioChange(itinerarioDias.map((dia, i) => i === index ? { ...dia, ...patch } : dia))
  }

  function removeDay(index: number) {
    onItinerarioChange(renumberDays(itinerarioDias.filter((_, i) => i !== index)))
  }

  function moveDay(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= itinerarioDias.length) return
    const next = [...itinerarioDias]
    ;[next[index], next[target]] = [next[target], next[index]]
    onItinerarioChange(renumberDays(next))
  }

  function addPoint() {
    onPuntosInteresChange([
      ...puntosInteres,
      { nombre: '', descripcion: '', ubicacion: '', distancia: '', duracion: '', dificultad: '', fuente: '' },
    ])
  }

  function updatePoint(index: number, patch: Partial<PuntoInteres>) {
    onPuntosInteresChange(puntosInteres.map((punto, i) => i === index ? { ...punto, ...patch } : punto))
  }

  function removePoint(index: number) {
    onPuntosInteresChange(puntosInteres.filter((_, i) => i !== index))
  }

  return (
    <>
      <section className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Itinerario del viaje</h2>
            <p className="text-xs mt-1" style={{ color: '#4A6B4A' }}>Pegá el itinerario como lo tengas. La IA separará los días para que después puedas revisarlos.</p>
          </div>
          <button type="button" onClick={addDay} disabled={disabled} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ backgroundColor: 'rgba(52,209,126,.1)', border: '1px solid rgba(52,209,126,.25)', color: '#34D17E' }}>
            <Plus className="w-3.5 h-3.5" /> Agregar día
          </button>
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

        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1" style={{ backgroundColor: '#1E2D1E' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#4A6B4A' }}>Revisar o completar manualmente</span>
          <div className="h-px flex-1" style={{ backgroundColor: '#1E2D1E' }} />
        </div>

        {itinerarioDias.length === 0 && (
          <div className="rounded-lg px-4 py-5 text-sm text-center" style={{ backgroundColor: '#0A0F0A', border: '1px dashed #1E2D1E', color: '#4A6B4A' }}>
            Todavía no hay días estructurados.
          </div>
        )}

        {itinerarioDias.map((dia, index) => (
          <div key={`${dia.numero}-${index}`} className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E' }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-wider" style={{ color: '#34D17E' }}>DÍA {index + 1}</span>
              <div className="flex items-center gap-1.5">
                <IconButton label="Mover día hacia arriba" disabled={disabled || index === 0} onClick={() => moveDay(index, -1)}><ArrowUp className="w-3.5 h-3.5" /></IconButton>
                <IconButton label="Mover día hacia abajo" disabled={disabled || index === itinerarioDias.length - 1} onClick={() => moveDay(index, 1)}><ArrowDown className="w-3.5 h-3.5" /></IconButton>
                <IconButton label="Eliminar día" disabled={disabled} onClick={() => removeDay(index)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
              <input value={dia.titulo} onChange={e => updateDay(index, { titulo: e.target.value })} disabled={disabled} placeholder="Actividad principal del día *" className={inputClass} style={inputStyle} />
              <input type="time" value={dia.horario ?? ''} onChange={e => updateDay(index, { horario: e.target.value })} disabled={disabled} className={inputClass} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <textarea value={dia.descripcion} onChange={e => updateDay(index, { descripcion: e.target.value })} disabled={disabled} rows={3} placeholder="Recorrido, actividades y detalles reales del día *" className={`${inputClass} resize-y`} style={inputStyle} />
            <input value={dia.hito ?? ''} onChange={e => updateDay(index, { hito: e.target.value })} disabled={disabled} placeholder="Hito o momento visual (opcional)" className={inputClass} style={inputStyle} />
          </div>
        ))}
      </section>

      <section className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Lugares que aparecen en esta experiencia</h2>
            <p className="text-xs mt-1" style={{ color: '#4A6B4A' }}>Senderos, miradores, lagunas u otros lugares que podrían aparecer en un carrusel de destino.</p>
          </div>
          <button type="button" onClick={addPoint} disabled={disabled} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ backgroundColor: 'rgba(52,209,126,.1)', border: '1px solid rgba(52,209,126,.25)', color: '#34D17E' }}>
            <Plus className="w-3.5 h-3.5" /> Agregar lugar
          </button>
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

        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1" style={{ backgroundColor: '#1E2D1E' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#4A6B4A' }}>Revisar o completar manualmente</span>
          <div className="h-px flex-1" style={{ backgroundColor: '#1E2D1E' }} />
        </div>

        {puntosInteres.length === 0 && (
          <div className="rounded-lg px-4 py-5 text-sm text-center" style={{ backgroundColor: '#0A0F0A', border: '1px dashed #1E2D1E', color: '#4A6B4A' }}>
            Todavía no hay puntos de interés cargados.
          </div>
        )}

        {puntosInteres.map((punto, index) => (
          <div key={index} className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider" style={{ color: '#34D17E' }}>LUGAR {index + 1}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: punto.fuente ? 'rgba(52,209,126,.1)' : 'rgba(245,158,11,.1)', color: punto.fuente ? '#34D17E' : '#F59E0B' }}>{punto.fuente ? 'Verificado' : 'Pendiente de verificar'}</span>
              </div>
              <IconButton label="Eliminar lugar" disabled={disabled} onClick={() => removePoint(index)}><Trash2 className="w-3.5 h-3.5" /></IconButton>
            </div>
            <input value={punto.nombre} onChange={e => updatePoint(index, { nombre: e.target.value })} disabled={disabled} placeholder="Nombre del lugar, sendero o mirador *" className={inputClass} style={inputStyle} />
            <textarea value={punto.descripcion} onChange={e => updatePoint(index, { descripcion: e.target.value })} disabled={disabled} rows={3} placeholder="Qué lo hace relevante o especial *" className={`${inputClass} resize-y`} style={inputStyle} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={punto.ubicacion ?? ''} onChange={e => updatePoint(index, { ubicacion: e.target.value })} disabled={disabled} placeholder="Ubicación del lugar o inicio técnico (no es punto de encuentro)" className={inputClass} style={inputStyle} />
              <input value={punto.dificultad ?? ''} onChange={e => updatePoint(index, { dificultad: e.target.value })} disabled={disabled} placeholder="Dificultad (opcional)" className={inputClass} style={inputStyle} />
              <input value={punto.distancia ?? ''} onChange={e => updatePoint(index, { distancia: e.target.value })} disabled={disabled} placeholder="Distancia (opcional)" className={inputClass} style={inputStyle} />
              <input value={punto.duracion ?? ''} onChange={e => updatePoint(index, { duracion: e.target.value })} disabled={disabled} placeholder="Duración (opcional)" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <input value={punto.fuente ?? ''} onChange={e => updatePoint(index, { fuente: e.target.value })} disabled={disabled} placeholder="¿De dónde sale esta información? URL, ficha técnica o documento" className={inputClass} style={inputStyle} />
              <p className="text-[11px] mt-1.5" style={{ color: '#4A6B4A' }}>Necesaria para usar este lugar como información verificada en un carrusel.</p>
            </div>
          </div>
        ))}

      </section>
    </>
  )
}
