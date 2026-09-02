'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {AlertCircle, CalendarClock, CheckCircle2, ChevronLeft, LoaderCircle, Send} from 'lucide-react'

interface Props {
  contenidoId: string
  ready: boolean
  initialScheduleDate?: string | null
}

interface SocialAccount {
  external_account_id: string
  platform: string
  username: string | null
  display_name: string | null
  status: string
}

interface SocialProfile { accounts?: SocialAccount[] }

interface Publication {
  id: string
  contenido_id: string
  scheduled_at: string
  status: 'preparing' | 'syncing' | 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled'
  last_error: string | null
}

const STATUS_LABELS: Record<Publication['status'], string> = {
  preparing: 'Preparando publicación',
  syncing: 'Enviando a Instagram',
  draft: 'Borrador',
  scheduled: 'Programada',
  published: 'Publicada',
  failed: 'Falló la publicación',
  cancelled: 'Cancelada',
}

function initialSchedule(providedDate?: string | null): string {
  if (providedDate) {
    const provided = new Date(providedDate)
    if (!Number.isNaN(provided.getTime()) && provided.getTime() > Date.now()) {
      const offset = provided.getTimezoneOffset() * 60_000
      return new Date(provided.getTime() - offset).toISOString().slice(0, 16)
    }
  }
  const date = new Date(Date.now() + 15 * 60_000)
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function minimumSchedule(): string {
  const date = new Date(Date.now() + 6 * 60_000)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function SocialPublishingControls({contenidoId, ready, initialScheduleDate}: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [publication, setPublication] = useState<Publication | null>(null)
  const [scheduledAt, setScheduledAt] = useState(() => initialSchedule(initialScheduleDate))
  const [step, setStep] = useState<'closed' | 'schedule' | 'confirm'>('closed')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profilesResponse, publicationsResponse] = await Promise.all([
        fetch('/api/zernio/profiles', {cache: 'no-store'}),
        fetch('/api/zernio/publications', {cache: 'no-store'}),
      ])
      const [profilesPayload, publicationsPayload] = await Promise.all([profilesResponse.json(), publicationsResponse.json()])
      if (!profilesResponse.ok) throw new Error(profilesPayload.error || 'No se pudieron cargar las redes')
      if (!publicationsResponse.ok) throw new Error(publicationsPayload.error || 'No se pudieron cargar las publicaciones')
      const connected = (profilesPayload.profiles as SocialProfile[] | undefined)?.flatMap(profile => profile.accounts ?? [])
        .filter(account => account.platform === 'instagram' && account.status === 'connected') ?? []
      setAccounts(connected)
      const publications = publicationsPayload.publications as Publication[] | undefined
      setPublication(publications?.find(item => item.contenido_id === contenidoId && item.status !== 'cancelled') ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo preparar la publicación')
    } finally {
      setLoading(false)
    }
  }, [contenidoId])

  useEffect(() => { void load() }, [load])

  const account = accounts[0] ?? null
  const formattedDate = useMemo(() => {
    const date = new Date(scheduledAt)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('es-AR', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'}).format(date)
  }, [scheduledAt])

  async function schedule() {
    if (!account) return
    setSubmitting(true)
    setError('')
    try {
      const date = new Date(scheduledAt)
      if (Number.isNaN(date.getTime())) throw new Error('Elegí una fecha y hora válidas')
      const response = await fetch('/api/zernio/publications', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({contenidoId, scheduledAt: date.toISOString(), accountIds: [account.external_account_id]}),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo programar la publicación')
      setPublication({...payload.publication, contenido_id: payload.publication.contenido_id ?? contenidoId, scheduled_at: payload.publication.scheduled_at ?? date.toISOString()})
      setStep('closed')
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : 'No se pudo programar la publicación')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 border-t px-4 py-3 text-[12px]" style={{borderColor: 'var(--linea)', color: 'var(--piedra)'}}><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Revisando Instagram…</div>
  }

  if (publication && publication.status !== 'failed') {
    const done = publication.status === 'published'
    return (
      <div className="border-t px-4 py-3" style={{borderColor: 'var(--linea)'}}>
        <div className="flex items-center gap-2 text-[12px] font-semibold" style={{color: 'var(--cardon)'}}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
          {STATUS_LABELS[publication.status]}
        </div>
        <p className="mt-1 text-[11px]" style={{color: 'var(--piedra)'}}>{new Intl.DateTimeFormat('es-AR', {dateStyle: 'medium', timeStyle: 'short', hour12: false}).format(new Date(publication.scheduled_at))} hs</p>
      </div>
    )
  }

  if (step === 'closed') {
    return (
      <div className="border-t p-4" style={{borderColor: 'var(--linea)'}}>
        <button type="button" onClick={() => setStep('schedule')} disabled={!ready || !account} className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45" style={{background: 'var(--cardon)'}}>
          <Send className="h-4 w-4" /> Programar en Instagram
        </button>
        {!account && <p className="mt-2 text-center text-[11px]" style={{color: 'var(--piedra)'}}>Conectá Instagram desde Cuenta para publicar.</p>}
        {!ready && <p className="mt-2 text-center text-[11px]" style={{color: 'var(--piedra)'}}>El diseño debe estar listo antes de publicarlo.</p>}
        {publication?.status === 'failed' && <button type="button" onClick={() => setStep('schedule')} className="mt-2 w-full text-center text-[11px] font-semibold text-red-600">Reintentar publicación</button>}
        {error && <p className="mt-2 flex items-start gap-1.5 text-[11px] text-red-600"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
      </div>
    )
  }

  return (
    <div className="border-t p-4" style={{borderColor: 'var(--linea)'}}>
      <button type="button" onClick={() => setStep(step === 'confirm' ? 'schedule' : 'closed')} className="mb-3 flex items-center gap-1 text-[11px] font-semibold" style={{color: 'var(--piedra)'}}><ChevronLeft className="h-3.5 w-3.5" /> Volver</button>
      {step === 'schedule' ? (
        <>
          <p className="text-[12px] font-semibold" style={{color: 'var(--tinta)'}}>¿Cuándo querés publicarlo?</p>
          <input type="datetime-local" lang="en-GB" value={scheduledAt} min={minimumSchedule()} onChange={event => setScheduledAt(event.target.value)} className="mt-2 w-full rounded-xl border bg-transparent px-3 py-2.5 text-[12px] outline-none" style={{borderColor: 'var(--linea)', color: 'var(--tinta)'}} />
          <button type="button" onClick={() => setStep('confirm')} disabled={!scheduledAt} className="mt-3 w-full rounded-full px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-45" style={{background: 'var(--cardon)'}}>Continuar</button>
        </>
      ) : (
        <>
          <p className="text-[12px] font-semibold" style={{color: 'var(--tinta)'}}>Confirmar publicación</p>
          <div className="mt-2 rounded-xl px-3 py-2.5 text-[11px]" style={{background: 'var(--blanco-piedra)', color: 'var(--piedra)'}}>
            <p><strong style={{color: 'var(--tinta)'}}>Instagram:</strong> @{account?.username || account?.display_name || 'cuenta conectada'}</p>
            <p className="mt-1 capitalize"><strong style={{color: 'var(--tinta)'}}>Fecha:</strong> {formattedDate}</p>
          </div>
          <button type="button" onClick={() => void schedule()} disabled={submitting} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{background: 'var(--cardon)'}}>{submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{submitting ? 'Programando…' : 'Confirmar y programar'}</button>
        </>
      )}
      {error && <p className="mt-2 flex items-start gap-1.5 text-[11px] text-red-600"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
    </div>
  )
}
