'use client'

import { useState } from 'react'
import { Plus, Save, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { KnowledgeBase, Niche, Vertical } from '@/types'
import { VERTICAL_LABELS } from '@/lib/verticals'
import Button from '@/components/ui/Button'

interface KnowledgeBaseFormProps {
  items: KnowledgeBase[]
}

const NICHE_OPTIONS = [
  { value: 'trekking', label: 'Trekking' },
  { value: 'running', label: 'Trail Running' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'turismo_aventura', label: 'Turismo Aventura' },
]

const VERTICAL_OPTIONS = Object.entries(VERTICAL_LABELS).map(([value, label]) => ({ value, label }))

interface FormState {
  niche: Niche
  vertical: Vertical
  titulo: string
  contenido: string
  tags: string
}

const defaultForm: FormState = {
  niche: 'trekking',
  vertical: 'conversion',
  titulo: '',
  contenido: '',
  tags: '',
}

const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
const inputStyle = { backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }

export default function KnowledgeBaseForm({ items: initialItems }: KnowledgeBaseFormProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterNiche, setFilterNiche] = useState<string>('all')
  const [filterVertical, setFilterVertical] = useState<string>('all')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--cardon)'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--linea)'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

    const { data, error: insertError } = await supabase
      .from('knowledge_base')
      .insert({
        niche: form.niche,
        vertical: form.vertical,
        titulo: form.titulo,
        contenido: form.contenido,
        tags: tags.length > 0 ? tags : null,
        activo: true,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    if (data) setItems(prev => [data as KnowledgeBase, ...prev])
    setForm(defaultForm)
    setShowForm(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Â¿Eliminar este ejemplo?')) return
    const supabase = createClient()
    await supabase.from('knowledge_base').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleToggle(id: string, activo: boolean) {
    const supabase = createClient()
    await supabase.from('knowledge_base').update({ activo: !activo }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, activo: !activo } : i))
  }

  const filtered = items.filter(item => {
    if (filterNiche !== 'all' && item.niche !== filterNiche) return false
    if (filterVertical !== 'all' && item.vertical !== filterVertical) return false
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <select
            value={filterNiche}
            onChange={e => setFilterNiche(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ ...inputStyle, width: 'auto' }}
            onFocus={focusStyle} onBlur={blurStyle}
          >
            <option value="all">Todos los nichos</option>
            {NICHE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filterVertical}
            onChange={e => setFilterVertical(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ ...inputStyle, width: 'auto' }}
            onFocus={focusStyle} onBlur={blurStyle}
          >
            <option value="all">Todas las verticales</option>
            {VERTICAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="md">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Agregar ejemplo'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--cardon)' }}>
          <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--tinta)' }}>Nuevo ejemplo de contenido</h3>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68,0.1)', border: '1px solid rgba(239, 68, 68,0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Nicho</label>
                <select name="niche" value={form.niche} onChange={handleChange}
                  className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                  {NICHE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Vertical</label>
                <select name="vertical" value={form.vertical} onChange={handleChange}
                  className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                  {VERTICAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>TÃ­tulo del ejemplo</label>
              <input name="titulo" value={form.titulo} onChange={handleChange} required
                placeholder="Ej: Post de conversiÃ³n para trekking en Patagonia"
                className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Contenido de ejemplo</label>
              <p className="text-xs" style={{ color: 'var(--piedra)' }}>PegÃ¡ aquÃ­ el copy que funcionÃ³ bien. La IA lo usarÃ¡ como referencia de estilo y tono.</p>
              <textarea name="contenido" value={form.contenido} onChange={handleChange} required rows={6}
                placeholder="PegÃ¡ el contenido de ejemplo aquÃ­..."
                className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Tags (opcional)</label>
              <input name="tags" value={form.tags} onChange={handleChange}
                placeholder="montaÃ±a, patagonia, verano (separados por coma)"
                className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--piedra)' }}
              >
                Cancelar
              </button>
              <Button type="submit" loading={loading} size="md">
                <Save className="w-4 h-4" />
                Guardar ejemplo
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center" style={{ color: 'var(--piedra)' }}>
          <p className="text-sm">Sin ejemplos {filterNiche !== 'all' || filterVertical !== 'all' ? 'con los filtros aplicados' : 'todavÃ­a'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'var(--blanco-piedra)',
                border: `1px solid ${item.activo ? 'var(--linea)' : 'var(--piedra-clara)'}`,
                opacity: item.activo ? 1 : 0.5,
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--piedra-clara)', color: 'var(--piedra)' }}>
                    {NICHE_OPTIONS.find(o => o.value === item.niche)?.label || item.niche}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(62, 92, 72, 0.1)', color: 'var(--cardon)' }}>
                    {VERTICAL_LABELS[item.vertical as Vertical] || item.vertical}
                  </span>
                  {item.tags?.map(tag => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--piedra-clara)', color: 'var(--piedra)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(item.id, item.activo)}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      backgroundColor: item.activo ? 'rgba(62, 92, 72, 0.1)' : 'var(--piedra-clara)',
                      color: item.activo ? 'var(--cardon)' : 'var(--piedra)',
                    }}
                  >
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                    style={{ color: 'var(--piedra)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--piedra)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--tinta)' }}>{item.titulo}</p>
              <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--piedra)' }}>{item.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
