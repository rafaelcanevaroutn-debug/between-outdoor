'use client'

import {useEffect, useRef, useState} from 'react'
import {AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, Share2, X} from 'lucide-react'

interface Props { clientId: string }

interface Account {
  id: string
  platform: string
  username: string | null
  display_name: string | null
  status: 'connected' | 'disconnected' | 'error'
}

interface Profile {
  id: string
  label: string
  status: 'active' | 'error' | 'disabled'
  last_error: string | null
  accounts: Account[]
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
}

export default function ZernioConnectionPopover({clientId}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
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
      const response = await fetch(`/api/admin/clientes/zernio?clientId=${encodeURIComponent(clientId)}`, {cache: 'no-store'})
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las redes')
      setProfiles(payload.profiles ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las redes')
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  const connectedAccounts = profiles.flatMap(profile => profile.accounts).filter(account => account.status === 'connected')
  const connected = connectedAccounts.length > 0

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => open ? setOpen(false) : void openPanel()} className="flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left" style={{color: connected ? 'var(--cardon)' : 'var(--tinta)', backgroundColor: 'var(--nieve)', borderColor: connected ? 'var(--cardon)' : 'var(--linea)'}}>
        <span className="flex items-center gap-2 text-[12px] font-semibold"><Share2 className="h-3.5 w-3.5" />{connected ? `${connectedAccounts.length} activa${connectedAccounts.length === 1 ? '' : 's'}` : 'Sin conectar'}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} style={{color: 'var(--piedra)'}} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-[400px] rounded-2xl border p-5 shadow-2xl" style={{backgroundColor: 'var(--nieve)', borderColor: 'var(--linea)'}} onClick={event => event.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="absolute right-4 top-4 text-[var(--piedra)] hover:text-[var(--tinta)]"><X className="h-4 w-4" /></button>
            <p className="pr-8 text-sm font-semibold text-[var(--tinta)]">Redes conectadas</p>
            <p className="mt-1 pr-6 text-xs leading-relaxed text-[var(--piedra)]">El cliente autoriza sus cuentas desde Cuenta → Redes sociales.</p>

            {loading ? (
              <div className="flex items-center gap-2 py-8 text-xs text-[var(--piedra)]"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando…</div>
            ) : error ? (
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#f87171]"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>
            ) : profiles.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed px-4 py-5 text-xs leading-relaxed text-[var(--piedra)]" style={{borderColor: 'var(--piedra-clara)'}}>El cliente todavía no preparó ni conectó sus redes.</div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {profiles.map(profile => (
                  <div key={profile.id} className="rounded-xl border p-3.5" style={{borderColor: 'var(--linea)', backgroundColor: 'var(--blanco-piedra)'}}>
                    <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[var(--tinta)]">{profile.label}</span><span className="text-[10px] text-[var(--piedra)]">{profile.accounts.filter(account => account.status === 'connected').length} cuentas</span></div>
                    {profile.accounts.length === 0 ? <p className="text-[11px] text-[var(--piedra)]">Sin cuentas autorizadas.</p> : (
                      <div className="flex flex-col gap-1.5">
                        {profile.accounts.map(account => (
                          <div key={account.id} className="flex items-center justify-between gap-3 text-[11px]"><span className="min-w-0 truncate text-[var(--tinta)]">{PLATFORM_LABELS[account.platform] ?? account.platform} · {account.username || account.display_name || 'Cuenta conectada'}</span>{account.status === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--cardon)]" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#f87171]" />}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
