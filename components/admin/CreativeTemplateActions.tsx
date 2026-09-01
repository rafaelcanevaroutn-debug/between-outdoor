'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, X, RotateCcw, Archive } from 'lucide-react'

import type { CreativeTemplateStatus } from '@/lib/creative-lab/template-contract'

interface ActionConfig {
  status: CreativeTemplateStatus
  label: string
  icon: typeof Check
  className: string
}

const ACTION_CONFIGS: ActionConfig[] = [
  {
    status: 'approved',
    label: 'Aprobar',
    icon: Check,
    className:
      'bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] border border-[var(--cardon)] shadow-xs',
  },
  {
    status: 'rejected',
    label: 'Rechazar',
    icon: X,
    className:
      'bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200 shadow-xs',
  },
  {
    status: 'experimental',
    label: 'Devolver a prueba',
    icon: RotateCcw,
    className:
      'bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200 shadow-xs',
  },
  {
    status: 'archived',
    label: 'Archivar',
    icon: Archive,
    className:
      'bg-[var(--blanco-piedra)] text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--piedra-clara)]/50 border border-[var(--linea)] shadow-xs',
  },
]

export default function CreativeTemplateActions({
  id,
  currentStatus,
  approvalEnabled = true,
}: {
  id: string
  currentStatus: CreativeTemplateStatus
  approvalEnabled?: boolean
}) {
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
      const result = (await response.json()) as { error?: string; details?: string[] }
      if (!response.ok)
        throw new Error([result.error, ...(result.details ?? [])].filter(Boolean).join(': '))
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el molde')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {ACTION_CONFIGS.filter((action) => action.status !== currentStatus).map((action) => {
          const Icon = action.icon
          const disabled = pending !== null || (action.status === 'approved' && !approvalEnabled)
          const isCurrentPending = pending === action.status

          return (
            <button
              key={action.status}
              type="button"
              disabled={disabled}
              onClick={() => changeStatus(action.status)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                action.className
              } ${disabled && !isCurrentPending ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
                isCurrentPending ? 'cursor-wait opacity-80' : ''
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{isCurrentPending ? 'Guardando…' : action.label}</span>
            </button>
          )
        })}
      </div>

      {!approvalEnabled && currentStatus !== 'approved' && (
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>Aprobación bloqueada hasta superar la prueba extrema.</span>
        </div>
      )}

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
