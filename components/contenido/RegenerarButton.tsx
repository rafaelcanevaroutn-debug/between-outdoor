'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface Props {
  salidaId: string
}

export default function RegenerarButton({ salidaId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegenerar() {
    if (!confirm('¿Borrar el contenido actual y generar una tanda nueva con IA?')) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidaId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar')

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRegenerar}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors"
        style={{
          backgroundColor: loading ? '#162216' : '#111A11',
          border: `1px solid ${loading ? '#34D17E' : '#1E2D1E'}`,
          color: loading ? '#34D17E' : '#6B8F71',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Generando...' : 'Regenerar'}
      </button>
      {error && (
        <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
      )}
    </div>
  )
}
