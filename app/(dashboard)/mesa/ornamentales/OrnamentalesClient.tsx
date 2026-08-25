'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { DBElement, DBRegion, DBToken, RegionTokens } from '@/types/fabrica'

const OrnamentalElement = dynamic(
  () => import('@/components/fabrica/elements/OrnamentalElement'),
  { ssr: false },
)

interface Props {
  elements: DBElement[]
  regions:  DBRegion[]
  tokens:   DBToken[]
}

const BG      = 'var(--nieve)'
const PANEL   = 'var(--blanco-piedra)'
const BORDER  = 'var(--linea)'
const DIM     = 'var(--piedra)'
const LIGHT   = 'var(--tinta)'
const GREEN   = 'var(--cardon)'

export default function OrnamentalesClient({ elements, regions, tokens }: Props) {
  const router = useRouter()
  const [search,    setSearch]    = useState('')
  const [regionTab, setRegionTab] = useState<string>('all')
  const [archiving, setArchiving] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  // Build token map per region
  const tokensByRegion = useMemo<Record<string, RegionTokens>>(() => {
    const map: Record<string, RegionTokens> = {}
    tokens.forEach(t => {
      if (!map[t.region_id]) map[t.region_id] = {}
      map[t.region_id][t.role] = t.value
    })
    return map
  }, [tokens])

  // Filter elements
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return elements.filter(e => {
      if (regionTab !== 'all' && e.region_id !== regionTab) return false
      if (q) {
        const haystack = [e.species_name, ...(e.tags ?? [])].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [elements, regionTab, search])

  // Group by region
  const grouped = useMemo(() => {
    const map: Record<string, DBElement[]> = {}
    filtered.forEach(e => {
      const key = e.region_id ?? 'sin-region'
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [filtered])

  async function archive(id: string) {
    if (!confirm('Â¿Archivar esta especie? No se rompen templates existentes.')) return
    setArchiving(id)
    await fetch(`/api/mesa/ornamentales/${id}`, { method: 'DELETE' })
    setArchiving(null)
    router.refresh()
  }

  async function duplicate(elem: DBElement) {
    setDuplicating(elem.id)
    const fd = new FormData()
    fd.append('species_name',  `${elem.species_name ?? elem.component_key} (copia)`)
    fd.append('component_key', `${elem.component_key}-copy`)
    fd.append('region_id',     elem.region_id ?? '')
    fd.append('color_mode',    elem.color_mode)
    fd.append('color_map',     JSON.stringify(elem.color_map ?? {}))
    fd.append('tags',          JSON.stringify(elem.tags ?? []))
    fd.append('description',   elem.description ?? '')
    fd.append('asset_url',     elem.asset_url ?? '')
    await fetch('/api/mesa/ornamentales', { method: 'POST', body: fd })
    setDuplicating(null)
    router.refresh()
  }

  const regionName = (id: string | null) =>
    regions.find(r => r.id === id)?.name ?? 'Sin regiÃ³n'

  const cardStyle: React.CSSProperties = {
    backgroundColor: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search + region filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o tagâ€¦"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: LIGHT,
            fontSize: 13,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ id: 'all', name: 'Todas' }, ...regions].map(r => (
            <button
              key={r.id}
              onClick={() => setRegionTab(r.id)}
              style={{
                backgroundColor: regionTab === r.id ? 'rgba(62, 92, 72, .15)' : BG,
                border: `1px solid ${regionTab === r.id ? 'rgba(62, 92, 72, .4)' : BORDER}`,
                borderRadius: 8,
                padding: '7px 14px',
                color: regionTab === r.id ? GREEN : DIM,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {r.name} {r.id !== 'all' && `Â· ${elements.filter(e => e.region_id === r.id).length}`}
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ color: DIM, fontSize: 14, textAlign: 'center', padding: 48 }}>
          No hay ornamentales {search ? 'que coincidan' : 'cargados'}.
        </div>
      )}

      {Object.entries(grouped).map(([regionId, items]) => (
        <div key={regionId}>
          <p style={{
            color: DIM,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            {regionName(regionId === 'sin-region' ? null : regionId)} Â· {items.length} {items.length === 1 ? 'especie' : 'especies'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {items.map(elem => {
              const regionTokens = elem.region_id ? (tokensByRegion[elem.region_id] ?? {}) : {}
              const hasColorMap = Object.keys(elem.color_map ?? {}).length > 0
              return (
                <div key={elem.id} style={cardStyle}>
                  {/* Preview */}
                  <div style={{
                    backgroundColor: regionTokens['bg'] ?? '#110D06',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    minHeight: 160,
                  }}>
                    <OrnamentalElement
                      assetUrl={elem.asset_url ?? undefined}
                      w={120}
                      h={140}
                      colorMode={elem.color_mode}
                      colorMap={hasColorMap ? elem.color_map : undefined}
                      tokens={regionTokens}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div>
                      <p style={{ color: LIGHT, fontSize: 13, fontWeight: 600, margin: 0 }}>
                        {elem.species_name ?? elem.component_key}
                      </p>
                      <p style={{ color: DIM, fontSize: 11, margin: '2px 0 0', fontFamily: 'monospace' }}>
                        {elem.component_key}
                      </p>
                    </div>

                    {(elem.tags ?? []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(elem.tags ?? []).map(tag => (
                          <span key={tag} style={{
                            backgroundColor: 'rgba(62, 92, 72, 0.08)',
                            border: '1px solid rgba(62, 92, 72, 0.2)',
                            borderRadius: 4,
                            padding: '1px 6px',
                            color: '#7DD9A8',
                            fontSize: 10,
                            fontWeight: 600,
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: elem.color_mode === 'tint' ? 'rgba(62, 92, 72, 0.08)' : 'rgba(248,180,0,0.08)',
                      border: `1px solid ${elem.color_mode === 'tint' ? 'rgba(62, 92, 72, 0.2)' : 'rgba(248,180,0,0.2)'}`,
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 10,
                      fontWeight: 600,
                      color: elem.color_mode === 'tint' ? '#7DD9A8' : '#F8B400',
                      alignSelf: 'flex-start',
                    }}>
                      {elem.color_mode === 'tint' ? 'â¬¡ TeÃ±ible' : 'â¬¡ Fijo'}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <a
                        href={`/mesa/ornamentales/${elem.id}/editar`}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          backgroundColor: BG,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 6,
                          padding: '5px 0',
                          color: LIGHT,
                          fontSize: 11,
                          fontWeight: 600,
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Editar
                      </a>
                      <button
                        onClick={() => duplicate(elem)}
                        disabled={duplicating === elem.id}
                        style={{
                          flex: 1,
                          backgroundColor: BG,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 6,
                          padding: '5px 0',
                          color: DIM,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {duplicating === elem.id ? 'â€¦' : 'Duplicar'}
                      </button>
                      <button
                        onClick={() => archive(elem.id)}
                        disabled={archiving === elem.id}
                        style={{
                          backgroundColor: BG,
                          border: '1px solid #3D1515',
                          borderRadius: 6,
                          padding: '5px 8px',
                          color: '#F87171',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {archiving === elem.id ? 'â€¦' : 'âœ•'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
