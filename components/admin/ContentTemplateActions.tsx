'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentTemplateStatus } from '@/types'

const STATUS_ACTIONS: Array<{ status: ContentTemplateStatus; label: string; color: string }> = [
  { status: 'borrador', label: 'Volver a borrador', color: '#fbbf24' },
  { status: 'aprobada', label: 'Aprobar', color: '#34D17E' },
  { status: 'productiva', label: 'Poner en producción', color: '#60a5fa' },
]

export default function ContentTemplateActions({ id, currentStatus }: { id: string; currentStatus: ContentTemplateStatus }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changeStatus(status: ContentTemplateStatus) {
    setPending(status)
    setError(null)
    try {
      const response = await fetch(`/api/admin/content-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo actualizar')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el template')
    } finally {
      setPending(null)
    }
  }

  async function deleteTemplate() {
    if (!confirm('¿Borrar este template en borrador? No se puede deshacer.')) return
    setPending('delete')
    setError(null)
    try {
      const response = await fetch(`/api/admin/content-templates/${id}`, { method: 'DELETE' })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo borrar')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo borrar el template')
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {STATUS_ACTIONS.filter(action => action.status !== currentStatus).map(action => (
          <button
            key={action.status}
            type="button"
            disabled={pending !== null}
            onClick={() => changeStatus(action.status)}
            style={{
              border: `1px solid ${action.color}55`,
              background: `${action.color}12`,
              color: action.color,
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: pending ? 'wait' : 'pointer',
              opacity: pending !== null && pending !== action.status ? 0.45 : 1,
            }}
          >
            {pending === action.status ? 'Guardando…' : action.label}
          </button>
        ))}
        {currentStatus === 'borrador' && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={deleteTemplate}
            style={{
              border: '1px solid #fb718555',
              background: '#fb718512',
              color: '#fb7185',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: pending ? 'wait' : 'pointer',
              opacity: pending !== null && pending !== 'delete' ? 0.45 : 1,
            }}
          >
            {pending === 'delete' ? 'Borrando…' : 'Borrar'}
          </button>
        )}
      </div>
      {error && <p role="alert" style={{ color: '#fb7185', fontSize: 11, margin: '8px 0 0' }}>{error}</p>}
    </div>
  )
}
