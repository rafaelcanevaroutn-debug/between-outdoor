'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { DBRegion, DBTemplate, DBToken, DBElement, RegionTokens, MockData, TemplateComposition, Layer } from '@/types/fabrica'

const CanvasEditor = dynamic(() => import('@/components/fabrica/CanvasEditor'), { ssr: false })

const TEXT_ELEMENTS = new Set(['chip', 'titular', 'bajada'])

const DEFAULT_SIZE: Record<string, number> = { chip: 36, titular: 80, bajada: 40 }

const SCALE_FACTOR = 0.4
const MAX_HISTORY = 50

interface Props {
  templates: DBTemplate[]
  regions:   DBRegion[]
  tokens:    DBToken[]
  elements:  DBElement[]
}

const DEFAULT_MOCK: MockData = {
  mes:    'JULIO',
  dias:   'SAB 05 · SAB 12 · SAB 19 · SAB 26',
  fechas: '5, 12, 19, 26',
  salida: 'Trekking Sierra del Norte · Nivel 2',
  fotos:  ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1080'],
  fondo:  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080',
}

const DEFAULT_LAYER: Record<string, Partial<Layer>> = {
  titular:    { x: 90,  y: 500,  w: 900,  z: 2, token: 'accent' },
  chip:       { x: 90,  y: 650,  w: 400,  z: 3, token: 'highlight' },
  calendario: { x: 90,  y: 100,  w: 900,  z: 1 },
  bajada:     { x: 90,  y: 780,  w: 900,  z: 2, token: 'text' },
  polaroid:   { x: 90,  y: 300,  w: 400,  z: 1 },
  fondo:      { x: 0,   y: 0,    w: 1080, z: 0 },
}

const FONT_OPTIONS = [
  { label: 'Georgia (serif)',          value: 'Georgia, serif' },
  { label: 'Times New Roman (serif)',  value: 'Times New Roman, serif' },
  { label: 'Inter (sans-serif)',       value: 'Inter, sans-serif' },
  { label: 'Montserrat (sans-serif)',  value: 'Montserrat, sans-serif' },
  { label: 'Playfair Display (serif)', value: 'Playfair Display, serif' },
  { label: 'Oswald (condensed)',       value: 'Oswald, sans-serif' },
  { label: 'System UI',               value: 'system-ui, sans-serif' },
]

const ELEMENT_TYPES = ['titular', 'chip', 'calendario', 'bajada', 'polaroid', 'fondo']

function toolBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    backgroundColor: '#0A0F0A',
    border: '1px solid #1E2D1E',
    borderRadius: 6,
    color: disabled ? '#2A4030' : '#C8DDD0',
    fontSize: 14,
    width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    padding: 0,
  }
}

