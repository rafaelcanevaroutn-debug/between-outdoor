'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, RotateCcw, AlertCircle } from 'lucide-react'
import type { FeedbackStatus } from '@/types'

interface ActionConfig {
  status: FeedbackStatus
  label: string
  icon: typeof CheckCircle2
  className: string
}

const STATUS_ACTIONS: ActionConfig[] = [
  {
    status: 'open',
    label: 'Reabrir',
    icon: RotateCcw,
    className:
      'bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200 shadow-xs',
  },
  {
    status: 'in_progress',
    label: 'En curso',
    icon: Clock,
    className:
      'bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200 shadow-xs',
  },
  {
    status: 'done',
    label: 'Resolver',
    icon: CheckCircle2,
    className:
      'bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] border border-[var(--cardon)] shadow-xs',
  },
]

export default function FeedbackActions({
  id,
  currentStatus,
}: {
  id: string
  currentStatus: FeedbackStatus
}) {
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
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo actualizar')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la nota')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_ACTIONS.filter((action) => action.status !== currentStatus).map((action) => {
          const Icon = action.icon
          const isPending = pending === action.status
          const disabled = pending !== null

          return (
            <button
              key={action.status}
              type="button"
              disabled={disabled}
              onClick={() => changeStatus(action.status)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                action.className
              } ${disabled && !isPending ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
                isPending ? 'cursor-wait opacity-80' : ''
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{isPending ? 'Guardando…' : action.label}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium mt-1"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

