'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { DBRegion, DBToken, DBElement, RegionTokens } from '@/types/fabrica'
import { extractCssVars } from '@/components/fabrica/elements/OrnamentalElement'

const OrnamentalElement = dynamic(
  () => import('@/components/fabrica/elements/OrnamentalElement'),
  { ssr: false },
)

// Sanitize SVG client-side before preview/upload
function sanitizeSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface Props {
  regions:        DBRegion[]
  tokens:         DBToken[]
  initialElement?: DBElement   // for edit mode
}

const BG      = 'var(--nieve)'
const PANEL   = 'var(--blanco-piedra)'
const BORDER  = 'var(--linea)'
const DIM     = 'var(--piedra)'
const LIGHT   = 'var(--tinta)'
const GREEN   = 'var(--cardon)'

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: '7px 10px',
  color: LIGHT,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: DIM,
  marginBottom: 4,
  display: 'block',
}

export default function NuevoOrnamentalClient({ regions, tokens, initialElement }: Props) {
  const router = useRouter()
  const isEdit = !!initialElement

  const [svgFile,     setSvgFile]     = useState<File | null>(null)
  const [svgText,     setSvgText]     = useState<string | null>(null)
  const [detectedVars, setDetectedVars] = useState<string[]>([])

  const [speciesName,  setSpeciesName]  = useState(initialElement?.species_name ?? '')
  const [componentKey, setComponentKey] = useState(initialElement?.component_key ?? '')
  const [regionId,     setRegionId]     = useState(initialElement?.region_id ?? (regions[0]?.id ?? ''))
  const [colorMode,    setColorMode]    = useState<'tint' | 'fixed'>(initialElement?.color_mode ?? 'tint')
  const [colorMap,     setColorMap]     = useState<Record<string, string>>(initialElement?.color_map ?? {})
  const [tagsInput,    setTagsInput]    = useState((initialElement?.tags ?? []).join(', '))
  const [description,  setDescription]  = useState(initialElement?.description ?? '')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Resolve region tokens
  const regionTokens = useMemo<RegionTokens>(() => {
    const map: RegionTokens = {}
    tokens.filter(t => t.region_id === regionId).forEach(t => { map[t.role] = t.value })
    return map
  }, [tokens, regionId])

  const tokenRoles = useMemo(() =>
    [...new Set(tokens.filter(t => t.region_id === regionId).map(t => t.role))],
    [tokens, regionId],
  )

  // Parse SVG when file selected
  const onFileChange = useCallback(async (file: File | null) => {
    if (!file) return
    setSvgFile(file)
    const text = sanitizeSvg(await file.text())
    setSvgText(text)
    const vars = extractCssVars(text)
    setDetectedVars(vars)
    // Auto-init colorMap with first token role
    setColorMap(prev => {
      const next = { ...prev }
      vars.forEach(v => { if (!next[v]) next[v] = tokenRoles[0] ?? '' })
      return next
    })
    // Auto-fill name/slug from filename
    if (!speciesName) {
      const base = file.name.replace(/\.svg$/i, '')
      setSpeciesName(base.replace(/-/g, ' '))
      setComponentKey(slugify(base))
    }
  }, [tokenRoles, speciesName])

  function onNameBlur() {
    if (speciesName && !componentKey) {
      setComponentKey(slugify(speciesName))
    }
  }

  // Resolved inline vars for live preview
  const resolvedVars = useMemo<React.CSSProperties>(() => {
    if (colorMode !== 'tint') return {}
    const vars: Record<string, string> = {}
    Object.entries(colorMap).forEach(([cssVar, tokenOrHex]) => {
      vars[cssVar] = regionTokens[tokenOrHex] ?? tokenOrHex
    })
    return vars as React.CSSProperties
  }, [colorMap, regionTokens, colorMode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isEdit && !svgFile) { setError('SeleccionÃ¡ un archivo SVG'); return }
    if (!speciesName.trim()) { setError('El nombre es requerido'); return }
    if (!componentKey.trim()) { setError('El slug es requerido'); return }

    setSubmitting(true)
    const fd = new FormData()
    if (svgFile) fd.append('svgFile', svgFile)
    fd.append('species_name',  speciesName.trim())
    fd.append('component_key', slugify(componentKey))
    fd.append('region_id',     regionId)
    fd.append('color_mode',    colorMode)
    fd.append('color_map',     JSON.stringify(colorMode === 'tint' ? colorMap : {}))
    fd.append('tags',          JSON.stringify(tagsInput.split(',').map(s => s.trim()).filter(Boolean)))
    fd.append('description',   description)
    if (initialElement?.asset_url) fd.append('asset_url', initialElement.asset_url)

    const url = isEdit
      ? `/api/mesa/ornamentales/${initialElement!.id}`
      : '/api/mesa/ornamentales'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, { method, body: fd })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al guardar'); setSubmitting(false); return }

    router.push('/mesa/ornamentales')
    router.refresh()
  }

  const previewSvg = svgText ?? (isEdit ? undefined : null)
  const previewUrl = !svgText && isEdit ? (initialElement?.asset_url ?? undefined) : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: LIGHT, fontSize: 18, fontWeight: 700, margin: 0 }}>
            {isEdit ? `Editar Â· ${initialElement?.species_name}` : 'Nueva especie'}
          </h1>
          <p style={{ color: DIM, fontSize: 13, margin: '2px 0 0' }}>
            {isEdit ? 'Actualizar ornamental' : 'Cargar un ornamental al herbario'}
          </p>
        </div>
        <a href="/mesa/ornamentales" style={{
          backgroundColor: 'transparent',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: '8px 16px',
          color: DIM,
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
        }}>
          â† Herbario
        </a>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>

          {/* â”€â”€ Left: Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* SVG upload */}
            <div style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
              <span style={labelStyle}>Archivo SVG</span>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                border: `2px dashed ${svgFile ? GREEN : BORDER}`,
                borderRadius: 8,
                padding: '24px 16px',
                cursor: 'pointer',
                backgroundColor: svgFile ? 'rgba(62, 92, 72, 0.05)' : BG,
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 28 }}>ðŸŒ¿</span>
                <span style={{ color: svgFile ? GREEN : DIM, fontSize: 13, fontWeight: 500 }}>
                  {svgFile ? svgFile.name : isEdit ? 'Reemplazar SVG (opcional)' : 'Clic para elegir un SVG'}
                </span>
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={e => onFileChange(e.target.files?.[0] ?? null)}
                />
              </label>
              {detectedVars.length > 0 && (
                <p style={{ color: DIM, fontSize: 11, marginTop: 8, marginBottom: 0 }}>
                  Variables CSS detectadas: {detectedVars.join(', ')}
                </p>
              )}
            </div>

            {/* Nombre + Slug */}
            <div style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={labelStyle}>Nombre de especie</span>
                <input
                  style={inputStyle}
                  value={speciesName}
                  onChange={e => setSpeciesName(e.target.value)}
                  onBlur={onNameBlur}
                  placeholder="ej. CardÃ³n, Lenga, Jarilla"
                />
              </div>
              <div>
                <span style={labelStyle}>Slug (component_key)</span>
                <input
                  style={{ ...inputStyle, fontFamily: 'monospace' }}
                  value={componentKey}
                  onChange={e => setComponentKey(e.target.value)}
                  placeholder="ej. cardon"
                />
              </div>
            </div>

            {/* RegiÃ³n + Modo */}
            <div style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <span style={labelStyle}>RegiÃ³n</span>
                <select
                  style={inputStyle}
                  value={regionId}
                  onChange={e => setRegionId(e.target.value)}
                >
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <span style={labelStyle}>Modo de color</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['tint', 'fixed'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setColorMode(m)}
                      style={{
                        flex: 1,
                        backgroundColor: colorMode === m ? 'rgba(62, 92, 72, 0.12)' : BG,
                        border: `1px solid ${colorMode === m ? 'rgba(62, 92, 72, 0.4)' : BORDER}`,
                        borderRadius: 6,
                        padding: '7px 0',
                        color: colorMode === m ? GREEN : DIM,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {m === 'tint' ? 'TeÃ±ir' : 'Fijo'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags + DescripciÃ³n */}
            <div style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={labelStyle}>Tags (separados por coma)</span>
                <input
                  style={inputStyle}
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="ej. cactus, puna, vertical"
                />
              </div>
              <div>
                <span style={labelStyle}>DescripciÃ³n (opcional)</span>
                <textarea
                  style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Nota del artista sobre la especieâ€¦"
                />
              </div>
            </div>

            {/* Mapeo de color (only for tint) */}
            {colorMode === 'tint' && detectedVars.length > 0 && (
              <div style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ ...labelStyle, marginBottom: 0 }}>Mapeo de color</p>
                  <p style={{ color: DIM, fontSize: 11, marginTop: 4 }}>
                    ElegÃ­ quÃ© token de la regiÃ³n alimenta cada variable CSS del SVG.
                  </p>
                </div>
                {detectedVars.map(cssVar => (
                  <div key={cssVar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: LIGHT, fontSize: 12, fontFamily: 'monospace', backgroundColor: BG, padding: '4px 8px', borderRadius: 4 }}>
                      {cssVar}
                    </span>
                    <select
                      style={{ ...inputStyle, fontSize: 12 }}
                      value={colorMap[cssVar] ?? ''}
                      onChange={e => setColorMap(prev => ({ ...prev, [cssVar]: e.target.value }))}
                    >
                      <option value="">â€” sin mapeo â€”</option>
                      {tokenRoles.map(role => (
                        <option key={role} value={role}>
                          {role} ({regionTokens[role] ?? 'â€”'})
                        </option>
                      ))}
                      <option value="custom">Color fijoâ€¦</option>
                    </select>
                    {colorMap[cssVar] === 'custom' && (
                      <input
                        type="color"
                        style={{ gridColumn: '2', height: 32, width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer', padding: 2 }}
                        onChange={e => setColorMap(prev => ({ ...prev, [cssVar]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p style={{ color: '#F87171', fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: submitting ? 'var(--linea)' : GREEN,
                color: submitting ? GREEN : BG,
                border: 'none',
                borderRadius: 10,
                padding: '12px 0',
                fontSize: 14,
                fontWeight: 700,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Guardandoâ€¦' : isEdit ? 'Actualizar especie' : 'Guardar especie'}
            </button>
          </div>

          {/* â”€â”€ Right: Live preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              backgroundColor: PANEL,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Preview en vivo
                </span>
                <span style={{ color: DIM, fontSize: 11 }}>
                  {regions.find(r => r.id === regionId)?.name ?? 'â€”'}
                </span>
              </div>
              <div style={{
                backgroundColor: regionTokens['bg'] ?? '#110D06',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 280,
                padding: 24,
                ...resolvedVars,
              }}>
                {previewSvg ? (
                  <OrnamentalElement
                    svgContent={previewSvg}
                    w={180}
                    h={240}
                    colorMode={colorMode}
                    colorMap={colorMode === 'tint' && Object.keys(colorMap).length > 0 ? colorMap : undefined}
                    tokens={regionTokens}
                  />
                ) : previewUrl ? (
                  <OrnamentalElement
                    assetUrl={previewUrl}
                    w={180}
                    h={240}
                    colorMode={colorMode}
                    colorMap={colorMode === 'tint' && Object.keys(colorMap).length > 0 ? colorMap : undefined}
                    tokens={regionTokens}
                  />
                ) : (
                  <div style={{ color: DIM, fontSize: 13, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>ðŸŒ¿</div>
                    SubÃ­ un SVG para ver el preview
                  </div>
                )}
              </div>
            </div>

            {/* Token palette reference */}
            {tokenRoles.length > 0 && (
              <div style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
                <p style={{ ...labelStyle, marginBottom: 8 }}>Paleta de la regiÃ³n</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tokenRoles.filter(r => regionTokens[r]?.startsWith('#')).map(role => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        backgroundColor: regionTokens[role],
                        border: `1px solid ${BORDER}`,
                        flexShrink: 0,
                      }} />
                      <span style={{ color: DIM, fontSize: 11 }}>{role}</span>
                      <span style={{ color: LIGHT, fontSize: 11, fontFamily: 'monospace', marginLeft: 'auto' }}>
                        {regionTokens[role]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
