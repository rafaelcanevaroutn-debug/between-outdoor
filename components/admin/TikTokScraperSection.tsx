'use client'

import { useState } from 'react'
import {
  Search,
  Star,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Clock,
  ExternalLink,
  Type,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
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

function engagementScore(item: TikTokIntelligence) {
  return item.likes + item.comments * 2 + item.shares * 3
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
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
    .filter((item) => filterNiche === 'all' || item.nicho === filterNiche)
    .sort((a, b) => engagementScore(b) - engagementScore(a))

  const referenceCount = items.filter((i) => i.es_referencia).length

  async function handleScrape() {
    setLoading(true)
    setError('')
    setStatusMsg('Conectando con Apify TikTok Scraper...')

    try {
      const searchList = searchQueries
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const hashtagList = hashtags
        .split(',')
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean)
      const profileList = profiles
        .split(',')
        .map((p) => p.trim().replace(/^@/, ''))
        .filter(Boolean)

      setStatusMsg('Scrapeando TikTok... esto puede tardar 1-2 minutos.')

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          searchQueries: searchList,
          hashtags: hashtagList,
          profiles: profileList,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al scrapear')

      setStatusMsg(`Se importaron ${data.count} videos. Cargando resultados...`)

      const itemsRes = await fetch(`/api/scrape?niche=${niche}`)
      if (itemsRes.ok) {
        const fresh: TikTokIntelligence[] = await itemsRes.json()
        setItems((prev) => [...prev.filter((i) => i.nicho !== niche), ...fresh])
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
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, es_referencia: !current } : i))
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este ejemplo de la base de inteligencia?')) return
    const res = await fetch(`/api/scrape?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--linea)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--cardon-tenue)] border border-[var(--cardon)]/40 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-[var(--cardon)]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-[var(--tinta)] tracking-[-0.02em] m-0">
              Inteligencia de contenido TikTok
            </h2>
            <p className="text-xs text-[var(--piedra)] mt-0.5">
              Analiza patrones de contenido que performa — solo para aprendizaje interno, no para republicar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              En referencia
            </p>
            <p className="text-xl font-bold font-display text-[var(--cardon)]">
              {referenceCount}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Total importados
            </p>
            <p className="text-xl font-bold font-display text-[var(--tinta)]">
              {items.length}
            </p>
          </div>
        </div>
      </div>

      {/* Scrape Form Card */}
      <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-4">
        <h3 className="font-display font-bold text-sm text-[var(--tinta)] m-0">
          Importar nuevos datos
        </h3>

        {/* Row 1: Nicho + Búsqueda libre */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Nicho
            </label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value as Niche)}
              className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer"
            >
              {NICHE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Búsqueda libre <span className="text-[10px] normal-case font-normal">(usa el buscador de TikTok — separar por coma)</span>
            </label>
            <input
              type="text"
              value={searchQueries}
              onChange={(e) => setSearchQueries(e.target.value)}
              placeholder="trekking patagonia, senderismo argentina, trail running"
              className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
            />
          </div>
        </div>

        {/* Row 2: Hashtags + Perfiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Hashtags <span className="text-[10px] normal-case font-normal">(opcional, sin #)</span>
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="trekking, montaña, patagonia"
              className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Perfiles <span className="text-[10px] normal-case font-normal">(opcional, sin @)</span>
            </label>
            <input
              type="text"
              value={profiles}
              onChange={(e) => setProfiles(e.target.value)}
              placeholder="username1, username2"
              className="w-full bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-lg px-3 py-2 text-xs text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {statusMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--cardon-tenue)] border border-[var(--cardon)]/40 text-[var(--cardon)] text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleScrape}
            disabled={loading || (!searchQueries.trim() && !hashtags.trim() && !profiles.trim())}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Scrapeando TikTok...' : 'Scrapear TikTok'}</span>
          </button>

          <span className="text-[11px] text-[var(--piedra)]">
            Solo data pública · Solo para análisis de patrones · No republicar
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--piedra)]">Filtrar por nicho:</span>
            <select
              value={filterNiche}
              onChange={(e) => setFilterNiche(e.target.value)}
              className="bg-white border border-[var(--linea)] rounded-lg px-3 py-1.5 text-xs text-[var(--tinta)] focus:outline-none focus:border-[var(--cardon)] transition-all cursor-pointer shadow-xs"
            >
              <option value="all">Todos</option>
              {NICHE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-[var(--piedra)]">
            Ordenados por engagement · Los marcados con ★ alimentan al motor de Gemini
          </span>
        </div>
      )}

      {/* Results List */}
      {filtered.length === 0 ? (
        <div className="surface-card bg-white rounded-2xl border-dashed border-2 border-[var(--piedra-clara)] p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--blanco-piedra)] flex items-center justify-center text-[var(--piedra)] mb-3">
            <TrendingUp className="w-6 h-6 stroke-1 text-[var(--cardon)]" />
          </div>
          <p className="text-sm font-bold font-display text-[var(--tinta)]">
            {items.length === 0
              ? 'Todavía no hay datos scrapeados'
              : 'Sin resultados para el filtro seleccionado'}
          </p>
          <p className="text-xs text-[var(--piedra)] mt-1 max-w-sm">
            {items.length === 0
              ? 'Ingresá hashtags o términos de búsqueda arriba y hacé clic en "Scrapear TikTok".'
              : 'Probá seleccionando otro nicho en el desplegable de filtros.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => {
            const score = engagementScore(item)
            return (
              <article
                key={item.id}
                className={`surface-card bg-white rounded-2xl p-5 border transition-all hover:shadow-[var(--sombra-alta)] flex flex-col gap-3.5 ${
                  item.es_referencia
                    ? 'border-[var(--cardon)] shadow-[var(--sombra-reposo)]'
                    : 'border-[var(--linea)] shadow-[var(--sombra-reposo)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[var(--blanco-piedra)] text-[var(--piedra)] border border-[var(--linea)]">
                      {NICHE_OPTIONS.find((o) => o.value === item.nicho)?.label || item.nicho}
                    </span>
                    {item.source_query && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-[var(--blanco-piedra)]/60 text-[var(--piedra)] border border-[var(--linea)]">
                        {item.source_query}
                      </span>
                    )}
                    {item.duracion && (
                      <span className="text-xs text-[var(--piedra)] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {item.duracion}s
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRef(item.id, item.es_referencia)}
                      title={
                        item.es_referencia
                          ? 'Quitar de referencia del motor'
                          : 'Usar como referencia para Gemini'
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        item.es_referencia
                          ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border border-[var(--cardon)]/40 shadow-xs'
                          : 'bg-[var(--blanco-piedra)] text-[var(--piedra)] hover:text-[var(--tinta)] border border-[var(--linea)]'
                      }`}
                    >
                      <Star
                        className="w-3.5 h-3.5"
                        fill={item.es_referencia ? 'var(--cardon)' : 'none'}
                      />
                      <span>{item.es_referencia ? 'Referencia activa' : 'Usar como referencia'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-[var(--piedra)] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Eliminar de la base"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body: Thumbnail + Content */}
                <div className="flex gap-4">
                  {item.thumbnail_url && (
                    <div className="shrink-0 w-16 sm:w-20 h-24 sm:h-28 rounded-xl overflow-hidden border border-[var(--linea)] bg-[var(--blanco-piedra)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail_url}
                        alt="miniatura"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                    {/* Caption in clean, readable dark ink */}
                    <p className="text-xs sm:text-sm text-[var(--tinta)] leading-relaxed line-clamp-3 font-normal">
                      {item.caption || <span className="text-[var(--piedra)] italic">Sin caption</span>}
                    </p>

                    {/* Extracted Thumbnail Hook */}
                    {item.texto_miniatura && (
                      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--blanco-piedra)]/70 border border-[var(--linea)]">
                        <Type className="w-3.5 h-3.5 text-[var(--cardon)] mt-0.5 shrink-0" />
                        <p className="text-xs leading-relaxed text-[var(--tinta)]">
                          <strong className="font-semibold text-[var(--cardon)]">Hook en portada: </strong>
                          {item.texto_miniatura}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hashtags */}
                {item.hashtags && item.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.hashtags.slice(0, 10).map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--blanco-piedra)] text-[var(--piedra)] border border-[var(--linea)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metrics Footer */}
                <div className="flex items-center gap-4 pt-2 border-t border-[var(--linea)] text-xs text-[var(--piedra)]">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{formatNumber(item.views)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{formatNumber(item.likes)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{formatNumber(item.comments)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{formatNumber(item.shares)}</span>
                  </span>

                  <span className="flex items-center gap-1 ml-auto font-bold text-[var(--cardon)]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{formatNumber(score)} eng</span>
                  </span>

                  {item.video_url && (
                    <a
                      href={item.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[var(--piedra)] hover:text-[var(--cardon)] font-medium transition-colors ml-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver video</span>
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

