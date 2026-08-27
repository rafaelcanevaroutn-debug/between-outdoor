'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search, Users } from 'lucide-react'
import type { GrupoInfo, PuntoInteres } from '@/types'

interface GroupActivityFieldsProps {
  destino: string
  lugaresText: string
  grupoInfo: GrupoInfo
  puntosInteres: PuntoInteres[]
  onGrupoInfoChange: (value: GrupoInfo) => void
  onPuntosInteresChange: (value: PuntoInteres[]) => void
  disabled?: boolean
}

const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--nieve)] border border-[var(--linea)] text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:ring-1 focus:ring-[var(--cardon)] focus:border-[var(--cardon)] transition-colors shadow-sm'

function parsePlaces(value: string): string[] {
  return [...new Set(value.split(/[\n,]/u).map(item => item.trim()).filter(Boolean))]
}

export default function GroupActivityFields({
  destino,
  lugaresText,
  grupoInfo,
  puntosInteres,
  onGrupoInfoChange,
  onPuntosInteresChange,
  disabled = false,
}: GroupActivityFieldsProps) {
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState('')
  const attemptedKey = useRef('')
  const places = parsePlaces(lugaresText)
  const placesKey = places.join('|').toLocaleLowerCase('es-AR')

  const update = (field: keyof GrupoInfo, value: string) => {
    onGrupoInfoChange({ ...grupoInfo, [field]: value.trimStart() || null })
  }

  const researchPlaces = useCallback(async () => {
    if (places.length === 0 || researching || disabled) return
    setResearching(true)
    setError('')
    try {
      const response = await fetch('/api/salidas/verificar-lugares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destino, lugares: places, modo: 'recurrente' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudieron investigar los lugares')
      onPuntosInteresChange(result.data as PuntoInteres[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron investigar los lugares')
    } finally {
      setResearching(false)
    }
  // `placesKey` representa el valor semántico y evita búsquedas repetidas por identidad de array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino, placesKey, disabled, researching, onPuntosInteresChange])

  useEffect(() => {
    if (!placesKey || puntosInteres.length > 0 || attemptedKey.current === placesKey) return
    attemptedKey.current = placesKey
    void researchPlaces()
  }, [placesKey, puntosInteres.length, researchPlaces])

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-[var(--linea)] bg-[var(--nieve)] p-5">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cardon-tenue)] text-[var(--cardon)]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--tinta)]">Cómo funciona el grupo</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--piedra)]">Esta información alimenta contenido de presentación, comunidad, objeciones y conversión.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--tinta)] sm:col-span-2">
            Propuesta del grupo
            <textarea
              value={grupoInfo.propuesta ?? ''}
              onChange={event => update('propuesta', event.target.value)}
              rows={3}
              placeholder="Ej: Salimos a caminar en grupo por senderos cercanos de Tucumán durante la semana."
              className={`${inputClass} resize-y font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--tinta)]">
            ¿Para quién es?
            <textarea
              value={grupoInfo.dirigido_a ?? ''}
              onChange={event => update('dirigido_a', event.target.value)}
              rows={3}
              placeholder="Ej: Personas que quieren empezar o no tienen con quién salir."
              className={`${inputClass} resize-y font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--tinta)]">
            Dinámica habitual
            <textarea
              value={grupoInfo.dinamica ?? ''}
              onChange={event => update('dinamica', event.target.value)}
              rows={3}
              placeholder="Ej: Confirmamos lugar y dificultad en el grupo antes de cada salida."
              className={`${inputClass} resize-y font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--tinta)] sm:col-span-2">
            Guías, profes o responsables
            <input
              value={grupoInfo.responsables ?? ''}
              onChange={event => update('responsables', event.target.value)}
              placeholder="Ej: Renzo — guía y coordinador"
              className={`${inputClass} font-normal`}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--cardon)]/20 bg-[var(--cardon-tenue)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--tinta)]">Información verificada de los lugares</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--piedra)]">
              Between investiga exactamente {places.length === 1 ? places[0] : `${places.length} lugares`} y guarda únicamente datos respaldados por fuentes web.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              attemptedKey.current = placesKey
              void researchPlaces()
            }}
            disabled={disabled || researching || places.length === 0}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--cardon)] px-4 py-2.5 text-sm font-semibold text-[var(--nieve)] disabled:opacity-40"
          >
            {researching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {researching ? 'Buscando…' : puntosInteres.length ? 'Actualizar datos' : 'Buscar datos online'}
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        {puntosInteres.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {puntosInteres.map((point, index) => (
              <article key={`${point.nombre}-${index}`} className="rounded-xl border border-[var(--linea)] bg-[var(--nieve)] p-4">
                <h4 className="text-sm font-semibold text-[var(--tinta)]">{point.nombre}</h4>
                <p className="mt-2 text-xs leading-relaxed text-[var(--piedra)]">{point.descripcion}</p>
                {[point.ubicacion, point.distancia, point.duracion, point.dificultad].filter(Boolean).length > 0 && (
                  <p className="mt-3 text-xs font-medium text-[var(--cardon)]">
                    {[point.ubicacion, point.distancia, point.duracion, point.dificultad].filter(Boolean).join(' · ')}
                  </p>
                )}
                {point.fuente && <p className="mt-3 truncate text-[10px] text-[var(--piedra)]">Fuente verificada: {point.fuente}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
