'use client'

import { useState } from 'react'
import {
  Video,
  Layout,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  Check,
  Calendar,
  Layers,
  Copy,
  CheckCheck,
} from 'lucide-react'
import { VIDEO_SUBFAMILIA_OPTIONS, CANAL_OPTIONS } from '@/lib/generators/video-subfamilia-options'

type ContentType = 'video' | 'banner' | 'carrusel'

const BANNER_MOLDES: { value: number; label: string; noAi: boolean }[] = [
  { value: 1, label: 'Molde 1 — Salida mínima', noAi: false },
  { value: 2, label: 'Molde 2 — Ficha técnica', noAi: false },
  { value: 3, label: 'Molde 3 — Comercial', noAi: true },
  { value: 4, label: 'Molde 4 — Próximas salidas (requiere 2-4 salidas reales)', noAi: true },
  { value: 5, label: 'Molde 5 — Agencia', noAi: true },
  { value: 6, label: 'Molde 6 — Comunidad', noAi: false },
]

const CARRUSEL_FORMATOS = [
  { value: 'organico', label: 'Orgánico' },
  { value: 'conversacion', label: 'Conversación' },
  { value: 'itinerario', label: 'Itinerario' },
  { value: 'ascenso', label: 'Ascenso' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'lugar', label: 'Lugar' },
  { value: 'promo_simple', label: 'Promo simple' },
  { value: 'promo_cta', label: 'Promo con CTA' },
  { value: 'promo_info', label: 'Promo informativa' },
]

const TYPOGRAPHY_OPTIONS = ['Montserrat', 'Inter', 'Oswald', 'Bangers', 'Playfair Display']

