'use client'

import {useCallback, useEffect, useState} from 'react'
import {AlertCircle, Camera, CheckCircle2, LoaderCircle, Music2, Plus, RefreshCw} from 'lucide-react'
import type {LucideIcon} from 'lucide-react'

type Platform = 'instagram' | 'tiktok'

interface Account {
  id: string
  platform: Platform
  username: string | null
  display_name: string | null
  status: 'connected' | 'disconnected' | 'error'
}

interface SocialProfile {
  id: string
  label: string
  is_primary: boolean
  status: 'active' | 'error' | 'disabled'
  last_error: string | null
  accounts: Account[]
}

const NETWORKS: Array<{platform: Platform; label: string; Icon: LucideIcon}> = [
  {platform: 'instagram', label: 'Instagram', Icon: Camera},
  {platform: 'tiktok', label: 'TikTok', Icon: Music2},
]

export default function SocialConnectionsCard() {
  const [profiles, setProfiles] = useState<SocialProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/zernio/profiles', {cache: 'no-store'})
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las redes')
      setProfiles(payload.profiles ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las redes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function createProfile() {
    const label = profiles.length === 0 ? 'Redes principales' : `Grupo de cuentas ${profiles.length + 1}`
    setWorking('profile')
    setError('')
    try {
      const response = await fetch('/api/zernio/profiles', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({label}),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo preparar la conexión')
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo preparar la conexión')
    } finally {
      setWorking('')
    }
  }

  async function connect(profileId: string, platform: Platform) {
    const key = `${profileId}:${platform}`
    setWorking(key)
    setError('')
    try {
      const response = await fetch('/api/zernio/connect', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({profileId, platform}),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo conectar la red')
      window.location.assign(payload.authUrl)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'No se pudo conectar la red')
      setWorking('')
    }
  }

  return (
    <section className="rounded-[18px] overflow-hidden" style={{background: 'var(--nieve)', border: '1px solid var(--linea)'}}>
      <div className="flex items-start justify-between gap-4 px-6 py-5" style={{borderBottom: '1px solid var(--linea)'}}>
        <div>
          <h2 className="text-[15px] font-semibold" style={{color: 'var(--tinta)'}}>Redes sociales</h2>
          <p className="mt-1 text-[12px]" style={{color: 'var(--piedra)'}}>Conectalas una vez. Between publica el contenido aprobado.</p>
        </div>
        {!loading && profiles.length > 0 && (
          <button type="button" onClick={() => void load()} aria-label="Actualizar redes" className="rounded-full p-2" style={{color: 'var(--piedra)', border: '1px solid var(--linea)'}}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <p className="flex items-center gap-2 text-[13px]" style={{color: 'var(--piedra)'}}><LoaderCircle className="h-4 w-4 animate-spin" /> Revisando conexiones…</p>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[13px]" style={{color: 'var(--piedra)'}}>Todavía no conectaste ninguna cuenta.</p>
            <button type="button" onClick={createProfile} disabled={working === 'profile'} className="rounded-full px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{background: 'var(--cardon)'}}>
              {working === 'profile' ? 'Preparando…' : 'Conectar mis redes'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {profiles.map(profile => (
              <div key={profile.id} className="rounded-2xl p-4" style={{background: '#F7F6F1', border: '1px solid var(--linea)'}}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold" style={{color: 'var(--tinta)'}}>{profile.label}</p>
                  {profile.accounts.some(account => account.status === 'connected') && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{color: 'var(--cardon)'}}><CheckCircle2 className="h-3 w-3" /> Activo</span>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {NETWORKS.map(({platform, label, Icon}) => {
                    const account = profile.accounts.find(item => item.platform === platform && item.status === 'connected')
                    const key = `${profile.id}:${platform}`
                    return (
                      <button key={platform} type="button" onClick={() => !account && void connect(profile.id, platform)} disabled={Boolean(account) || working === key} className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left disabled:cursor-default" style={{background: 'var(--nieve)', border: `1px solid ${account ? 'rgba(62,92,72,.28)' : 'var(--linea)'}`}}>
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0" style={{color: account ? 'var(--cardon)' : 'var(--piedra)'}} />
                          <span className="min-w-0">
                            <span className="block text-[12px] font-semibold" style={{color: 'var(--tinta)'}}>{label}</span>
                            <span className="block truncate text-[10px]" style={{color: 'var(--piedra)'}}>{account ? account.username || account.display_name || 'Conectada' : 'Conectar cuenta'}</span>
                          </span>
                        </span>
                        {working === key && <LoaderCircle className="h-3.5 w-3.5 animate-spin" style={{color: 'var(--cardon)'}} />}
                        {account && <CheckCircle2 className="h-3.5 w-3.5" style={{color: 'var(--cardon)'}} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <button type="button" onClick={createProfile} disabled={working === 'profile'} className="flex w-fit items-center gap-1.5 text-[11px] font-semibold disabled:opacity-50" style={{color: 'var(--cardon)'}}>
              <Plus className="h-3.5 w-3.5" /> Agregar otro grupo de cuentas
            </button>
          </div>
        )}

        {error && <p className="mt-4 flex items-start gap-2 text-[12px] text-red-600"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
      </div>
    </section>
  )
}
