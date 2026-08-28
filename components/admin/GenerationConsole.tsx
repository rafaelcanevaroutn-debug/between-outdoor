'use client'

import { useState } from 'react'
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

interface Cliente { id: string; full_name: string | null; company_name: string | null; niche: string }
interface SalidaOption { id: string; nombre: string; destino: string; fecha_inicio: string; estado: string }

const FIELD_STYLE: React.CSSProperties = {
  background: '#0B110C', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8,
  color: '#EAF2EC', fontSize: 12, padding: '7px 9px', width: '100%',
}
const LABEL_STYLE: React.CSSProperties = { color: '#7E9286', fontSize: 11, marginBottom: 4, display: 'block' }
const SECTION_STYLE: React.CSSProperties = {
  background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: 16,
  display: 'flex', flexDirection: 'column', gap: 10,
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value]
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
    destino: 'El Chaltén', nombre: '', fecha_inicio: '', fecha_fin: '',
    precio_usd: 500, cupos: 10, nivel: 'media', moneda: 'USD', tipo_viaje: 'expedicion_premium',
  })
  const [tipografias, setTipografias] = useState<string[]>(['Inter', 'Playfair Display'])
  const [canales, setCanales] = useState<string[]>(['WhatsApp'])
  const [cta, setCta] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)

  const isMolde4 = contentType === 'banner' && moldType === 4
  const needsChannels = (contentType === 'video' && (videoSubfamilia === '4' || videoSubfamilia === '5'))
    || (contentType === 'banner' && !isMolde4)
  const isStub1c = contentType === 'video' && videoSubfamilia === '1c'
  const isNoAiBanner = contentType === 'banner' && BANNER_MOLDES.find(m => m.value === moldType)?.noAi

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
        payload = { ...payload, subfamilia: videoSubfamilia, tipografiasPermitidas: tipografias, canalesHabilitados: canales }
      } else if (contentType === 'banner') {
        url = '/api/admin/generate/banner'
        payload = { ...payload, moldType, tipografiasPermitidas: tipografias, canalesHabilitados: canales, cta: cta || undefined }
        if (isMolde4) payload.salidaIds = salidaIdsMolde4
      } else {
        url = '/api/admin/generate/carrusel'
        payload = { ...payload, formato: carruselFormato }
      }

      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Error al generar')
      setResult(json)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al generar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={SECTION_STYLE}>
          <span style={LABEL_STYLE}>Tipo de contenido</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['video', 'banner', 'carrusel'] as ContentType[]).map(type => (
              <button key={type} type="button" onClick={() => setContentType(type)} style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${contentType === type ? 'rgba(52,209,126,.4)' : 'rgba(255,255,255,.08)'}`,
                background: contentType === type ? 'rgba(52,209,126,.12)' : 'transparent',
                color: contentType === type ? '#34D17E' : '#A7B5AC',
              }}>
                {type === 'video' ? 'Video' : type === 'banner' ? 'Banner / Flyer' : 'Carrusel'}
              </button>
            ))}
          </div>

          {contentType === 'video' && (
            <div>
              <span style={LABEL_STYLE}>Subfamilia (13)</span>
              <select style={FIELD_STYLE} value={videoSubfamilia} onChange={event => setVideoSubfamilia(event.target.value)}>
                {VIDEO_SUBFAMILIA_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.value} — {option.label}</option>
                ))}
              </select>
              {isStub1c && (
                <p style={{ color: '#fbbf24', fontSize: 11, margin: '6px 0 0' }}>
                  1c es un stub sin IA (nunca llama Gemini, devuelve campos vacíos). Origen no confirmado en el repo — se incluye igual, marcado.
                </p>
              )}
            </div>
          )}

          {contentType === 'banner' && (
            <div>
              <span style={LABEL_STYLE}>Molde (6)</span>
              <select style={FIELD_STYLE} value={moldType} onChange={event => setMoldType(Number(event.target.value))}>
                {BANNER_MOLDES.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {isNoAiBanner && (
                <p style={{ color: '#7E9286', fontSize: 11, margin: '6px 0 0' }}>Este molde no usa IA — composición determinística a partir de la salida.</p>
              )}
            </div>
          )}

          {contentType === 'carrusel' && (
            <div>
              <span style={LABEL_STYLE}>Formato (6 adaptativos + 3 promo)</span>
              <select style={FIELD_STYLE} value={carruselFormato} onChange={event => setCarruselFormato(event.target.value)}>
                {CARRUSEL_FORMATOS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p style={{ color: '#526159', fontSize: 10, margin: '6px 0 0' }}>
                El formato editorial legacy queda fuera de este modo (pasa por el pipeline mixto video/carrusel/flyer).
              </p>
            </div>
          )}
        </div>

        <div style={SECTION_STYLE}>
          <span style={LABEL_STYLE}>Cliente real (aporta niche, onboarding y branding)</span>
          <select style={FIELD_STYLE} value={clienteId} onChange={event => loadSalidas(event.target.value)}>
            <option value="">Elegí un cliente…</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.company_name || cliente.full_name || cliente.id} ({cliente.niche})
              </option>
            ))}
          </select>

          {!isMolde4 && (
            <>
              <span style={LABEL_STYLE}>Fuente de la salida</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['mock', 'real'] as const).map(source => (
                  <button key={source} type="button" onClick={() => setSalidaSource(source)} style={{
                    flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${salidaSource === source ? 'rgba(52,209,126,.4)' : 'rgba(255,255,255,.08)'}`,
                    background: salidaSource === source ? 'rgba(52,209,126,.12)' : 'transparent',
                    color: salidaSource === source ? '#34D17E' : '#A7B5AC',
                  }}>
                    {source === 'mock' ? 'MOCK (a mano)' : 'REAL (de la base)'}
                  </button>
                ))}
              </div>

              {salidaSource === 'real' && (
                <select style={FIELD_STYLE} value={salidaId} onChange={event => setSalidaId(event.target.value)}>
                  <option value="">Elegí una salida…</option>
                  {salidasReales.map(salida => (
                    <option key={salida.id} value={salida.id}>{salida.nombre} — {salida.destino} ({salida.fecha_inicio})</option>
                  ))}
                </select>
              )}

              {salidaSource === 'mock' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input style={FIELD_STYLE} placeholder="Destino" value={mock.destino} onChange={event => setMock({ ...mock, destino: event.target.value })} />
                  <input style={FIELD_STYLE} placeholder="Nombre (opcional)" value={mock.nombre} onChange={event => setMock({ ...mock, nombre: event.target.value })} />
                  <input style={FIELD_STYLE} type="date" placeholder="Fecha inicio" value={mock.fecha_inicio} onChange={event => setMock({ ...mock, fecha_inicio: event.target.value })} />
                  <input style={FIELD_STYLE} type="date" placeholder="Fecha fin" value={mock.fecha_fin} onChange={event => setMock({ ...mock, fecha_fin: event.target.value })} />
                  <input style={FIELD_STYLE} type="number" placeholder="Precio USD" value={mock.precio_usd} onChange={event => setMock({ ...mock, precio_usd: Number(event.target.value) })} />
                  <input style={FIELD_STYLE} type="number" placeholder="Cupos" value={mock.cupos} onChange={event => setMock({ ...mock, cupos: Number(event.target.value) })} />
                </div>
              )}
            </>
          )}

          {isMolde4 && (
            <div>
              <span style={LABEL_STYLE}>Salidas reales de la agenda (elegí 2 a 4)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                {salidasReales.map(salida => (
                  <label key={salida.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#C5D0C8' }}>
                    <input
                      type="checkbox"
                      checked={salidaIdsMolde4.includes(salida.id)}
                      onChange={() => setSalidaIdsMolde4(list => toggleInArray(list, salida.id) as string[])}
                    />
                    {salida.nombre} — {salida.destino} ({salida.fecha_inicio})
                  </label>
                ))}
                {clienteId && salidasReales.length === 0 && <p style={{ color: '#526159', fontSize: 11 }}>Este cliente no tiene salidas cargadas.</p>}
              </div>
            </div>
          )}
        </div>

        {(contentType === 'video' || contentType === 'banner') && (
          <div style={SECTION_STYLE}>
            <span style={LABEL_STYLE}>Tipografías permitidas</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TYPOGRAPHY_OPTIONS.map(font => (
                <label key={font} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: '#C5D0C8' }}>
                  <input type="checkbox" checked={tipografias.includes(font)} onChange={() => setTipografias(list => toggleInArray(list, font))} />
                  {font}
                </label>
              ))}
            </div>

            {needsChannels && (
              <>
                <span style={LABEL_STYLE}>Canales habilitados</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {CANAL_OPTIONS.map(canal => (
                    <label key={canal} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: '#C5D0C8' }}>
                      <input type="checkbox" checked={canales.includes(canal)} onChange={() => setCanales(list => toggleInArray(list, canal))} />
                      {canal}
                    </label>
                  ))}
                </div>
              </>
            )}

            {contentType === 'banner' && isNoAiBanner && (
              <div>
                <span style={LABEL_STYLE}>CTA (opcional)</span>
                <input style={FIELD_STYLE} value={cta} onChange={event => setCta(event.target.value)} />
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={loading || !clienteId || (isMolde4 && salidaIdsMolde4.length < 2)}
          onClick={generate}
          style={{
            border: '1px solid rgba(52,209,126,.4)', background: 'rgba(52,209,126,.14)', color: '#34D17E',
            borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', opacity: (!clienteId || (isMolde4 && salidaIdsMolde4.length < 2)) ? 0.5 : 1,
          }}
        >
          {loading ? 'Generando…' : 'Generar'}
        </button>
      </div>

      <div style={SECTION_STYLE}>
        <span style={LABEL_STYLE}>Resultado</span>
        {error && <p role="alert" style={{ color: '#fb7185', fontSize: 12, margin: 0 }}>{error}</p>}
        {!error && !result && <p style={{ color: '#526159', fontSize: 12, margin: 0 }}>Todavía no generaste nada en esta sesión.</p>}
        {result !== null && (
          <pre style={{
            background: '#050805', borderRadius: 8, padding: 12, fontSize: 11, color: '#C5D0C8',
            overflowX: 'auto', maxHeight: 560, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
