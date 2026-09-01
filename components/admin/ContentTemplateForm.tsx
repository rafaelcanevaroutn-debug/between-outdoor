'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, AlertCircle } from 'lucide-react'
import type { ContentTemplateType } from '@/types'

const TYPES: ContentTemplateType[] = ['video', 'carrusel', 'banner', 'flyer']

export default function ContentTemplateForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<ContentTemplateType>('carrusel')
  const [generatorKey, setGeneratorKey] = useState('')
  const [verticals, setVerticals] = useState('')
  const [families, setFamilies] = useState('')
  const [rotationWeight, setRotationWeight] = useState('1')
  const [repeatGuardWindow, setRepeatGuardWindow] = useState('0')
  const [isMainDefault, setIsMainDefault] = useState(false)

  function reset() {
    setName('')
    setGeneratorKey('')
    setVerticals('')
    setFamilies('')
    setRotationWeight('1')
    setRepeatGuardWindow('0')
    setIsMainDefault(false)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/content-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          generator_key: generatorKey,
          verticals: verticals
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          families: families
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
          rotation_weight: Number(rotationWeight) || 1,
          repeat_guard_window: Number(repeatGuardWindow) || 0,
          is_main_default: isMainDefault,
        }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo crear el template')
      reset()
      setOpen(false)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el template')
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] shadow-xs cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo template</span>
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-6 shadow-[var(--sombra-reposo)] max-w-lg flex flex-col gap-4"
    >
      <div className="flex justify-between items-center pb-2 border-b border-[var(--linea)]">
        <h3 className="font-display font-bold text-[16px] text-[var(--tinta)] tracking-[-0.02em] m-0">
          Nuevo template
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded-lg text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">Nombre</span>
        <input
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">Tipo</span>
        <select
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
          value={type}
          onChange={(e) => setType(e.target.value as ContentTemplateType)}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">generator_key</span>
        <input
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] font-mono placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
          value={generatorKey}
          onChange={(e) => setGeneratorKey(e.target.value)}
          placeholder={
            type === 'carrusel'
              ? 'carrusel_itinerario'
              : type === 'video'
              ? 'video_familia_3_3a'
              : 'banner_molde_3'
          }
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
          Verticales (separadas por coma)
        </span>
        <input
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
          value={verticals}
          onChange={(e) => setVerticals(e.target.value)}
          placeholder="trekking_grupal, aventura_premium"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
          Familias (separadas por coma)
        </span>
        <input
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
          value={families}
          onChange={(e) => setFamilies(e.target.value)}
          placeholder="itinerario, ficha"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
            Peso de rotación
          </span>
          <input
            className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
            type="number"
            min="0"
            step="0.5"
            value={rotationWeight}
            onChange={(e) => setRotationWeight(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
            Repeat guard (semanas)
          </span>
          <input
            className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
            type="number"
            min="0"
            value={repeatGuardWindow}
            onChange={(e) => setRepeatGuardWindow(e.target.value)}
          />
        </label>
      </div>

      <label className="flex items-center gap-2.5 text-xs text-[var(--tinta)] font-medium cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={isMainDefault}
          onChange={(e) => setIsMainDefault(e.target.checked)}
          className="rounded border-[var(--linea)] text-[var(--cardon)] focus:ring-[var(--cardon)] w-4 h-4 cursor-pointer"
        />
        <span>Es el fallback main default de este tipo</span>
      </label>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-wait mt-2"
      >
        <span>{pending ? 'Creando…' : 'Crear template'}</span>
      </button>
    </form>
  )
}

