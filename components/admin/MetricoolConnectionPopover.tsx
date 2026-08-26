'use client'

import {useEffect, useRef, useState} from 'react'
import {AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, Share2, X} from 'lucide-react'
import type {SocialNetwork} from '@/types'

interface Props {
  clientId: string
}

interface ConnectionResponse {
  metricoolUserId: number
  blogId: number
  timezone: string
  enabledNetworks: SocialNetwork[]
  status: 'pending' | 'connected' | 'error' | 'disabled'
  lastVerifiedAt: string | null
  lastError: string | null
}

const NETWORKS: {id: SocialNetwork; label: string}[] = [
  {id: 'instagram', label: 'Instagram'},
  {id: 'facebook', label: 'Facebook'},
  {id: 'tiktok', label: 'TikTok'},
]

export default function MetricoolConnectionPopover({clientId}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<ConnectionResponse['status'] | 'unconfigured'>('unconfigured')
  const [metricoolUserId, setMetricoolUserId] = useState('')
  const [blogId, setBlogId] = useState('')
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires')
  const [networks, setNetworks] = useState<SocialNetwork[]>(['instagram'])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function openPanel() {
    setOpen(true)
    if (loaded) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/clientes/metricool?clientId=${encodeURIComponent(clientId)}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar Metricool')
      const connection = payload.connection as ConnectionResponse | null
      if (connection) {
        setMetricoolUserId(String(connection.metricoolUserId))
        setBlogId(String(connection.blogId))
        setTimezone(connection.timezone)
        setNetworks(connection.enabledNetworks)
        setStatus(connection.status)
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar Metricool')
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  function toggleNetwork(network: SocialNetwork) {
    setNetworks(current => current.includes(network)
      ? current.filter(value => value !== network)
      : [...current, network])
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/clientes/metricool', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          clientId,
          metricoolUserId: Number(metricoolUserId),
          blogId: Number(blogId),
          timezone,
          enabledNetworks: networks,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo conectar Metricool')
      setStatus(payload.status)
    } catch (saveError) {
      setStatus('error')
      setError(saveError instanceof Error ? saveError.message : 'No se pudo conectar Metricool')
    } finally {
      setSaving(false)
    }
  }

  const connected = status === 'connected'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => open ? setOpen(false) : void openPanel()}
        className="flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left"
        style={{
          color: connected ? 'var(--cardon-tenue)' : '#9DB0A4',
          backgroundColor: '#0A100B',
          borderColor: connected ? 'rgba(92,230,160,.35)' : 'rgba(255,255,255,.08)',
        }}
      >
        <span className="flex items-center gap-2 text-[12px] font-semibold">
          <Share2 className="h-3.5 w-3.5" />
          {connected ? 'Conectado' : 'Configurar'}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-[380px] rounded-2xl border p-5 shadow-2xl" style={{backgroundColor: '#080D09', borderColor: 'rgba(255,255,255,.1)'}} onClick={event => event.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="absolute right-4 top-4 text-[#7E9286] hover:text-[#EAF2EC]"><X className="h-4 w-4" /></button>
            <p className="pr-8 text-sm font-semibold text-[#EAF2EC]">Conectar Metricool</p>
            <p className="mt-1 pr-4 text-xs leading-relaxed text-[#7E9286]">Los IDs aparecen en la URL de la marca abierta en Metricool.</p>

            {loading ? (
              <div className="flex items-center gap-2 py-8 text-xs text-[#9DB0A4]"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando…</div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
              <label className="text-[11px] font-semibold text-[#9DB0A4]">USER ID
                <input value={metricoolUserId} onChange={event => setMetricoolUserId(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border bg-[#0A100B] px-3 py-2 text-sm text-[#EAF2EC] outline-none" style={{borderColor: 'rgba(255,255,255,.1)'}} />
              </label>
              <label className="text-[11px] font-semibold text-[#9DB0A4]">BLOG ID
                <input value={blogId} onChange={event => setBlogId(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border bg-[#0A100B] px-3 py-2 text-sm text-[#EAF2EC] outline-none" style={{borderColor: 'rgba(255,255,255,.1)'}} />
              </label>
              <label className="text-[11px] font-semibold text-[#9DB0A4]">ZONA HORARIA
                <input value={timezone} onChange={event => setTimezone(event.target.value)} className="mt-1 w-full rounded-lg border bg-[#0A100B] px-3 py-2 text-sm text-[#EAF2EC] outline-none" style={{borderColor: 'rgba(255,255,255,.1)'}} />
              </label>
              <div>
                <p className="text-[11px] font-semibold text-[#9DB0A4]">REDES HABILITADAS</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NETWORKS.map(network => (
                    <button key={network.id} type="button" onClick={() => toggleNetwork(network.id)} className="rounded-full border px-3 py-1.5 text-[11px] font-semibold" style={{color: networks.includes(network.id) ? '#EAF2EC' : '#7E9286', borderColor: networks.includes(network.id) ? 'rgba(92,230,160,.45)' : 'rgba(255,255,255,.08)', backgroundColor: networks.includes(network.id) ? 'rgba(62,92,72,.28)' : '#0A100B'}}>
                      {network.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="flex items-start gap-2 text-xs leading-relaxed text-[#f87171]"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
              {connected && !error && <p className="flex items-center gap-2 text-xs text-[var(--cardon-tenue)]"><CheckCircle2 className="h-3.5 w-3.5" />Conexión verificada.</p>}

              <button type="button" onClick={save} disabled={saving || !metricoolUserId || !blogId || networks.length === 0} className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[var(--cardon)] px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Verificando…' : 'Guardar y verificar'}
              </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
