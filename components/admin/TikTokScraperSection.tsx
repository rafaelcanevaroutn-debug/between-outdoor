'use client'

import { useState } from 'react'
import { Search, Star, Trash2, Eye, Heart, MessageCircle, Share2, TrendingUp, Clock, ExternalLink, Type } from 'lucide-react'
import type { TikTokIntelligence, Niche } from '@/types'

interface Props {
  initialItems: TikTokIntelligence[]
}

const NICHE_OPTIONS = [
  { value: 'trekking', label: 'Trekking' },
  { value: 'running', label: 'Trail Running' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'turismo_aventura', label: 'Turismo Aventura' },
]

const inputStyle = { backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }

function engagementScore(item: TikTokIntelligence) {
  return item.likes + item.comments * 2 + item.shares * 3
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function focusGreen(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--cardon)'
}
function blurGray(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'var(--linea)'
}

export default function TikTokScraperSection({ initialItems }: Props) {
  const [items, setItems] = useState<TikTokIntelligence[]>(initialItems)
  const [niche, setNiche] = useState<Niche>('trekking')
  const [searchQueries, setSearchQueries] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [profiles, setProfiles] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [filterNiche, setFilterNiche] = useState<string>('all')

  const filtered = [...items]
    .filter(item => filterNiche === 'all' || item.nicho === filterNiche)
    .sort((a, b) => engagementScore(b) - engagementScore(a))

  const referenceCount = items.filter(i => i.es_referencia).length

  async function handleScrape() {
    setLoading(true)
    setError('')
    setStatusMsg('Conectando con Apify TikTok Scraper...')

    try {
      const searchList = searchQueries
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const hashtagList = hashtags
        .split(',')
        .map(h => h.trim().replace(/^#/, ''))
        .filter(Boolean)
      const profileList = profiles
        .split(',')
        .map(p => p.trim().replace(/^@/, ''))
        .filter(Boolean)

      setStatusMsg('Scrapeando TikTok... esto puede tardar 1-2 minutos.')

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, searchQueries: searchList, hashtags: hashtagList, profiles: profileList }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al scrapear')

      setStatusMsg(`Se importaron ${data.count} videos. Cargando resultados...`)

      // Fetch only the scraped niche and replace those items â€” keep other niches intact
      const itemsRes = await fetch(`/api/scrape?niche=${niche}`)
      if (itemsRes.ok) {
        const fresh: TikTokIntelligence[] = await itemsRes.json()
        setItems(prev => [...prev.filter(i => i.nicho !== niche), ...fresh])
      }

      setStatusMsg('')
      setSearchQueries('')
      setHashtags('')
      setProfiles('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatusMsg('')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleRef(id: string, current: boolean) {
    const res = await fetch(`/api/scrape?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ es_referencia: !current }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, es_referencia: !current } : i))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Â¿Eliminar este ejemplo de la base de inteligencia?')) return
    const res = await fetch(`/api/scrape?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Section header */}
      <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--linea)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)' }}>
          <TrendingUp className="w-4 h-4" style={{ color: '#14B8A6' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--tinta)' }}>Inteligencia de contenido TikTok</h2>
          <p className="text-xs" style={{ color: 'var(--piedra)' }}>
            Analiza patrones de contenido que performa â€” solo para aprendizaje interno, no para republicar
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--piedra)' }}>En referencia</p>
            <p className="text-lg font-bold" style={{ color: '#14B8A6' }}>{referenceCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--piedra)' }}>Total importados</p>
            <p className="text-lg font-bold" style={{ color: 'var(--tinta)' }}>{items.length}</p>
          </div>
        </div>
      </div>

      {/* Scrape form */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
        <p className="text-sm font-medium mb-4" style={{ color: 'var(--tinta)' }}>Importar nuevos datos</p>

        {/* Row 1: nicho + bÃºsqueda libre */}
        <div className="grid grid-cols-1 gap-4 mb-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--piedra)' }}>Nicho</label>
            <select
              value={niche}
              onChange={e => setNiche(e.target.value as Niche)}
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none"
              style={inputStyle}
              onFocus={focusGreen}
              onBlur={blurGray}
            >
              {NICHE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <label className="text-xs font-medium" style={{ color: 'var(--piedra)' }}>
              BÃºsqueda libre{' '}
              <span style={{ color: 'var(--piedra)' }}>(usa el buscador de TikTok â€” separar por coma)</span>
            </label>
            <input
              type="text"
              value={searchQueries}
              onChange={e => setSearchQueries(e.target.value)}
              placeholder="trekking patagonia, senderismo argentina, trail running"
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none"
              style={inputStyle}
              onFocus={focusGreen}
              onBlur={blurGray}
            />
          </div>
        </div>

        {/* Row 2: hashtags + perfiles (opcionales) */}
        <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--piedra)' }}>
              Hashtags <span style={{ color: 'var(--piedra)' }}>(opcional, sin #)</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="trekking, montaÃ±a, patagonia"
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none"
              style={inputStyle}
              onFocus={focusGreen}
              onBlur={blurGray}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--piedra)' }}>
              Perfiles <span style={{ color: 'var(--piedra)' }}>(opcional, sin @)</span>
            </label>
            <input
              type="text"
              value={profiles}
              onChange={e => setProfiles(e.target.value)}
              placeholder="username1, username2"
              className="px-3 py-2.5 rounded-lg text-sm focus:outline-none"
              style={inputStyle}
              onFocus={focusGreen}
              onBlur={blurGray}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68,0.1)', border: '1px solid rgba(239, 68, 68,0.3)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {statusMsg && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: '#14B8A6' }}>
            {statusMsg}
          </div>
        )}

        <button
          onClick={handleScrape}
          disabled={loading || (!searchQueries.trim() && !hashtags.trim() && !profiles.trim())}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity"
          style={{
            backgroundColor: loading ? 'var(--linea)' : '#14B8A6',
            color: loading ? 'var(--piedra)' : 'var(--nieve)',
            opacity: (!searchQueries.trim() && !hashtags.trim() && !profiles.trim()) ? 0.4 : 1,
            cursor: loading || (!searchQueries.trim() && !hashtags.trim() && !profiles.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          <Search className="w-4 h-4" />
          {loading ? 'Scrapeando TikTok...' : 'Scrapear TikTok'}
        </button>

        <p className="mt-3 text-xs" style={{ color: 'var(--piedra)' }}>
          Solo data pÃºblica Â· Solo para anÃ¡lisis de patrones Â· No republicar
        </p>
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium" style={{ color: 'var(--piedra)' }}>Filtrar por nicho:</p>
          <select
            value={filterNiche}
            onChange={e => setFilterNiche(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ ...inputStyle, width: 'auto' }}
            onFocus={focusGreen}
            onBlur={blurGray}
          >
            <option value="all">Todos</option>
            {NICHE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs ml-auto" style={{ color: 'var(--piedra)' }}>
            Ordenados por engagement Â· Los marcados con â˜… alimentan al motor de Gemini
          </p>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center rounded-xl" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
          <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--linea)' }} />
          <p className="text-sm" style={{ color: 'var(--piedra)' }}>
            {items.length === 0
              ? 'TodavÃ­a no hay datos scrapeados. IngresÃ¡ hashtags y hacÃ© clic en "Scrapear TikTok".'
              : 'Sin resultados para el filtro seleccionado.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const score = engagementScore(item)
            return (
              <div
                key={item.id}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: 'var(--blanco-piedra)',
                  border: `1px solid ${item.es_referencia ? 'rgba(20,184,166,0.4)' : 'var(--linea)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--piedra-clara)', color: 'var(--piedra)' }}>
                      {NICHE_OPTIONS.find(o => o.value === item.nicho)?.label || item.nicho}
                    </span>
                    {item.source_query && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--nieve)', color: 'var(--piedra)' }}>
                        {item.source_query}
                      </span>
                    )}
                    {item.duracion && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--piedra)' }}>
                        <Clock className="w-3 h-3" />
                        {item.duracion}s
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleRef(item.id, item.es_referencia)}
                      title={item.es_referencia ? 'Quitar de referencia del motor' : 'Usar como referencia para Gemini'}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: item.es_referencia ? 'rgba(20,184,166,0.15)' : 'var(--piedra-clara)',
                        color: item.es_referencia ? '#14B8A6' : 'var(--piedra)',
                        border: `1px solid ${item.es_referencia ? 'rgba(20,184,166,0.3)' : 'var(--linea)'}`,
                      }}
                    >
                      <Star className="w-3 h-3" fill={item.es_referencia ? '#14B8A6' : 'none'} />
                      {item.es_referencia ? 'Referencia activa' : 'Usar como referencia'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                      style={{ color: 'var(--piedra)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--piedra)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body: thumbnail + content */}
                <div className="flex gap-3 mb-3">
                  {/* Thumbnail */}
                  {item.thumbnail_url && (
                    <div className="shrink-0 w-16 h-24 rounded-lg overflow-hidden" style={{ border: '1px solid var(--linea)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail_url}
                        alt="miniatura"
                        className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Caption */}
                    <p className="text-sm leading-relaxed line-clamp-3" style={{ color: '#D1FAE5' }}>
                      {item.caption || <span style={{ color: 'var(--piedra)' }}>Sin caption</span>}
                    </p>

                    {/* Texto miniatura extraÃ­do por Gemini Vision */}
                    {item.texto_miniatura && (
                      <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
                        <Type className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#14B8A6' }} />
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--cardon-tenue)' }}>
                          <span className="font-medium" style={{ color: '#14B8A6' }}>Hook/texto: </span>
                          {item.texto_miniatura}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hashtags */}
                {item.hashtags && item.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.hashtags.slice(0, 10).map((tag, i) => (
                      <span key={`${tag}-${i}`} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--piedra-clara)', color: 'var(--piedra)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--piedra)' }}>
                    <Eye className="w-3 h-3" />
                    {formatNumber(item.views)}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--piedra)' }}>
                    <Heart className="w-3 h-3" />
                    {formatNumber(item.likes)}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--piedra)' }}>
                    <MessageCircle className="w-3 h-3" />
                    {formatNumber(item.comments)}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--piedra)' }}>
                    <Share2 className="w-3 h-3" />
                    {formatNumber(item.shares)}
                  </span>
                  <span className="flex items-center gap-1 text-xs ml-auto font-medium" style={{ color: 'var(--cardon)' }}>
                    <TrendingUp className="w-3 h-3" />
                    {formatNumber(score)} eng
                  </span>
                  {item.video_url && (
                    <a
                      href={item.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs transition-colors"
                      style={{ color: 'var(--piedra)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#14B8A6' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--piedra)' }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      ver video
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

