'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const NICHES = [
  { value: 'trekking', label: 'Trekking' },
  { value: 'running', label: 'Running' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'turismo_aventura', label: 'Turismo Aventura' },
]

export default function NuevoClienteForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    company_name: '',
    niche: 'trekking',
    password: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear cliente')

      setOpen(false)
      setForm({ email: '', full_name: '', company_name: '', niche: 'trekking', password: '' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.08)',
    background: '#0A100B',
    color: '#EAF2EC',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#7E9286',
    marginBottom: 5,
    letterSpacing: '.02em',
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 16px',
          borderRadius: 10,
          border: 'none',
          background: 'var(--cardon)',
          color: '#04130A',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Nuevo cliente
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        style={{
          background: '#0D130E',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 18,
          padding: 28,
          width: '100%',
          maxWidth: 440,
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#EAF2EC', margin: '0 0 20px', letterSpacing: '-.02em' }}>
          Nuevo cliente
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="cliente@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Nombre completo *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Marcelo GarcÃ­a"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Marca / empresa</label>
            <input
              type="text"
              value={form.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Running Patagonia (opcional)"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Nicho *</label>
            <select
              required
              value={form.niche}
              onChange={e => set('niche', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {NICHES.map(n => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>ContraseÃ±a inicial *</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="MÃ­nimo 8 caracteres"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,.08)',
                background: 'transparent',
                color: '#7E9286',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: '9px 0',
                borderRadius: 10,
                border: 'none',
                background: loading ? '#1a3322' : 'var(--cardon)',
                color: loading ? '#3A5040' : '#04130A',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

