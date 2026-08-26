'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function RegenerateWeekButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function regenerate() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error('No se pudo iniciar la generación')
      router.refresh()
    } catch {
      setError('No pudimos regenerar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 lg:w-auto lg:items-end">
      <button
        type="button"
        onClick={regenerate}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[var(--linea)] bg-white/70 px-4 py-2.5 text-[13px] font-semibold text-[var(--tinta)] transition-colors hover:border-[var(--cardon)] hover:text-[var(--cardon)] disabled:cursor-wait disabled:opacity-60 lg:w-auto"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Regenerando…' : 'Regenerar semana'}
      </button>
      {error && <p className="text-[11px] font-medium text-red-700">{error}</p>}
    </div>
  )
}
