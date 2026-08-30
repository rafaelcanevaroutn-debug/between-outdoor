'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentTemplateType } from '@/types'

const TYPES: ContentTemplateType[] = ['video', 'carrusel', 'banner', 'flyer']

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
    setName(''); setGeneratorKey(''); setVerticals(''); setFamilies('')
    setRotationWeight('1'); setRepeatGuardWindow('0'); setIsMainDefault(false)
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
          verticals: verticals.split(',').map(v => v.trim()).filter(Boolean),
          families: families.split(',').map(v => v.trim()).filter(Boolean),
          rotation_weight: Number(rotationWeight) || 1,
          repeat_guard_window: Number(repeatGuardWindow) || 0,
          is_main_default: isMainDefault,
        }),
      })
      const result = await response.json() as { error?: string }
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ border: '1px solid rgba(52,209,126,.4)', background: 'rgba(52,209,126,.1)', color: '#34D17E', borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >
        + Nuevo template
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 18, display: 'grid', gap: 12, maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#EAF2EC', fontSize: 14, margin: 0 }}>Nuevo template</h3>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#7E9286', cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
      </div>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>Nombre</span>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>Tipo</span>
        <select style={inputStyle} value={type} onChange={e => setType(e.target.value as ContentTemplateType)}>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>generator_key</span>
        <input
          style={inputStyle}
          value={generatorKey}
          onChange={e => setGeneratorKey(e.target.value)}
          placeholder={type === 'carrusel' ? 'carrusel_itinerario' : type === 'video' ? 'video_familia_3_3a' : 'banner_molde_3'}
          required
        />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>Verticales (separadas por coma)</span>
        <input style={inputStyle} value={verticals} onChange={e => setVerticals(e.target.value)} placeholder="trekking_grupal, aventura_premium" />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        <span style={labelStyle}>Familias (separadas por coma)</span>
        <input style={inputStyle} value={families} onChange={e => setFamilies(e.target.value)} placeholder="itinerario, ficha" />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={labelStyle}>Peso de rotación</span>
          <input style={inputStyle} type="number" min="0" step="0.5" value={rotationWeight} onChange={e => setRotationWeight(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={labelStyle}>Repeat guard (semanas)</span>
          <input style={inputStyle} type="number" min="0" value={repeatGuardWindow} onChange={e => setRepeatGuardWindow(e.target.value)} />
        </label>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#C5D0C8' }}>
        <input type="checkbox" checked={isMainDefault} onChange={e => setIsMainDefault(e.target.checked)} />
        Es el fallback main default de este tipo
      </label>

      {error && <p role="alert" style={{ color: '#fb7185', fontSize: 11, margin: 0 }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{ border: '1px solid rgba(52,209,126,.4)', background: 'rgba(52,209,126,.15)', color: '#34D17E', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: pending ? 'wait' : 'pointer' }}
      >
        {pending ? 'Creando…' : 'Crear template'}
      </button>
    </form>
  )
}
