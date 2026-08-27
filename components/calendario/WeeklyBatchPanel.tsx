'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, LoaderCircle, Video } from 'lucide-react'
import Link from 'next/link'
import type { CalendarBatchRun, CalendarCode, Salida } from '@/types'

type SalidaPickerOption = Pick<
  Salida,
  'id' | 'nombre' | 'fecha_inicio' | 'estado' | 'carpeta_fotos_id' | 'carpeta_videos_id'
>

interface WeeklyBatchPanelProps {
  calendarCode: CalendarCode
  calendarName: string
  initialRun: CalendarBatchRun | null
  salidas: SalidaPickerOption[]
}

const POLL_INTERVAL_MS = 5000

function isActive(status: CalendarBatchRun['status'] | undefined) {
  return status === 'pending' || status === 'running'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

export default function WeeklyBatchPanel({ calendarCode, calendarName, initialRun, salidas }: WeeklyBatchPanelProps) {
  const router = useRouter()
  const [run, setRun] = useState<CalendarBatchRun | null>(initialRun)
  const [triggerError, setTriggerError] = useState('')
  const [triggering, setTriggering] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isActive(run?.status)) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate-batch/${run!.id}`)
        if (!res.ok) return
        const data: CalendarBatchRun = await res.json()
        setRun(data)
        if (data.status === 'completed' || data.status === 'error') router.refresh()
      } catch {
        // La red puede recuperarse en el siguiente intento sin interrumpir el proceso.
      }
    }

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [router, run?.id, run?.status])

  async function handleGenerate() {
    setTriggerError('')
    setTriggering(true)
    try {
      const res = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setTriggerError('No pudimos iniciar la generación. Tus datos siguen guardados.')
        setTriggering(false)
        return
      }
      setRun({
        id: data.runId,
        user_id: '',
        calendar_code: calendarCode,
        status: 'pending',
        result: null,
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch {
      setTriggerError('Perdimos la conexión. Revisala e intentá de nuevo.')
      setTriggering(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const activeSalidas = salidas.filter(salida => salida.estado !== 'completada' && salida.fecha_inicio >= today)
  const missingPhotos = activeSalidas.filter(salida => !salida.carpeta_fotos_id)
  const missingVideos = activeSalidas.filter(salida => !salida.carpeta_videos_id)
  const running = triggering || isActive(run?.status)
  const generationError = triggerError || (run?.status === 'error' ? 'No pudimos completar la semana. Tus salidas y tu material siguen guardados.' : '')

  if (activeSalidas.length === 0) {
    return (
      <section className="mx-auto flex min-h-[54vh] w-full max-w-[620px] flex-col items-center justify-center px-5 text-center">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">Antes de generar</p>
        <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-.04em] text-[var(--tinta)] sm:text-[38px]">Primero, cargá una salida.</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--piedra)]">Between necesita saber qué experiencia querés vender para preparar tu semana.</p>
        <Link href="/salidas/nueva" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--cardon)] px-7 py-3.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">
          Crear mi primera salida
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    )
  }

  if (missingPhotos.length > 0) {
    return (
      <section className="mx-auto flex min-h-[54vh] w-full max-w-[680px] flex-col justify-center px-1">
        <div className="text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">Casi listo</p>
          <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-.04em] text-[var(--tinta)] sm:text-[38px]">Faltan fotos para generar.</h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--piedra)]">Vinculá material a estas salidas. Después vas a poder crear la semana con un solo toque.</p>
        </div>

        <div className="mt-7 overflow-hidden rounded-[20px] border border-[var(--linea)] bg-white/70">
          {missingPhotos.map((salida, index) => (
            <div key={salida.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${index > 0 ? 'border-t border-[var(--linea)]' : ''}`}>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[var(--tinta)]">{salida.nombre}</p>
                <p className="mt-0.5 text-[12px] text-[var(--piedra)]">{formatDate(salida.fecha_inicio)} · Sin fotos vinculadas</p>
              </div>
              <Link href={`/salidas/${salida.id}`} className="shrink-0 text-[13px] font-semibold text-[var(--cardon)] hover:underline">Agregar fotos</Link>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (missingVideos.length > 0) {
    return (
      <section className="mx-auto flex min-h-[54vh] w-full max-w-[680px] flex-col justify-center px-1">
        <div className="text-center">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">Casi listo</p>
          <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-.04em] text-[var(--tinta)] sm:text-[38px]">Faltan videos para generar.</h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--piedra)]">Para armar tu semana de contenido completa (videos + piezas estáticas), vinculá una carpeta de videos a tus salidas activas.</p>
        </div>

        <div className="mt-7 overflow-hidden rounded-[20px] border border-[var(--linea)] bg-white/70">
          {missingVideos.map((salida, index) => (
            <div key={salida.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${index > 0 ? 'border-t border-[var(--linea)]' : ''}`}>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[var(--tinta)]">{salida.nombre}</p>
                <p className="mt-0.5 text-[12px] text-[var(--piedra)]">{formatDate(salida.fecha_inicio)} · Sin videos vinculados</p>
              </div>
              <Link href={`/salidas/${salida.id}`} className="shrink-0 text-[13px] font-semibold text-[var(--cardon)] hover:underline">Agregar videos</Link>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (running) {
    return (
      <section className="mx-auto flex min-h-[54vh] w-full max-w-[620px] flex-col items-center justify-center px-5 text-center">
        <LoaderCircle className="h-9 w-9 animate-spin text-[var(--cardon)]" strokeWidth={1.7} />
        <h1 className="mt-6 text-[30px] font-semibold leading-[1.05] tracking-[-.04em] text-[var(--tinta)] sm:text-[38px]">Estamos creando tu semana.</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--piedra)]">Podés seguir usando Between. Tu contenido va a aparecer acá cuando esté listo.</p>
        <div className="mt-7 h-1.5 w-full max-w-[300px] overflow-hidden rounded-full bg-[var(--cardon-tenue)]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--cardon)]" />
        </div>
      </section>
    )
  }

  if (generationError) {
    return (
      <section className="mx-auto flex min-h-[54vh] w-full max-w-[620px] flex-col items-center justify-center px-5 text-center">
        <AlertCircle className="h-8 w-8 text-[var(--cardon)]" strokeWidth={1.7} />
        <h1 className="mt-5 text-[30px] font-semibold leading-[1.05] tracking-[-.04em] text-[var(--tinta)] sm:text-[38px]">No pudimos generar tu semana.</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--piedra)]">{generationError}</p>
        <button onClick={handleGenerate} className="mt-7 rounded-full bg-[var(--cardon)] px-8 py-3.5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">Intentar de nuevo</button>
      </section>
    )
  }

  return (
    <section className="mx-auto flex min-h-[54vh] w-full max-w-[660px] flex-col items-center justify-center px-5 text-center">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--cardon)]">{calendarName}</p>
      <h1 className="text-[32px] font-semibold leading-[1.02] tracking-[-.045em] text-[var(--tinta)] sm:text-[42px]">Tu semana de contenido, en un toque.</h1>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--piedra)]">Between toma tus salidas y prepara las 10 piezas de contenido de tu semana (videos, carruseles y banners).</p>
      <button onClick={handleGenerate} className="mt-8 rounded-full bg-[var(--cardon)] px-9 py-4 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(62,92,72,.16)] transition-transform hover:-translate-y-0.5">Generar mi semana</button>
      <p className="mt-3 text-[12px] text-[var(--piedra)]">Un toque. 10 piezas listas para revisar y publicar.</p>
    </section>
  )
}