export default function MesaClient({ templates, regions, tokens, elements }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? '')
  const [selectedRegionId,   setSelectedRegionId]   = useState<string>(regions[0]?.id ?? '')
  const [tokenOverrides,     setTokenOverrides]     = useState<Record<string, string>>({})
  const [mockData,           setMockData]           = useState<MockData>(DEFAULT_MOCK)
  const [copied,             setCopied]             = useState(false)
  const [localComposition,   setLocalComposition]   = useState<TemplateComposition | null>(null)
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null)
  const [saving,             setSaving]             = useState(false)
  const [saved,              setSaved]              = useState(false)
  const [history,            setHistory]            = useState<TemplateComposition[]>([])
  const [future,             setFuture]             = useState<TemplateComposition[]>([])
  const [gridEnabled,        setGridEnabled]        = useState(false)
  const [measuredWidths,     setMeasuredWidths]     = useState<Record<number, number>>({})

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? templates[0]
  const selectedRegion   = regions.find(r => r.id === selectedRegionId) ?? regions[0]

  // Sync localComposition when template changes
  useEffect(() => {
    const tpl = templates.find(t => t.id === selectedTemplateId)
    if (tpl) {
      setLocalComposition(JSON.parse(JSON.stringify(tpl.composition)))
      setSelectedLayerIndex(null)
      setHistory([])
      setFuture([])
    }
  }, [selectedTemplateId, templates])

  // Initialize on first render
  useEffect(() => {
    if (!localComposition && templates[0]) {
      setLocalComposition(JSON.parse(JSON.stringify(templates[0].composition)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build resolved token map for the selected region
  const baseTokens = useMemo<RegionTokens>(() => {
    const map: RegionTokens = {}
    tokens
      .filter(t => t.region_id === selectedRegion?.id)
      .forEach(t => { map[t.role] = t.value })
    return map
  }, [tokens, selectedRegion])

  const resolvedTokens = useMemo<RegionTokens>(() => ({
    ...baseTokens,
    ...tokenOverrides,
  }), [baseTokens, tokenOverrides])

  // Group tokens by category for the editor
  const tokensByCategory = useMemo(() => {
    const map: Record<string, { role: string; value: string }[]> = {}
    tokens
      .filter(t => t.region_id === selectedRegion?.id)
      .forEach(t => {
        if (!map[t.category]) map[t.category] = []
        map[t.category].push({ role: t.role, value: tokenOverrides[t.role] ?? t.value })
      })
    return map
  }, [tokens, selectedRegion, tokenOverrides])

  const slots = localComposition?.slots ?? {}

  const tokenRoles = Object.keys(resolvedTokens)

  function setTokenOverride(role: string, value: string) {
    setTokenOverrides(prev => ({ ...prev, [role]: value }))
  }

  function setMockValue(key: string, value: string | string[]) {
    setMockData(prev => ({ ...prev, [key]: value }))
  }

  function setMockImageItem(key: string, idx: number, value: string) {
    const current = (mockData[key] as string[]) ?? []
    const next = [...current]
    next[idx] = value
    setMockData(prev => ({ ...prev, [key]: next }))
  }

  function updateLayer(index: number, updates: Partial<Layer>) {
    setLocalComposition(prev => {
      if (!prev) return prev
      const layers = [...prev.layers]
      layers[index] = { ...layers[index], ...updates }
      return { ...prev, layers }
    })
  }

  function commitChange() {
    if (!localComposition) return
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), localComposition!])
    setFuture([])
  }

  function undo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setFuture(f => [localComposition!, ...f.slice(0, MAX_HISTORY - 1)])
    setHistory(h => h.slice(0, -1))
    setLocalComposition(prev)
    setSelectedLayerIndex(null)
  }

  function redo() {
    if (future.length === 0) return
    const next = future[0]
    setHistory(h => [...h.slice(-MAX_HISTORY + 1), localComposition!])
    setFuture(f => f.slice(1))
    setLocalComposition(next)
    setSelectedLayerIndex(null)
  }

  function align(action: 'left'|'centerH'|'right'|'top'|'centerV'|'bottom') {
    if (selectedLayerIndex === null || !localComposition) return
    const layer = localComposition.layers[selectedLayerIndex]
    const isText = TEXT_ELEMENTS.has(layer.element)
    const lw = isText ? (measuredWidths[selectedLayerIndex] ?? 200) : (layer.w ?? 200)
    const lh = 100 // estimate
    const cw = localComposition.canvas.w
    const ch = localComposition.canvas.h
    const updates: Partial<Layer> = {}
    if (action === 'left')    updates.x = 90
    if (action === 'centerH') updates.x = Math.round((cw - lw) / 2)
    if (action === 'right')   updates.x = cw - lw - 90
    if (action === 'top')     updates.y = 90
    if (action === 'centerV') updates.y = Math.round((ch - lh) / 2)
    if (action === 'bottom')  updates.y = ch - lh - 90
    updateLayer(selectedLayerIndex, updates)
    commitChange()
  }

  function addElement(type: string) {
    const defaults = DEFAULT_LAYER[type] ?? { x: 90, y: 400, w: 500, z: 5 }
    const newLayer: Layer = { element: type, ...defaults }
    setLocalComposition(prev => {
      if (!prev) return prev
      return { ...prev, layers: [...prev.layers, newLayer] }
    })
    setSelectedLayerIndex((localComposition?.layers.length ?? 0))
  }

  function addOrnamental(elem: DBElement) {
    const schema = elem.props_schema as Record<string, number>
    const newLayer: Layer = {
      element: elem.component_key ?? 'ornamental',
      x: 90,
      y: 400,
      w: schema.defaultW ?? 200,
      h: schema.defaultH ?? 400,
      z: 5,
      color_mode: elem.color_mode,
    }
    setLocalComposition(prev => {
      if (!prev) return prev
      return { ...prev, layers: [...prev.layers, newLayer] }
    })
    setSelectedLayerIndex((localComposition?.layers.length ?? 0))
  }

  const regionOrnamentals = useMemo(
    () => elements.filter(e => e.kind === 'ornamental' && e.region_id === selectedRegion?.id),
    [elements, selectedRegion],
  )

  function removeLayer(index: number) {
    setLocalComposition(prev => {
      if (!prev) return prev
      const layers = prev.layers.filter((_, i) => i !== index)
      return { ...prev, layers }
    })
    setSelectedLayerIndex(null)
  }

  // Keyboard shortcuts: Undo, Redo, Duplicate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const isMac = navigator.platform.includes('Mac')
      const mod = isMac ? e.metaKey : e.ctrlKey

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && e.key === 'z' && e.shiftKey)  { e.preventDefault(); redo() }
      if (mod && e.key === 'd') {
        e.preventDefault()
        if (selectedLayerIndex !== null && localComposition) {
          const layer = localComposition.layers[selectedLayerIndex]
          if (layer && layer.element !== 'fondo') {
            const dupe: Layer = { ...layer, x: (layer.x ?? 0) + 30, y: (layer.y ?? 0) + 30 }
            const newComp = { ...localComposition, layers: [...localComposition.layers, dupe] }
            setHistory(h => [...h.slice(-MAX_HISTORY + 1), localComposition!])
            setFuture([])
            setLocalComposition(newComp)
            setSelectedLayerIndex(newComp.layers.length - 1)
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [history, future, localComposition, selectedLayerIndex])

  async function saveComposition() {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      await fetch(`/api/mesa/templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composition: localComposition }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function exportJSON() {
    const payload = {
      composition: localComposition,
      tokens: resolvedTokens,
      data: mockData,
      exportedAt: new Date().toISOString(),
    }
    const json = JSON.stringify(payload, null, 2)
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const PANEL_BG   = '#111A11'
  const BORDER     = '#1E2D1E'
  const TEXT_DIM   = '#6B8F71'
  const TEXT_LIGHT = '#F0FFF4'
  const GREEN      = '#34D17E'

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: TEXT_DIM,
    marginBottom: 4,
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#0A0F0A',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '6px 10px',
    color: TEXT_LIGHT,
    fontSize: 13,
    outline: 'none',
  }

  const sectionStyle: React.CSSProperties = {
    backgroundColor: PANEL_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  }

  const selectedLayer = selectedLayerIndex !== null ? localComposition?.layers[selectedLayerIndex] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: TEXT_LIGHT, fontSize: 18, fontWeight: 700, margin: 0 }}>Mesa de trabajo</h1>
          <p style={{ color: TEXT_DIM, fontSize: 13, margin: '2px 0 0' }}>Editor de plantillas con drag &amp; drop</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={saveComposition}
            disabled={saving}
            style={{
              backgroundColor: saved ? '#1E2D1E' : GREEN,
              color: saved ? GREEN : '#0A0F0A',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={exportJSON}
            style={{
              backgroundColor: copied ? '#1E2D1E' : 'transparent',
              color: copied ? GREEN : TEXT_DIM,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copiado' : 'Exportar JSON'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
        {/* ── Panel de controles ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '90vh' }}>

          {/* 1. Template + Región selectors */}
          <div style={sectionStyle}>
            <div>
              <span style={labelStyle}>Template</span>
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                style={inputStyle}
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>Región</span>
              <select
                value={selectedRegionId}
                onChange={e => { setSelectedRegionId(e.target.value); setTokenOverrides({}) }}
                style={inputStyle}
              >
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Inventario */}
          <div style={sectionStyle}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>Inventario · Estructurales</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ELEMENT_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => addElement(type)}
                  style={{
                    backgroundColor: '#0A0F0A',
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: '5px 10px',
                    color: TEXT_LIGHT,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  + {type}
                </button>
              ))}
            </div>
            {regionOrnamentals.length > 0 && (
              <>
                <p style={{ ...labelStyle, marginBottom: 0, marginTop: 8 }}>Ornamentales · {selectedRegion?.name}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {regionOrnamentals.map(elem => (
                    <button
                      key={elem.id}
                      onClick={() => addOrnamental(elem)}
                      title={elem.species_name ?? elem.component_key ?? ''}
                      style={{
                        backgroundColor: '#0A0F0A',
                        border: `1px solid #2D4020`,
                        borderRadius: 6,
                        padding: '5px 10px',
                        color: '#A8D080',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      + {elem.component_key}
                    </button>
                  ))}
                </div>
              </>
            )}
            {selectedLayerIndex !== null && selectedLayer && (
              <button
                onClick={() => removeLayer(selectedLayerIndex)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #5C1A1A',
                  borderRadius: 6,
                  padding: '5px 10px',
                  color: '#F87171',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                Eliminar capa: {selectedLayer.element}
              </button>
            )}
          </div>

          {/* 3. Propiedades (only when a layer is selected) */}
          {selectedLayerIndex !== null && selectedLayer && (
            <div style={sectionStyle}>
              <p style={{ ...labelStyle, marginBottom: 0 }}>Propiedades · {selectedLayer.element}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {!TEXT_ELEMENTS.has(selectedLayer.element) && (
                  <div>
                    <span style={labelStyle}>Ancho (w)</span>
                    <input
                      type="number"
                      value={selectedLayer.w ?? ''}
                      onChange={e => updateLayer(selectedLayerIndex, { w: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                )}
                <div>
                  <span style={labelStyle}>Rotación (rot)</span>
                  <input
                    type="number"
                    value={selectedLayer.rot ?? 0}
                    onChange={e => updateLayer(selectedLayerIndex, { rot: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Z-index</span>
                  <input
                    type="number"
                    value={selectedLayer.z ?? 0}
                    onChange={e => updateLayer(selectedLayerIndex, { z: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Token</span>
                  <select
                    value={selectedLayer.token ?? ''}
                    onChange={e => updateLayer(selectedLayerIndex, { token: e.target.value || undefined })}
                    style={inputStyle}
                  >
                    <option value="">— ninguno —</option>
                    {tokenRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                {TEXT_ELEMENTS.has(selectedLayer.element) && (
                  <div>
                    <span style={labelStyle}>Tamaño (size)</span>
                    <input
                      type="number"
                      value={selectedLayer.size ?? DEFAULT_SIZE[selectedLayer.element] ?? 36}
                      onChange={e => updateLayer(selectedLayerIndex, { size: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                )}
                {elements.some(e => e.component_key === selectedLayer.element && e.kind === 'ornamental') && (
                  <>
                    <div>
                      <span style={labelStyle}>Alto (h)</span>
                      <input
                        type="number"
                        value={selectedLayer.h ?? 400}
                        onChange={e => updateLayer(selectedLayerIndex, { h: Number(e.target.value) })}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={labelStyle}>Modo de color</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['tint', 'fixed'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => updateLayer(selectedLayerIndex, { color_mode: mode })}
                            style={{
                              flex: 1,
                              backgroundColor: (selectedLayer.color_mode ?? 'tint') === mode ? '#1E2D1E' : '#0A0F0A',
                              border: `1px solid ${(selectedLayer.color_mode ?? 'tint') === mode ? GREEN : BORDER}`,
                              borderRadius: 6,
                              padding: '6px 0',
                              color: (selectedLayer.color_mode ?? 'tint') === mode ? GREEN : TEXT_DIM,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {mode === 'tint' ? 'Teñir' : 'Fijo'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 4. Tokens en vivo */}
          {Object.entries(tokensByCategory).map(([cat, toks]) => (
            <div key={cat} style={sectionStyle}>
              <p style={{ ...labelStyle, marginBottom: 0 }}>{cat}</p>
              {toks.map(({ role, value }) => (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: TEXT_DIM, fontSize: 12, width: 90, flexShrink: 0 }}>{role}</span>
                  {cat === 'color' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <input
                        type="color"
                        value={value.startsWith('#') ? value : '#E8A04A'}
                        onChange={e => setTokenOverride(role, e.target.value)}
                        style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={e => setTokenOverride(role, e.target.value)}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }}
                      />
                    </div>
                  ) : cat === 'font' ? (
                    <select
                      value={value}
                      onChange={e => setTokenOverride(role, e.target.value)}
                      style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                    >
                      {FONT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={e => setTokenOverride(role, e.target.value)}
                      style={{ ...inputStyle, flex: 1, fontSize: 12 }}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* 5. Data mock */}
          {localComposition && (
            <div style={sectionStyle}>
              <p style={{ ...labelStyle, marginBottom: 0 }}>Data del template</p>
              {Object.entries(slots).map(([key, slot]) => {
                if (slot.type === 'image[]') {
                  const max = slot.max ?? 2
                  const arr = (mockData[key] as string[]) ?? []
                  return (
                    <div key={key}>
                      <span style={labelStyle}>{key} (image × {max})</span>
                      {Array.from({ length: max }).map((_, i) => (
                        <input
                          key={i}
                          type="text"
                          placeholder={`URL imagen ${i + 1}`}
                          value={arr[i] ?? ''}
                          onChange={e => setMockImageItem(key, i, e.target.value)}
                          style={{ ...inputStyle, marginBottom: 4, fontSize: 12 }}
                        />
                      ))}
                    </div>
                  )
                }
                if (slot.type === 'image') {
                  return (
                    <div key={key}>
                      <span style={labelStyle}>{key} (image)</span>
                      <input
                        type="text"
                        placeholder="URL imagen de fondo"
                        value={(mockData[key] as string) ?? ''}
                        onChange={e => setMockValue(key, e.target.value)}
                        style={{ ...inputStyle, fontSize: 12 }}
                      />
                    </div>
                  )
                }
                return (
                  <div key={key}>
                    <span style={labelStyle}>{key}</span>
                    <input
                      type="text"
                      value={(mockData[key] as string) ?? ''}
                      onChange={e => setMockValue(key, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Preview + Canvas Editor ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            ...sectionStyle,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}>
            {localComposition ? (
              <>
                {/* Alignment + Undo/Redo toolbar */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {/* Undo/Redo */}
                  <button onClick={undo} disabled={history.length === 0} title="Deshacer (⌘Z)" style={toolBtnStyle(history.length === 0)}>↩</button>
                  <button onClick={redo} disabled={future.length === 0} title="Rehacer (⌘⇧Z)" style={toolBtnStyle(future.length === 0)}>↪</button>
                  <div style={{ width: 1, backgroundColor: '#1E2D1E', margin: '0 4px' }} />
                  {/* Alignment */}
                  {([
                    ['left',    '⇤', 'Alinear izquierda (m. 90)'],
                    ['centerH', '↔', 'Centrar horizontal'],
                    ['right',   '⇥', 'Alinear derecha (m. 90)'],
                    ['top',     '⇡', 'Alinear arriba (m. 90)'],
                    ['centerV', '↕', 'Centrar vertical'],
                    ['bottom',  '⇣', 'Alinear abajo (m. 90)'],
                  ] as [Parameters<typeof align>[0], string, string][]).map(([action, icon, title]) => (
                    <button
                      key={action}
                      onClick={() => align(action)}
                      disabled={selectedLayerIndex === null}
                      title={title}
                      style={toolBtnStyle(selectedLayerIndex === null)}
                    >
                      {icon}
                    </button>
                  ))}
                  <div style={{ width: 1, backgroundColor: '#1E2D1E', margin: '0 4px' }} />
                  {/* Grid toggle */}
                  <button
                    onClick={() => setGridEnabled(g => !g)}
                    title="Toggle grilla"
                    style={{ ...toolBtnStyle(false), backgroundColor: gridEnabled ? 'rgba(52,209,126,0.2)' : undefined, color: gridEnabled ? '#34D17E' : undefined }}
                  >
                    ⊞
                  </button>
                </div>
                <CanvasEditor
                  composition={localComposition}
                  tokens={resolvedTokens}
                  data={mockData}
                  scaleFactor={SCALE_FACTOR}
                  selectedLayerIndex={selectedLayerIndex}
                  gridEnabled={gridEnabled}
                  elements={elements}
                  onSelect={setSelectedLayerIndex}
                  onUpdateLayer={updateLayer}
                  onCommit={commitChange}
                  onRemoveLayer={removeLayer}
                  onMeasure={setMeasuredWidths}
                  onUpdateData={(key, value) => setMockData(prev => ({ ...prev, [key]: value }))}
                />
              </>
            ) : (
              <p style={{ color: TEXT_DIM, fontSize: 14 }}>Seleccioná un template</p>
            )}
          </div>

          {/* Info pills */}
          {localComposition && (
            <div style={{ ...sectionStyle, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                ['Template', selectedTemplate?.name ?? '—'],
                ['Región', selectedRegion?.name ?? '—'],
                ['Canvas', `${localComposition.canvas.w} × ${localComposition.canvas.h}`],
                ['Layers', String(localComposition.layers.length)],
                ['Historia', String(history.length)],
              ].map(([label, value]) => (
                <div key={label} style={{
                  backgroundColor: '#0A0F0A',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '6px 12px',
                }}>
                  <p style={{ color: TEXT_DIM, fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ color: TEXT_LIGHT, fontSize: 13, fontWeight: 600, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
