'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface DashboardGenerateActionProps {
  hasSalidas: boolean
  hasMissingPhotos: boolean
}

export default function DashboardGenerateAction({ hasSalidas, hasMissingPhotos }: DashboardGenerateActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generateWeek() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'No pudimos iniciar la generación. Intentá de nuevo.')
        setLoading(false)
        return
      }

      router.push('/calendario')
      router.refresh()
    } catch {
      setError('Tuvimos un problema de conexión. Intentá de nuevo.')
      setLoading(false)
    }
  }

  const blocked = !hasSalidas || hasMissingPhotos

  return (
    <div className="flex w-full max-w-[680px] flex-col items-center text-center">
      <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--linea)] bg-white/75">
        <CalendarDays className="h-5 w-5 text-[var(--cardon)]" strokeWidth={1.8} />
      </div>

      <div className="eyebrow" style={{ marginBottom: 12 }}>Tu acción principal</div>
      <h1 className="max-w-[620px] text-[38px] font-semibold leading-[1.02] tracking-[-.05em] text-[var(--tinta)] sm:text-[48px]">
        Generá tu semana de contenido.
      </h1>
      <p className="mt-4 max-w-[530px] text-[15px] leading-relaxed text-[var(--piedra)] sm:text-[16px]">
        Between usa tus salidas, sus datos y tu material para preparar las piezas que conviene publicar ahora.
      </p>

      <div className="mt-8 w-full max-w-[430px] rounded-[22px] border border-[var(--linea)] bg-white/75 p-3 shadow-[var(--sombra-reposo)]">
        {blocked ? (
          <Link
            href={!hasSalidas ? '/salidas/nueva' : '/salidas'}
            className="flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--tinta)] px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {!hasSalidas ? 'Cargar mi primera salida' : 'Completar fotos de mis salidas'}
          </Link>
        ) : (
          <button
            type="button"
            onClick={generateWeek}
            disabled={loading}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--cardon)] px-6 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Preparando tu semana…' : 'Generar mi semana'}
          </button>
        )}
      </div>

      <p className="mt-4 text-[12.5px] text-[var(--piedra)]">
        Vas a poder revisar cada pieza antes de publicarla.
      </p>
      {error && <p className="mt-3 text-[13px] font-medium text-red-700">{error}</p>}
    </div>
  )
}
