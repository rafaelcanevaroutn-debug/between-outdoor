'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CampaignContext, ContentProfileCode, DiaSemana } from '@/types'

const PROFILE_LABELS: Record<ContentProfileCode, { name: string; short: string }> = {
  standard_outdoor: { name: 'Outdoor estándar', short: 'Estándar' },
  grupo_recurrente_local: { name: 'Grupo recurrente local', short: 'Grupo local' },
  dupla_viajes_internacionales: { name: 'Dupla de viajes internacionales', short: 'Dupla viajes' },
}

const WEEK_DAYS: DiaSemana[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function textList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

interface Props {
  clientId: string
  initialProfile: ContentProfileCode
  initialContext: CampaignContext
}

export default function CommercialProfilePopover({ clientId, initialProfile, initialContext }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const [context, setContext] = useState<CampaignContext>(initialContext)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  function updateContext<Key extends keyof CampaignContext>(key: Key, value: CampaignContext[Key]) {
    setContext(current => ({ ...current, [key]: value }))
    setMessage(null)
    setError(null)
  }

  function updateProtagonist(index: number, key: 'nombre' | 'rol', value: string) {
    const protagonists = [...(context.protagonistas ?? [])]
    protagonists[index] = { ...(protagonists[index] ?? { nombre: '' }), [key]: value }
    updateContext('protagonistas', protagonists)
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch('/api/admin/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, content_profile: profile, campaign_context: context }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo guardar el perfil')
      setContext(result.campaign_context ?? {})
      setMessage('Perfil aplicado al motor.')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    borderRadius: 8,
    border: '1px solid var(--linea)',
    background: 'var(--nieve)',
    color: 'var(--tinta)',
    padding: '8px 10px',
    fontSize: 12,
  } as const

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left"
        style={{
          color: 'var(--tinta)',
          backgroundColor: 'var(--nieve)',
          borderColor: open ? 'var(--cardon)' : 'var(--linea)',
        }}
      >
        <span className="truncate text-xs">{PROFILE_LABELS[profile].short}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--piedra)' }} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Configurar perfil comercial"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(560px,calc(100vw-48px))] rounded-2xl border p-5 shadow-2xl"
          style={{ background: 'var(--nieve)', borderColor: 'var(--linea)', boxShadow: 'var(--sombra-alta)' }}
        >
          <div className="mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--tinta)' }}>Perfil comercial del motor</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--piedra)' }}>Define intención y reglas. No cambia los diseños existentes.</p>
          </div>

          <label className="block text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--piedra)' }}>
            Perfil
            <select
              value={profile}
              onChange={event => {
                setProfile(event.target.value as ContentProfileCode)
                setMessage(null)
              }}
              className="mt-1.5"
              style={inputStyle}
            >
              {Object.entries(PROFILE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label.name}</option>
              ))}
            </select>
          </label>

          {profile !== 'standard_outdoor' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Nombre público" value={context.nombre_publico ?? ''} onChange={value => updateContext('nombre_publico', value)} style={inputStyle} placeholder="Lo que puede aparecer en las piezas" />
              <Field label="Territorio" value={context.territorio ?? ''} onChange={value => updateContext('territorio', value)} style={inputStyle} placeholder="Ej. Tucumán" />
              <Field label="Actividad" value={context.actividad ?? ''} onChange={value => updateContext('actividad', value)} style={inputStyle} placeholder="Ej. trekking en grupo" />
              <Field label="Oferta" value={context.nombre_oferta ?? ''} onChange={value => updateContext('nombre_oferta', value)} style={inputStyle} placeholder="Nombre comercial" />
              <Field label="Destinos (separados por coma)" value={(context.destinos ?? []).join(', ')} onChange={value => updateContext('destinos', textList(value))} style={inputStyle} placeholder="Horco Molle, San Javier" />
              <Field label="No mencionar (separado por coma)" value={(context.terminos_prohibidos ?? []).join(', ')} onChange={value => updateContext('terminos_prohibidos', textList(value))} style={inputStyle} placeholder="Otros viajes o destinos" />
            </div>
          )}

          {profile === 'grupo_recurrente_local' && (
            <div className="mt-4 space-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--linea)', background: 'var(--blanco-piedra)' }}>
              <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--tinta)' }}>
                <input
                  type="checkbox"
                  checked={context.frecuencia_confirmada === true}
                  onChange={event => updateContext('frecuencia_confirmada', event.target.checked)}
                />
                Está confirmada la frecuencia semanal
              </label>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--piedra)' }}>Días confirmados</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEK_DAYS.map(day => {
                    const active = context.dias_confirmados?.includes(day) ?? false
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => updateContext('dias_confirmados', active
                          ? (context.dias_confirmados ?? []).filter(item => item !== day)
                          : [...(context.dias_confirmados ?? []), day])}
                        className="rounded-full border px-2.5 py-1 text-[11px] capitalize"
                        style={{
                          color: active ? 'var(--nieve)' : 'var(--tinta)',
                          background: active ? 'var(--cardon)' : 'var(--nieve)',
                          borderColor: active ? 'var(--cardon)' : 'var(--linea)',
                        }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Field label="Horarios confirmados (separados por coma)" value={(context.horarios_confirmados ?? []).join(', ')} onChange={value => updateContext('horarios_confirmados', textList(value))} style={inputStyle} placeholder="Solo si están definidos" />
              <Field label="Palabra para comentarios" value={context.keyword_comentario ?? ''} onChange={value => updateContext('keyword_comentario', value)} style={inputStyle} placeholder="Ej. GRUPO" />
            </div>
          )}

          {profile === 'dupla_viajes_internacionales' && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--linea)', background: 'var(--blanco-piedra)' }}>
              <Field label="Campaña principal" value={context.campania_principal ?? ''} onChange={value => updateContext('campania_principal', value)} style={inputStyle} placeholder="Ej. México" />
              <Field label="Marcas que no deben aparecer" value={(context.marcas_prohibidas ?? []).join(', ')} onChange={value => updateContext('marcas_prohibidas', textList(value))} style={inputStyle} placeholder="Ej. Caminantes de Montaña" />
              {[0, 1].map(index => (
                <div key={index} className="col-span-2 grid grid-cols-2 gap-3">
                  <Field label={`Protagonista ${index + 1}`} value={context.protagonistas?.[index]?.nombre ?? ''} onChange={value => updateProtagonist(index, 'nombre', value)} style={inputStyle} placeholder="Nombre" />
                  <Field label={`Rol del protagonista ${index + 1}`} value={context.protagonistas?.[index]?.rol ?? ''} onChange={value => updateProtagonist(index, 'rol', value)} style={inputStyle} placeholder="Rol verificable" />
                </div>
              ))}
            </div>
          )}

          {profile !== 'standard_outdoor' && (
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--piedra)' }}>
              CTA principal
              <select value={context.cta_primario ?? ''} onChange={event => updateContext('cta_primario', (event.target.value || null) as CampaignContext['cta_primario'])} className="mt-1.5" style={inputStyle}>
                <option value="">Sin confirmar</option>
                <option value="link_bio">Link en bio</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="comentario">Comentario</option>
                <option value="dm">Mensaje directo</option>
                <option value="formulario">Formulario</option>
              </select>
            </label>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div aria-live="polite" className="text-xs">
              {message && <span style={{ color: 'var(--cardon)' }}>{message}</span>}
              {error && <span style={{ color: '#f87171' }}>{error}</span>}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50 transition-colors"
              style={{ color: 'var(--nieve)', background: 'var(--cardon)' }}
            >
              {saving ? 'Guardando…' : 'Aplicar al motor'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, style, placeholder }: {
  label: string
  value: string
  onChange: (value: string) => void
  style: React.CSSProperties
  placeholder?: string
}) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--piedra)' }}>
      {label}
      <input value={value} onChange={event => onChange(event.target.value)} className="mt-1.5" style={style} placeholder={placeholder} />
    </label>
  )
}
