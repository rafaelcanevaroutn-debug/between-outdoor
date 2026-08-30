'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface RegenerateSalidaOption {
  id: string
  nombre: string
  fecha_inicio: string | null
}

export default function RegenerateWeekButton({ salidas }: { salidas: RegenerateSalidaOption[] }) {
  const router = useRouter()
  const [salidaId, setSalidaId] = useState(salidas[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function regenerate() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salidaId }),
      })
      if (!response.ok) throw new Error('No se pudo iniciar la generación')
      router.refresh()
    } catch {
      setError('No pudimos regenerar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 lg:min-w-[330px]">
      <label htmlFor="calendar-salida-picker" className="text-left text-[12px] font-semibold text-[var(--tinta)]">
        ¿De qué salida querés generar la nueva semana?
      </label>
      <select
        id="calendar-salida-picker"
        value={salidaId}
        onChange={event => setSalidaId(event.target.value)}
        aria-label="Salida para regenerar la semana"
        className="w-full rounded-[14px] border-2 border-[var(--cardon)] bg-white px-4 py-3 text-[14px] font-semibold text-[var(--tinta)] outline-none"
      >
        {salidas.map(salida => (
          <option key={salida.id} value={salida.id}>{salida.nombre}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={regenerate}
        disabled={loading || !salidaId}
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--cardon)] px-5 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Generando…' : 'Generar semana de esta salida'}
      </button>
      {error && <p className="text-[11px] font-medium text-red-700">{error}</p>}
    </div>
  )
}
