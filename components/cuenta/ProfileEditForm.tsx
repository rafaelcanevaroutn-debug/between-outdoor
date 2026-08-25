'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check } from 'lucide-react'

interface Props {
  fullName:    string | null
  companyName: string | null
}

export default function ProfileEditForm({ fullName, companyName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState(fullName    ?? '')
  const [company, setCompany] = useState(companyName ?? '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, company_name: company }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al guardar')
      }
      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName(fullName ?? '')
    setCompany(companyName ?? '')
    setError(null)
    setEditing(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 9,
    border: '1px solid var(--linea)', background: 'var(--nieve)',
    color: 'var(--tinta)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          background: 'var(--nieve)', border: '1px solid var(--linea)',
          color: 'var(--piedra)', fontSize: 12, fontWeight: 500,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cardon)'; e.currentTarget.style.color = 'var(--tinta)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--linea)'; e.currentTarget.style.color = 'var(--piedra)' }}
      >
        <Pencil size={12} />
        Editar perfil
      </button>
    )
  }

  return (
    <div style={{
      padding: '16px 20px', borderRadius: 12, marginTop: 12,
      background: 'var(--nieve)', border: '1px solid var(--linea)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--piedra)', display: 'block', marginBottom: 5 }}>
            Nombre completo
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tu nombre y apellido"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--piedra)', display: 'block', marginBottom: 5 }}>
            Marca / Empresa
          </label>
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Nombre de tu marca o emprendimiento"
            style={inputStyle}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: 'red', margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? 'var(--cardon-tenue)' : 'var(--cardon)',
              color: saving ? 'var(--cardon)' : 'var(--nieve)',
              fontSize: 13, fontWeight: 600, border: 'none',
            }}
          >
            <Check size={13} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--linea)',
              color: 'var(--piedra)', fontSize: 13, fontWeight: 500,
            }}
          >
            <X size={13} />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