interface Cliente {
  id: string
  full_name: string | null
  company_name: string | null
  niche: string
}
interface SalidaOption {
  id: string
  nombre: string
  destino: string
  fecha_inicio: string
  estado: string
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export default function GenerationConsole({ clientes }: { clientes: Cliente[] }) {
  const [contentType, setContentType] = useState<ContentType>('video')
  const [videoSubfamilia, setVideoSubfamilia] = useState('2a')
  const [moldType, setMoldType] = useState(1)
  const [carruselFormato, setCarruselFormato] = useState('organico')
  const [clienteId, setClienteId] = useState('')
  const [salidaSource, setSalidaSource] = useState<'mock' | 'real'>('mock')
  const [salidaId, setSalidaId] = useState('')
  const [salidasReales, setSalidasReales] = useState<SalidaOption[]>([])
  const [salidaIdsMolde4, setSalidaIdsMolde4] = useState<string[]>([])
  const [mock, setMock] = useState({
    destino: 'El Chaltén',
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    precio_usd: 500,
    cupos: 10,
    nivel: 'media',
    moneda: 'USD',
    tipo_viaje: 'expedicion_premium',
  })
  const [tipografias, setTipografias] = useState<string[]>(['Inter', 'Playfair Display'])
  const [canales, setCanales] = useState<string[]>(['WhatsApp'])
  const [cta, setCta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const [copied, setCopied] = useState(false)

  const isMolde4 = contentType === 'banner' && moldType === 4
  const needsChannels =
    (contentType === 'video' && (videoSubfamilia === '4' || videoSubfamilia === '5')) ||
    (contentType === 'banner' && !isMolde4)
  const isStub1c = contentType === 'video' && videoSubfamilia === '1c'
  const isNoAiBanner = contentType === 'banner' && BANNER_MOLDES.find((m) => m.value === moldType)?.noAi

  async function loadSalidas(id: string) {
    setClienteId(id)
    setSalidaId('')
    setSalidaIdsMolde4([])
    setSalidasReales([])
    if (!id) return
    const response = await fetch(`/api/admin/generate/salidas?clienteId=${id}`)
    const json = await response.json()
    if (response.ok) setSalidasReales(json.salidas ?? [])
  }

  async function generate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let url = ''
      let payload: Record<string, unknown> = { clienteId }
      if (!isMolde4) {
        if (salidaSource === 'real') payload.salidaId = salidaId
        else payload.mockSalida = mock
      }

      if (contentType === 'video') {
        url = '/api/admin/generate/video'
        payload = {
          ...payload,
          subfamilia: videoSubfamilia,
          tipografiasPermitidas: tipografias,
          canalesHabilitados: canales,
        }
      } else if (contentType === 'banner') {
        url = '/api/admin/generate/banner'
        payload = {
          ...payload,
          moldType,
          tipografiasPermitidas: tipografias,
          canalesHabilitados: canales,
          cta: cta || undefined,
        }
        if (isMolde4) payload.salidaIds = salidaIdsMolde4
      } else {
        url = '/api/admin/generate/carrusel'
        payload = { ...payload, formato: carruselFormato }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Error al generar')
      setResult(json)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al generar')
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Configuration Column */}
      <div className="flex flex-col gap-5">
        {/* Type & Subtype Card */}
        <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Tipo de contenido
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { type: 'video', label: 'Video', icon: Video },
                  { type: 'banner', label: 'Banner / Flyer', icon: ImageIcon },
                  { type: 'carrusel', label: 'Carrusel', icon: Layout },
                ] as const
              ).map(({ type, label, icon: Icon }) => {
                const isActive = contentType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContentType(type)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--cardon)] text-white shadow-xs'
                        : 'bg-[var(--blanco-piedra)] text-[var(--piedra)] hover:text-[var(--tinta)] border border-[var(--linea)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {contentType === 'video' && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--linea)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Subfamilia (13)
              </span>
              <select
                className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
                value={videoSubfamilia}
                onChange={(event) => setVideoSubfamilia(event.target.value)}
              >
                {VIDEO_SUBFAMILIA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} — {option.label}
                  </option>
                ))}
              </select>
              {isStub1c && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg mt-1 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    1c es un stub sin IA (nunca llama Gemini, devuelve campos vacíos). Origen no confirmado en el repo — se incluye igual, marcado.
                  </span>
                </p>
              )}
            </div>
          )}

          {contentType === 'banner' && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--linea)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Molde (6)
              </span>
              <select
                className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
                value={moldType}
                onChange={(event) => setMoldType(Number(event.target.value))}
              >
                {BANNER_MOLDES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {isNoAiBanner && (
                <p className="text-xs text-[var(--piedra)] mt-0.5">
                  Este molde no usa IA — composición determinística a partir de la salida.
                </p>
              )}
            </div>
          )}

          {contentType === 'carrusel' && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--linea)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Formato (6 adaptativos + 3 promo)
              </span>
              <select
                className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
                value={carruselFormato}
                onChange={(event) => setCarruselFormato(event.target.value)}
              >
                {CARRUSEL_FORMATOS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--piedra)] mt-0.5">
                El formato editorial legacy queda fuera de este modo (pasa por el pipeline mixto video/carrusel/flyer).
              </p>
            </div>
          )}
        </div>

        {/* Client & Salida Context Card */}
        <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Cliente real (aporta niche, onboarding y branding)
            </span>
            <select
              className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
              value={clienteId}
              onChange={(event) => loadSalidas(event.target.value)}
            >
              <option value="">Elegí un cliente…</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.company_name || cliente.full_name || cliente.id} ({cliente.niche})
                </option>
              ))}
            </select>
          </div>

          {!isMolde4 && (
            <div className="flex flex-col gap-3 pt-2 border-t border-[var(--linea)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  Fuente de la salida
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['mock', 'real'] as const).map((source) => {
                  const isActive = salidaSource === source
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setSalidaSource(source)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border border-[var(--cardon)]/40 shadow-xs'
                          : 'bg-[var(--blanco-piedra)] text-[var(--piedra)] hover:text-[var(--tinta)] border border-[var(--linea)]'
                      }`}
                    >
                      {source === 'mock' ? 'MOCK (a mano)' : 'REAL (de la base)'}
                    </button>
                  )
                })}
              </div>

              {salidaSource === 'real' && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <select
                    className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
                    value={salidaId}
                    onChange={(event) => setSalidaId(event.target.value)}
                  >
                    <option value="">Elegí una salida…</option>
                    {salidasReales.map((salida) => (
                      <option key={salida.id} value={salida.id}>
                        {salida.nombre} — {salida.destino} ({salida.fecha_inicio})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {salidaSource === 'mock' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--piedra)] mb-1 block">Destino</label>
                    <input
                      className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)]"
                      placeholder="Destino"
                      value={mock.destino}
                      onChange={(event) => setMock({ ...mock, destino: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--piedra)] mb-1 block">Nombre (opcional)</label>
                    <input
                      className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)]"
                      placeholder="Nombre (opcional)"
                      value={mock.nombre}
                      onChange={(event) => setMock({ ...mock, nombre: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--piedra)] mb-1 block">Fecha inicio</label>
                    <input
                      className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)]"
                      type="date"
                      value={mock.fecha_inicio}
                      onChange={(event) => setMock({ ...mock, fecha_inicio: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--piedra)] mb-1 block">Fecha fin</label>
                    <input
                      className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)]"
                      type="date"
                      value={mock.fecha_fin}
                      onChange={(event) => setMock({ ...mock, fecha_fin: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--piedra)] mb-1 block">Precio USD</label>
                    <input
                      className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)]"
                      type="number"
                      placeholder="Precio USD"
                      value={mock.precio_usd}
                      onChange={(event) => setMock({ ...mock, precio_usd: Number(event.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--piedra)] mb-1 block">Cupos</label>
                    <input
                      className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)]"
                      type="number"
                      placeholder="Cupos"
                      value={mock.cupos}
                      onChange={(event) => setMock({ ...mock, cupos: Number(event.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isMolde4 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--linea)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Salidas reales de la agenda (elegí 2 a 4)
              </span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {salidasReales.map((salida) => {
                  const isChecked = salidaIdsMolde4.includes(salida.id)
                  return (
                    <label
                      key={salida.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[var(--cardon-tenue)] text-[var(--tinta)] border-[var(--cardon)]/40 font-medium'
                          : 'bg-[var(--blanco-piedra)] text-[var(--piedra)] border-[var(--linea)] hover:text-[var(--tinta)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setSalidaIdsMolde4((list) => toggleInArray(list, salida.id) as string[])
                        }
                        className="rounded border-[var(--linea)] text-[var(--cardon)] focus:ring-[var(--cardon)]"
                      />
                      <span>
                        {salida.nombre} — {salida.destino} ({salida.fecha_inicio})
                      </span>
                    </label>
                  )
                })}
                {clienteId && salidasReales.length === 0 && (
                  <p className="text-xs text-[var(--piedra)] italic">Este cliente no tiene salidas cargadas.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Visual Settings & Channels Card */}
        {(contentType === 'video' || contentType === 'banner') && (
          <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Tipografías permitidas
              </span>
              <div className="flex flex-wrap gap-2">
                {TYPOGRAPHY_OPTIONS.map((font) => {
                  const isChecked = tipografias.includes(font)
                  return (
                    <button
                      key={font}
                      type="button"
                      onClick={() => setTipografias((list) => toggleInArray(list, font))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40 shadow-xs'
                          : 'bg-[var(--blanco-piedra)] text-[var(--piedra)] hover:text-[var(--tinta)] border-[var(--linea)]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                      <span>{font}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {needsChannels && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--linea)]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  Canales habilitados
                </span>
                <div className="flex flex-wrap gap-2">
                  {CANAL_OPTIONS.map((canal) => {
                    const isChecked = canales.includes(canal)
                    return (
                      <button
                        key={canal}
                        type="button"
                        onClick={() => setCanales((list) => toggleInArray(list, canal))}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40 shadow-xs'
                            : 'bg-[var(--blanco-piedra)] text-[var(--piedra)] hover:text-[var(--tinta)] border-[var(--linea)]'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                        <span>{canal}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {contentType === 'banner' && isNoAiBanner && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--linea)]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  CTA (opcional)
                </span>
                <input
                  className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
                  value={cta}
                  placeholder="ej. Reservá tu lugar hoy"
                  onChange={(event) => setCta(event.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          disabled={loading || !clienteId || (isMolde4 && salidaIdsMolde4.length < 2)}
          onClick={generate}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] shadow-[var(--sombra-alta)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Generando contenido…' : 'Generar'}</span>
        </button>
      </div>

      {/* Result Column */}
      <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-4 min-h-[500px]">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--linea)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
            Resultado
          </span>
          {result !== null && (
            <button
              type="button"
              onClick={copyResult}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--blanco-piedra)] border border-[var(--linea)] text-[var(--tinta)] hover:bg-white transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-[var(--cardon)]" />
                  <span className="text-[var(--cardon)]">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--piedra)]" />
                  <span>Copiar JSON</span>
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!error && !result && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[var(--piedra-clara)] rounded-xl">
            <div className="w-12 h-12 rounded-full bg-[var(--blanco-piedra)] flex items-center justify-center text-[var(--piedra)] mb-3">
              <Sparkles className="w-6 h-6 stroke-1 text-[var(--cardon)]" />
            </div>
            <p className="text-sm font-bold font-display text-[var(--tinta)]">
              Todavía no generaste nada en esta sesión
            </p>
            <p className="text-xs text-[var(--piedra)] mt-1 max-w-xs">
              Configurá el tipo de contenido y el cliente a la izquierda, y presioná &quot;Generar&quot;.
            </p>
          </div>
        )}

        {result !== null && (
          <pre className="bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-xl p-4 font-mono text-[11px] leading-relaxed text-[var(--tinta)] overflow-x-auto max-h-[640px] whitespace-pre-wrap break-words m-0 shadow-inner">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

