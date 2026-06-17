'use client'

import { useState } from 'react'
import { Edit3, Check, X, Download, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { ContenidoGenerado } from '@/types'
import { VERTICAL_LABELS, VERTICAL_COLORS } from '@/lib/verticals'
import Badge from '@/components/ui/Badge'

interface ContenidoTableProps {
  contenido: ContenidoGenerado[]
  salidaId: string
  salidaNombre: string
  clientName: string
}

interface EditState {
  id: string
  field: 'titulo' | 'subtitulo' | 'cta' | 'bullets'
  value: string
}

export default function ContenidoTable({ contenido, salidaId, salidaNombre, clientName }: ContenidoTableProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [items, setItems] = useState(contenido)

  function startEdit(id: string, field: EditState['field'], currentValue: string) {
    setEditing({ id, field, value: currentValue })
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(editing.id)

    const supabase = createClient()
    const updates: Record<string, unknown> = {
      is_edited: true,
      updated_at: new Date().toISOString(),
    }

    if (editing.field === 'bullets') {
      updates.bullets = editing.value.split('\n').map(b => b.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
    } else {
      updates[editing.field] = editing.value
    }

    await supabase.from('contenido_generado').update(updates).eq('id', editing.id)

    setItems(prev => prev.map(item => {
      if (item.id !== editing.id) return item
      if (editing.field === 'bullets') {
        return { ...item, bullets: updates.bullets as string[], is_edited: true }
      }
      return { ...item, [editing.field]: editing.value, is_edited: true }
    }))

    setEditing(null)
    setSaving(null)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`/api/export?salidaId=${salidaId}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contenido_${salidaNombre.replace(/\s+/g, '_')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
    setExporting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#6B8F71' }}>
          {items.length} piezas de contenido · Hacé clic en cualquier celda para editar
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#34D17E'; e.currentTarget.style.color = '#34D17E' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D1E'; e.currentTarget.style.color = '#F0FFF4' }}
        >
          {exporting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E2D1E' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ backgroundColor: '#111A11', borderBottom: '1px solid #1E2D1E' }}>
                {['Vertical', 'Video Crudo', 'Mes', 'Título', 'Subtítulo', 'Bullets', 'CTA'].map(col => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const vertical = item.vertical as keyof typeof VERTICAL_LABELS
                const color = VERTICAL_COLORS[vertical] || '#34D17E'
                const isCurrentlyEditing = editing?.id === item.id
                const bulletsText = (item.bullets || []).map(b => `• ${b}`).join('\n')

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#111A11' : '#0A0F0A',
                      borderBottom: i < items.length - 1 ? '1px solid #1E2D1E' : 'none',
                    }}
                  >
                    {/* Vertical */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-2">
                        <Badge color={color}>
                          {VERTICAL_LABELS[vertical] || vertical}
                        </Badge>
                        {item.is_edited && (
                          <span className="text-xs" style={{ color: '#4A6B4A' }}>✓</span>
                        )}
                      </div>
                    </td>

                    {/* Video crudo */}
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs max-w-[120px]" style={{ color: '#6B8F71' }}>{item.video_crudo}</p>
                    </td>

                    {/* Mes */}
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs whitespace-nowrap" style={{ color: '#6B8F71' }}>{item.mes}</p>
                    </td>

                    {/* Título */}
                    <td className="px-4 py-3 align-top max-w-[200px]">
                      <EditableCell
                        value={item.titulo || ''}
                        isEditing={isCurrentlyEditing && editing?.field === 'titulo'}
                        editValue={editing?.field === 'titulo' && isCurrentlyEditing ? editing.value : ''}
                        isSaving={saving === item.id}
                        onEdit={() => startEdit(item.id, 'titulo', item.titulo || '')}
                        onSave={saveEdit}
                        onCancel={() => setEditing(null)}
                        onChange={val => setEditing(prev => prev ? { ...prev, value: val } : null)}
                        multiline={false}
                      />
                    </td>

                    {/* Subtítulo */}
                    <td className="px-4 py-3 align-top max-w-[220px]">
                      <EditableCell
                        value={item.subtitulo || ''}
                        isEditing={isCurrentlyEditing && editing?.field === 'subtitulo'}
                        editValue={editing?.field === 'subtitulo' && isCurrentlyEditing ? editing.value : ''}
                        isSaving={saving === item.id}
                        onEdit={() => startEdit(item.id, 'subtitulo', item.subtitulo || '')}
                        onSave={saveEdit}
                        onCancel={() => setEditing(null)}
                        onChange={val => setEditing(prev => prev ? { ...prev, value: val } : null)}
                        multiline={true}
                      />
                    </td>

                    {/* Bullets */}
                    <td className="px-4 py-3 align-top max-w-[220px]">
                      <EditableCell
                        value={bulletsText}
                        isEditing={isCurrentlyEditing && editing?.field === 'bullets'}
                        editValue={editing?.field === 'bullets' && isCurrentlyEditing ? editing.value : ''}
                        isSaving={saving === item.id}
                        onEdit={() => startEdit(item.id, 'bullets', bulletsText)}
                        onSave={saveEdit}
                        onCancel={() => setEditing(null)}
                        onChange={val => setEditing(prev => prev ? { ...prev, value: val } : null)}
                        multiline={true}
                      />
                    </td>

                    {/* CTA */}
                    <td className="px-4 py-3 align-top max-w-[180px]">
                      <EditableCell
                        value={item.cta || ''}
                        isEditing={isCurrentlyEditing && editing?.field === 'cta'}
                        editValue={editing?.field === 'cta' && isCurrentlyEditing ? editing.value : ''}
                        isSaving={saving === item.id}
                        onEdit={() => startEdit(item.id, 'cta', item.cta || '')}
                        onSave={saveEdit}
                        onCancel={() => setEditing(null)}
                        onChange={val => setEditing(prev => prev ? { ...prev, value: val } : null)}
                        multiline={false}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface EditableCellProps {
  value: string
  isEditing: boolean
  editValue: string
  isSaving: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onChange: (val: string) => void
  multiline: boolean
}

function EditableCell({ value, isEditing, editValue, isSaving, onEdit, onSave, onCancel, onChange, multiline }: EditableCellProps) {
  if (isEditing) {
    return (
      <div className="flex flex-col gap-1.5">
        {multiline ? (
          <textarea
            autoFocus
            value={editValue}
            onChange={e => onChange(e.target.value)}
            rows={4}
            className="w-full px-2 py-1.5 text-xs rounded focus:outline-none resize-y"
            style={{ backgroundColor: '#0A0F0A', border: '1px solid #34D17E', color: '#F0FFF4', minWidth: '160px' }}
            onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={e => onChange(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded focus:outline-none"
            style={{ backgroundColor: '#0A0F0A', border: '1px solid #34D17E', color: '#F0FFF4', minWidth: '140px' }}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
          />
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: 'rgba(52,209,126,0.15)', color: '#34D17E' }}
          >
            <Check className="w-3 h-3" />
            {isSaving ? '...' : 'OK'}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{ color: '#6B8F71' }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group relative cursor-pointer rounded p-1 -m-1 transition-colors"
      onClick={onEdit}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#162216' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: '#F0FFF4' }}>
        {value || <span style={{ color: '#4A6B4A' }}>—</span>}
      </p>
      <Edit3 className="absolute top-1 right-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#34D17E' }} />
    </div>
  )
}
