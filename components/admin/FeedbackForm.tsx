'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, AlertCircle } from 'lucide-react'
import type { FeedbackScope, FeedbackSeverity } from '@/types'

const SCOPES: Array<{ value: FeedbackScope; label: string; field: string; placeholder: string }> = [
  { value: 'pieza', label: 'Pieza', field: 'piece_id', placeholder: 'UUID de contenido_generado' },
  { value: 'familia', label: 'Familia', field: 'family_key', placeholder: 'ej. carrusel_itinerario' },
  { value: 'motor', label: 'Motor', field: 'generator_key', placeholder: 'ej. video_familia_3_3a' },
  { value: 'run', label: 'Corrida', field: 'run_id', placeholder: 'UUID de calendar_batch_runs' },
]

const SEVERITIES: FeedbackSeverity[] = ['low', 'medium', 'high', 'block']

export default function FeedbackForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<FeedbackScope>('motor')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium')

  const scopeConfig = SCOPES.find((s) => s.value === scope)!

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, [scopeConfig.field]: reference, note, severity }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo crear la nota')
      setReference('')
      setNote('')
      setOpen(false)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la nota')
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
          <span>Nueva nota</span>
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
          Nueva nota de feedback
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
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">Alcance</span>
        <select
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
          value={scope}
          onChange={(e) => setScope(e.target.value as FeedbackScope)}
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
          {scopeConfig.field}
        </span>
        <input
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] font-mono placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={scopeConfig.placeholder}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">Severidad</span>
        <select
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">Nota</span>
        <textarea
          className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all min-h-[90px] resize-y"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describí el problema o ajuste necesario..."
          required
        />
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
        <span>{pending ? 'Guardando…' : 'Guardar nota'}</span>
      </button>
    </form>
  )
}

