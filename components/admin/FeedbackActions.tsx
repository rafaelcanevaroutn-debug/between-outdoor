'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedbackStatus } from '@/types'

const STATUS_ACTIONS: Array<{ status: FeedbackStatus; label: string; color: string }> = [
  { status: 'open', label: 'Reabrir', color: '#fbbf24' },
  { status: 'in_progress', label: 'En curso', color: '#60a5fa' },
  { status: 'done', label: 'Resolver', color: '#34D17E' },
]

export default function FeedbackActions({ id, currentStatus }: { id: string; currentStatus: FeedbackStatus }) {
  const router = useRouter()
  const [pending, setPending] = useState<FeedbackStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changeStatus(status: FeedbackStatus) {
    setPending(status)
    setError(null)
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo actualizar')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la nota')
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
              padding: '6px 9px',
              fontSize: 10,
              fontWeight: 700,
              cursor: pending ? 'wait' : 'pointer',
              opacity: pending !== null && pending !== action.status ? 0.45 : 1,
            }}
          >
            {pending === action.status ? 'Guardando…' : action.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" style={{ color: '#fb7185', fontSize: 11, margin: '8px 0 0' }}>{error}</p>}
    </div>
  )
}
