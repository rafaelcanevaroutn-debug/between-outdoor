'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Rocket, RotateCcw, Trash2, AlertCircle } from 'lucide-react'
import type { ContentTemplateStatus } from '@/types'

interface ActionConfig {
  status: ContentTemplateStatus
  label: string
  icon: typeof Check
  className: string
}

const STATUS_ACTIONS: ActionConfig[] = [
  {
    status: 'borrador',
    label: 'Volver a borrador',
    icon: RotateCcw,
    className:
      'bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200 shadow-xs',
  },
  {
    status: 'aprobada',
    label: 'Aprobar',
    icon: Check,
    className:
      'bg-[var(--cardon-tenue)] text-[var(--cardon)] hover:bg-[var(--cardon)] hover:text-white border border-[var(--cardon)]/40 shadow-xs',
  },
  {
    status: 'productiva',
    label: 'Poner en producción',
    icon: Rocket,
    className:
      'bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] border border-[var(--cardon)] shadow-xs',
  },
]

export default function ContentTemplateActions({
  id,
  currentStatus,
}: {
  id: string
  currentStatus: ContentTemplateStatus
}) {
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
      const result = (await response.json()) as { error?: string }
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
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo borrar')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo borrar el template')
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                action.className
              } ${disabled && !isPending ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
                isPending ? 'cursor-wait opacity-80' : ''
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{isPending ? 'Guardando…' : action.label}</span>
            </button>
          )
        })}

        {currentStatus === 'borrador' && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={deleteTemplate}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100/80 border border-rose-200 shadow-xs transition-all ${
              pending !== null && pending !== 'delete'
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer'
            } ${pending === 'delete' ? 'cursor-wait opacity-80' : ''}`}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>{pending === 'delete' ? 'Borrando…' : 'Borrar'}</span>
          </button>
        )}
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

