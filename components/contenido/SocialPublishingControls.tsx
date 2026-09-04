'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {AlertCircle, CalendarClock, CheckCircle2, ChevronLeft, LoaderCircle, Send, Music2, Trash2} from 'lucide-react'

interface Props {
  contenidoId: string
  ready: boolean
  initialScheduleDate?: string | null
  initialCaption?: string
  onSuccess?: (publication: Publication) => void
}

interface SocialAccount {
  external_account_id: string
  platform: string
  username: string | null
  display_name: string | null
  status: string
}

interface SocialProfile { 
  id: string
  accounts?: SocialAccount[] 
}

export interface Publication {
  id: string
  contenido_id: string
  scheduled_at: string
  status: 'preparing' | 'syncing' | 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled'
  last_error: string | null
}

const STATUS_LABELS: Record<Publication['status'], string> = {
  preparing: 'Preparando publicación',
  syncing: 'Enviando a redes',
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

export default function SocialPublishingControls({contenidoId, ready, initialScheduleDate, initialCaption, onSuccess}: Props) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [primaryProfileId, setPrimaryProfileId] = useState<string | null>(null)
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
      
      const profiles = profilesPayload.profiles as SocialProfile[] | undefined
      if (profiles && profiles.length > 0) {
        setPrimaryProfileId(profiles[0].id)
      }

      const connected = (profiles ?? []).flatMap(profile => profile.accounts ?? [])
        .filter(account => ['instagram', 'tiktok'].includes(account.platform) && account.status === 'connected')
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

  const formattedDate = useMemo(() => {
    const date = new Date(scheduledAt)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('es-AR', {weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'}).format(date)
  }, [scheduledAt])

  async function connectTiktok() {
    if (!primaryProfileId) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/zernio/connect', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({profileId: primaryProfileId, platform: 'tiktok'}),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo conectar la red')
      window.location.assign(payload.authUrl)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'No se pudo conectar TikTok')
      setSubmitting(false)
    }
  }

  async function schedule() {
    if (accounts.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const date = new Date(scheduledAt)
      if (Number.isNaN(date.getTime())) throw new Error('Elegí una fecha y hora válidas')
      const response = await fetch('/api/zernio/publications', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contenidoId, 
          scheduledAt: date.toISOString(), 
          accountIds: accounts.map(a => a.external_account_id), 
          customCaption: (initialCaption ?? '').trim()
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Hubo un error al programar')
      
      const newPublication = {...payload.publication, contenido_id: payload.publication.contenido_id ?? contenidoId, scheduled_at: payload.publication.scheduled_at ?? date.toISOString()}
      setPublication(newPublication)
      setStep('closed')
      onSuccess?.(newPublication)
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : 'No se pudo programar')
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelPublication() {
    if (!publication) return
    if (!window.confirm('¿Seguro que querés cancelar y borrar esta programación?')) return
    
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`/api/zernio/publications/${publication.id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Hubo un error al cancelar')
      
      setPublication(null)
      setStep('closed')
      setScheduledAt(initialSchedule(null))
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 border-t px-4 py-3 text-[12px]" style={{borderColor: 'var(--linea)', color: 'var(--piedra)'}}><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Revisando redes…</div>
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
        
        {!done && (
          <button 
            type="button" 
            onClick={() => void cancelPublication()} 
            disabled={submitting}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50" 
            style={{border: '1px solid currentColor'}}
          >
            {submitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Cancelar y reprogramar
          </button>
        )}
        
        {error && <p className="mt-2 flex items-start gap-1.5 text-[11px] text-red-600"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
      </div>
    )
  }

  const hasInstagram = accounts.some(a => a.platform === 'instagram')
  const hasTiktok = accounts.some(a => a.platform === 'tiktok')

  if (step === 'closed') {
    return (
      <div className="border-t p-4" style={{borderColor: 'var(--linea)'}}>
        <button type="button" onClick={() => setStep('schedule')} disabled={!ready || accounts.length === 0} className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45" style={{background: 'var(--cardon)'}}>
          <Send className="h-4 w-4" /> Programar publicación
        </button>
        {accounts.length === 0 && <p className="mt-2 text-center text-[11px]" style={{color: 'var(--piedra)'}}>Conectá tus redes desde Cuenta para publicar.</p>}
        {accounts.length > 0 && !hasTiktok && primaryProfileId && (
          <button type="button" onClick={connectTiktok} disabled={submitting} className="mt-2 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors hover:text-black" style={{color: 'var(--piedra)'}}>
            <Music2 className="h-3.5 w-3.5" /> Conectar TikTok para publicar en ambas
          </button>
        )}
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
            <p><strong style={{color: 'var(--tinta)'}}>Redes:</strong> {accounts.map(a => a.platform === 'instagram' ? 'Instagram' : 'TikTok').join(' y ')}</p>
            <p className="mt-1 capitalize"><strong style={{color: 'var(--tinta)'}}>Fecha:</strong> {formattedDate}</p>
          </div>
          <button type="button" onClick={() => void schedule()} disabled={submitting} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{background: 'var(--cardon)'}}>{submitting && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{submitting ? 'Programando…' : 'Confirmar y programar'}</button>
        </>
      )}
      {error && <p className="mt-2 flex items-start gap-1.5 text-[11px] text-red-600"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
    </div>
  )
}
