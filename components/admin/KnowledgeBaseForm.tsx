'use client'

import { useState } from 'react'
import { Plus, Save, X, Trash2, AlertCircle, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { KnowledgeBase, Niche, Vertical } from '@/types'
import { VERTICAL_LABELS } from '@/lib/verticals'

interface KnowledgeBaseFormProps {
  items: KnowledgeBase[]
}

const NICHE_OPTIONS = [
  { value: 'trekking', label: 'Trekking' },
  { value: 'running', label: 'Trail Running' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'turismo_aventura', label: 'Turismo Aventura' },
]

const VERTICAL_OPTIONS = Object.entries(VERTICAL_LABELS).map(([value, label]) => ({
  value,
  label,
}))

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

export default function KnowledgeBaseForm({ items: initialItems }: KnowledgeBaseFormProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterNiche, setFilterNiche] = useState<string>('all')
  const [filterVertical, setFilterVertical] = useState<string>('all')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const tags = form.tags
      ? form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : []

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

    if (data) setItems((prev) => [data as KnowledgeBase, ...prev])
    setForm(defaultForm)
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este ejemplo?')) return
    const supabase = createClient()
    await supabase.from('knowledge_base').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    router.refresh()
  }

  async function handleToggle(id: string, activo: boolean) {
    const supabase = createClient()
    await supabase.from('knowledge_base').update({ activo: !activo }).eq('id', id)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, activo: !activo } : i)))
    router.refresh()
  }

  const filtered = items.filter((item) => {
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
            onChange={(e) => setFilterNiche(e.target.value)}
            className="bg-white border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] transition-all cursor-pointer shadow-xs"
          >
            <option value="all">Todos los nichos</option>
            {NICHE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={filterVertical}
            onChange={(e) => setFilterVertical(e.target.value)}
            className="bg-white border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] transition-all cursor-pointer shadow-xs"
          >
            <option value="all">Todas las verticales</option>
            {VERTICAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] transition-all shadow-xs cursor-pointer"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? 'Cancelar' : 'Agregar ejemplo'}</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-6 shadow-[var(--sombra-reposo)]">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--linea)] mb-4">
            <h3 className="font-display font-bold text-base text-[var(--tinta)] tracking-[-0.02em] m-0">
              Nuevo ejemplo de contenido
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 rounded-lg text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium mb-4"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  Nicho
                </label>
                <select
                  name="niche"
                  value={form.niche}
                  onChange={handleChange}
                  className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
                >
                  {NICHE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  Vertical
                </label>
                <select
                  name="vertical"
                  value={form.vertical}
                  onChange={handleChange}
                  className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
                >
                  {VERTICAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Título del ejemplo
              </label>
              <input
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                required
                placeholder="Ej: Post de conversión para trekking en Patagonia"
                className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Contenido de ejemplo
              </label>
              <p className="text-xs text-[var(--piedra)]">
                Pegá aquí el copy que funcionó bien. La IA lo usará como referencia de estilo y tono.
              </p>
              <textarea
                name="contenido"
                value={form.contenido}
                onChange={handleChange}
                required
                rows={6}
                placeholder="Pegá el contenido de ejemplo aquí..."
                className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all resize-y min-h-[120px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Tags <span className="text-[10px] normal-case font-normal">(opcional)</span>
              </label>
              <input
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="montaña, patagonia, verano (separados por coma)"
                className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--linea)]">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--blanco-piedra)] border border-[var(--linea)] text-[var(--piedra)] hover:text-[var(--tinta)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Guardando…' : 'Guardar ejemplo'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      {filtered.length === 0 ? (
        <div className="surface-card bg-white rounded-2xl border-dashed border-2 border-[var(--piedra-clara)] p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--blanco-piedra)] flex items-center justify-center text-[var(--piedra)] mb-3">
            <Bookmark className="w-6 h-6 stroke-1 text-[var(--cardon)]" />
          </div>
          <p className="text-sm font-bold font-display text-[var(--tinta)]">
            Sin ejemplos {filterNiche !== 'all' || filterVertical !== 'all' ? 'con los filtros aplicados' : 'todavía'}
          </p>
          <p className="text-xs text-[var(--piedra)] mt-1 max-w-sm">
            Agregá ejemplos manuales con el botón superior para enseñarle a la IA cómo escribir para cada nicho.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className={`surface-card bg-white rounded-2xl p-5 border shadow-[var(--sombra-reposo)] transition-all hover:shadow-[var(--sombra-alta)] flex flex-col gap-3 ${
                item.activo ? 'border-[var(--linea)]' : 'border-[var(--piedra-clara)] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[var(--blanco-piedra)] text-[var(--piedra)] border border-[var(--linea)]">
                    {NICHE_OPTIONS.find((o) => o.value === item.niche)?.label || item.niche}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[var(--cardon-tenue)] text-[var(--cardon)] border border-[var(--cardon)]/40">
                    {VERTICAL_LABELS[item.vertical as Vertical] || item.vertical}
                  </span>
                  {item.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--blanco-piedra)]/60 text-[var(--piedra)] border border-[var(--linea)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id, item.activo)}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      item.activo
                        ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border border-[var(--cardon)]/40 shadow-xs'
                        : 'bg-[var(--blanco-piedra)] text-[var(--piedra)] border border-[var(--linea)]'
                    }`}
                  >
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-[var(--piedra)] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar ejemplo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold font-display text-[var(--tinta)] tracking-[-0.02em] m-0">
                  {item.titulo}
                </h4>
                <p className="text-xs leading-relaxed text-[var(--tinta)]/90 mt-1.5 whitespace-pre-wrap">
                  {item.contenido}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

