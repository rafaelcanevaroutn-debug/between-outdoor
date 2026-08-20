'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { CreativeTemplateStatus } from '@/lib/creative-lab/template-contract'

const ACTIONS: Array<{ status: CreativeTemplateStatus; label: string; color: string }> = [
  { status: 'approved', label: 'Aprobar', color: '#34D17E' },
  { status: 'rejected', label: 'Rechazar', color: '#fb7185' },
  { status: 'experimental', label: 'Devolver a prueba', color: '#fbbf24' },
  { status: 'archived', label: 'Archivar', color: '#94a3b8' },
]

export default function CreativeTemplateActions({ id, currentStatus, approvalEnabled = true }: { id: string; currentStatus: CreativeTemplateStatus; approvalEnabled?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState<CreativeTemplateStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changeStatus(status: CreativeTemplateStatus) {
    setPending(status)
    setError(null)
    try {
      const response = await fetch(`/api/admin/creative-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json() as { error?: string; details?: string[] }
      if (!response.ok) throw new Error([result.error, ...(result.details ?? [])].filter(Boolean).join(': '))
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el molde')
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {ACTIONS.filter(action => action.status !== currentStatus).map(action => {
          const disabled = pending !== null || (action.status === 'approved' && !approvalEnabled)
          return (
          <button
            key={action.status}
            type="button"
            disabled={disabled}
            onClick={() => changeStatus(action.status)}
            style={{
              border: `1px solid ${action.color}55`,
              background: `${action.color}12`,
              color: action.color,
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: pending ? 'wait' : disabled ? 'not-allowed' : 'pointer',
              opacity: disabled && pending !== action.status ? 0.45 : 1,
            }}
          >
            {pending === action.status ? 'Guardando…' : action.label}
          </button>
        )})}
      </div>
      {!approvalEnabled && currentStatus !== 'approved' && <p style={{ color: '#fbbf24', fontSize: 10, margin: '8px 0 0' }}>Aprobación bloqueada hasta superar la prueba extrema.</p>}
      {error && <p role="alert" style={{ color: '#fb7185', fontSize: 11, margin: '8px 0 0' }}>{error}</p>}
    </div>
  )
}
