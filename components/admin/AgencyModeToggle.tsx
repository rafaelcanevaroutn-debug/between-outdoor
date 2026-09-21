'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AgencyModeToggleProps {
  clientId: string
  initialIsAgency: boolean
}

export default function AgencyModeToggle({ clientId, initialIsAgency }: AgencyModeToggleProps) {
  const router = useRouter()
  const [isAgency, setIsAgency] = useState(initialIsAgency)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    if (saving) return

    const previousValue = isAgency
    const nextValue = !isAgency
    setIsAgency(nextValue)
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          is_agency: nextValue,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar el modo agencia')
      }

      router.refresh()
    } catch (assignmentError) {
      setIsAgency(previousValue)
      setError(assignmentError instanceof Error ? assignmentError.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cardon focus:ring-offset-2 ${
          isAgency ? 'bg-cardon' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={isAgency}
        style={{
          backgroundColor: isAgency ? 'var(--cardon)' : 'var(--piedra-clara)',
          opacity: saving ? 0.7 : 1,
        }}
      >
        <span className="sr-only">Modo Agencia</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isAgency ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  )
}
