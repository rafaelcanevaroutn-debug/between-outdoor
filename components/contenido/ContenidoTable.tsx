'use client'

import { useState } from 'react'
import { Edit3, Check, X, Download, RefreshCw, Sheet, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { ContenidoGenerado } from '@/types'
import { VERTICAL_LABELS, VERTICAL_COLORS, SUBVERTICAL_LABELS } from '@/lib/verticals'
import { TEMA_LABELS } from '@/lib/generators/carrusel'
import Badge from '@/components/ui/Badge'

interface ContenidoTableProps {
  contenido: ContenidoGenerado[]
  salidaId: string
  salidaNombre: string
  clientName: string
  sheetsExportedAt: string | null
}

interface EditState {
  id: string
  field: 'titulo' | 'subtitulo' | 'cta' | 'bullets'
  value: string
}

export default function ContenidoTable({ contenido, salidaId, salidaNombre, clientName, sheetsExportedAt }: ContenidoTableProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingSheets, setExportingSheets] = useState(false)
  const [sheetsMsg, setSheetsMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [alreadyExported, setAlreadyExported] = useState(!!sheetsExportedAt)
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

  async function handleDeleteItem(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('contenido_generado').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
    setDeletingId(null)
  }

  async function handleClearAll() {
    if (!confirm(`¿Borrar las ${items.length} piezas de contenido de esta salida? Esta acción no se puede deshacer.`)) return
    setClearingAll(true)
    const supabase = createClient()
    await supabase.from('contenido_generado').delete().eq('salida_id', salidaId)
    router.push(`/salidas/${salidaId}`)
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

  async function handleExportSheets() {
    setExportingSheets(true)
    setSheetsMsg(null)
    try {
      const res = await fetch('/api/export-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setAlreadyExported(true)
      setSheetsMsg({ ok: true, text: `✓ ${data.written} piezas exportadas al Sheet` })
    } catch (err) {
      setSheetsMsg({ ok: false, text: err instanceof Error ? err.message : 'Error al exportar' })
    }
    setExportingSheets(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm" style={{ color: '#6B8F71' }}>
          {items.length} piezas de contenido · Hacé clic en cualquier celda para editar
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Limpiar todo */}
          <button
            onClick={handleClearAll}
            disabled={clearingAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71', cursor: clearingAll ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!clearingAll) { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' } }}
            onMouseLeave={e => { if (!clearingAll) { e.currentTarget.style.borderColor = '#1E2D1E'; e.currentTarget.style.color = '#6B8F71' } }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearingAll ? 'Borrando...' : 'Limpiar todo'}
          </button>

          {/* Exportar a Google Sheets */}
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleExportSheets}
              disabled={exportingSheets || alreadyExported}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#111A11',
                border: `1px solid ${alreadyExported ? '#1E2D1E' : '#1E2D1E'}`,
                color: alreadyExported ? '#3A5040' : '#F0FFF4',
                cursor: alreadyExported ? 'not-allowed' : 'pointer',
                opacity: alreadyExported ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!alreadyExported) { e.currentTarget.style.borderColor = '#34A853'; e.currentTarget.style.color = '#34A853' } }}
              onMouseLeave={e => { if (!alreadyExported) { e.currentTarget.style.borderColor = '#1E2D1E'; e.currentTarget.style.color = '#F0FFF4' } }}
            >
              {exportingSheets ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sheet className="w-4 h-4" />
              )}
              {exportingSheets ? 'Exportando...' : alreadyExported ? 'Exportado' : 'Exportar a Sheets'}
            </button>
            {sheetsMsg && (
              <p className="text-xs" style={{ color: sheetsMsg.ok ? '#34A853' : '#f87171' }}>
                {sheetsMsg.text}
              </p>
            )}
          </div>

          {/* Exportar CSV */}
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
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E2D1E' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr style={{ backgroundColor: '#111A11', borderBottom: '1px solid #1E2D1E' }}>
                {['Vertical', 'Formato', 'Subvertical', 'Carpeta', 'Mes', 'Título', 'Subtítulo', 'Bullets', 'CTA', ''].map(col => (
                  <th key={col} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>
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
                const formato = item.formato || '—'
                const isNewCarrusel = (item.formato === 'carrusel' || item.formato === 'carrusel_promo') && !!item.slides_data
                const subverticalLabel = item.slot_key && SUBVERTICAL_LABELS[item.slot_key as keyof typeof SUBVERTICAL_LABELS]
                  ? SUBVERTICAL_LABELS[item.slot_key as keyof typeof SUBVERTICAL_LABELS]
                  : '—'
                const carpeta = item.video_crudo || '—'

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#111A11' : '#0A0F0A',
                      borderBottom: i < items.length - 1 ? '1px solid #1E2D1E' : 'none',
                    }}
                  >
                    {/* Vertical */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-start gap-1.5">
                        <Badge color={color}>
                          {item.formato === 'carrusel_promo'
                            ? (item.tema?.replace('promo_', '') ?? 'promo')
                            : (VERTICAL_LABELS[vertical] || vertical)}
                        </Badge>
                        {item.is_edited && (
                          <span className="text-xs" style={{ color: '#4A6B4A' }}>✓</span>
                        )}
                      </div>
                    </td>

                    {/* Formato */}
                    <td className="px-3 py-3 align-top">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: '#162216', color: '#6B8F71', border: '1px solid #1E2D1E' }}
                      >
                        {formato}
                      </span>
                    </td>

                    {/* Subvertical */}
                    <td className="px-3 py-3 align-top">
                      <p className="text-xs max-w-[110px]" style={{ color: subverticalLabel !== '—' ? '#A3D4AE' : '#4A6B4A' }}>
                        {subverticalLabel}
                      </p>
                    </td>

                    {/* Carpeta */}
                    <td className="px-3 py-3 align-top">
                      <p className="text-xs max-w-[90px]" style={{ color: '#6B8F71' }}>{carpeta}</p>
                    </td>

                    {/* Mes */}
                    <td className="px-3 py-3 align-top">
                      <p className="text-xs whitespace-nowrap" style={{ color: '#6B8F71' }}>{item.mes}</p>
                    </td>

                    {/* Título / Ángulo */}
                    <td className="px-3 py-3 align-top max-w-[200px]">
                      {isNewCarrusel ? (
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: '#34D17E' }}>
                            {item.tema ? (TEMA_LABELS[item.tema as keyof typeof TEMA_LABELS] ?? item.tema) : '—'}
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#C8DDD0' }}>{item.angulo || '—'}</p>
                        </div>
                      ) : (
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
                      )}
                    </td>

                    {/* Subtítulo / Estructura */}
                    <td className="px-3 py-3 align-top max-w-[220px]">
                      {isNewCarrusel ? (
                        <p className="text-xs" style={{ color: '#6B8F71' }}>
                          {item.estructura_narrativa?.replace(/_/g, ' ') ?? '—'}
                        </p>
                      ) : (
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
                      )}
                    </td>

                    {/* Bullets / Slides */}
                    <td className="px-3 py-3 align-top max-w-[280px]">
                      {isNewCarrusel && item.slides_data ? (
                        <div className="flex flex-col gap-2">
                          {(item.slides_data as Array<{ n_slide: number; rol: string; texto_principal: string; texto_apoyo: string | null }>).map(s => (
                            <div key={s.n_slide} className="flex gap-2">
                              <span className="text-xs shrink-0 mt-0.5 w-14" style={{ color: '#3A5040' }}>
                                {s.n_slide}. {s.rol}
                              </span>
                              <div>
                                <p className="text-xs font-medium leading-tight" style={{ color: '#F0FFF4' }}>{s.texto_principal}</p>
                                {s.texto_apoyo && (
                                  <p className="text-xs mt-0.5 leading-tight" style={{ color: '#6B8F71' }}>{s.texto_apoyo}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
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
                      )}
                    </td>

                    {/* CTA / cta_comentario */}
                    <td className="px-3 py-3 align-top max-w-[180px]">
                      {isNewCarrusel ? (
                        <p className="text-xs" style={{ color: '#6B8F71' }}>{item.cta_comentario || '—'}</p>
                      ) : (
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
                      )}
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-3 align-top">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={deletingId === item.id}
                        className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                        style={{ color: '#3A5040', cursor: deletingId === item.id ? 'not-allowed' : 'pointer' }}
                        onMouseEnter={e => { if (deletingId !== item.id) e.currentTarget.style.color = '#f87171' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#3A5040' }}
                        title="Borrar pieza"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
