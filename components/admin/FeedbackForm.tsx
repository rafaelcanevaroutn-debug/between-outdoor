'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedbackScope, FeedbackSeverity } from '@/types'

const SCOPES: Array<{ value: FeedbackScope; label: string; field: string; placeholder: string }> = [
  { value: 'pieza', label: 'Pieza', field: 'piece_id', placeholder: 'UUID de contenido_generado' },
  { value: 'familia', label: 'Familia', field: 'family_key', placeholder: 'ej. carrusel_itinerario' },
  { value: 'motor', label: 'Motor', field: 'generator_key', placeholder: 'ej. video_familia_3_3a' },
  { value: 'run', label: 'Corrida', field: 'run_id', placeholder: 'UUID de calendar_batch_runs' },
]

const SEVERITIES: FeedbackSeverity[] = ['low', 'medium', 'high', 'block']

const inputStyle: React.CSSProperties = {
  background: '#050805',
  border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 12,
  color: '#EAF2EC',
  width: '100%',
}
const labelStyle: React.CSSProperties = { color: '#7E9286', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }

export default function FeedbackForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<FeedbackScope>('motor')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium')

  const scopeConfig = SCOPES.find(s => s.value === scope)!

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
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo crear la nota')
      setReference(''); setNote(''); setOpen(false)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la nota')
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ border: '1px solid rgba(52,209,126,.4)', background: 'rgba(52,209,126,.1)', color: '#34D17E', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >
        + Nueva nota
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 18, display: 'grid', gap: 12, maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#EAF2EC', fontSize: 14, margin: 0 }}>Nueva nota</h3>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#7E9286', cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
      </div>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>Alcance</span>
        <select style={inputStyle} value={scope} onChange={e => setScope(e.target.value as FeedbackScope)}>
          {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>{scopeConfig.field}</span>
        <input style={inputStyle} value={reference} onChange={e => setReference(e.target.value)} placeholder={scopeConfig.placeholder} required />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>Severidad</span>
        <select style={inputStyle} value={severity} onChange={e => setSeverity(e.target.value as FeedbackSeverity)}>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>Nota</span>
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={note} onChange={e => setNote(e.target.value)} required />
      </label>

      {error && <p role="alert" style={{ color: '#fb7185', fontSize: 11, margin: 0 }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{ border: '1px solid rgba(52,209,126,.4)', background: 'rgba(52,209,126,.15)', color: '#34D17E', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: pending ? 'wait' : 'pointer' }}
      >
        {pending ? 'Guardando…' : 'Guardar nota'}
      </button>
    </form>
  )
}
