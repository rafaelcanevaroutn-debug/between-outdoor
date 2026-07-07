'use client'

import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import TemplateRenderer from './TemplateRenderer'
import type { TemplateComposition, RegionTokens, MockData, Layer, DBElement } from '@/types/fabrica'

const TEXT_ELEMENTS = new Set(['chip', 'titular', 'bajada'])

const ELEMENT_HEIGHTS: Record<string, number> = {
  fondo: 1350, titular: 110, chip: 80, calendario: 500, bajada: 70, polaroid: 400,
}

const SNAP_STATIC_X = [0, 90, 540, 990, 1080]
const SNAP_STATIC_Y = [0, 90, 675, 1260, 1350]
const SNAP_THRESHOLD = 8  // logical px — tight for smart feel
const GRID_SIZE = 90

type HandleDir = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'

interface Guide { type: 'h'|'v'; pos: number }

const DEFAULT_FONT_SIZES: Record<string, number> = { titular: 80, chip: 36, bajada: 40 }
const DEFAULT_FONTS: Record<string, string> = {
  titular: 'Georgia, serif',
  chip: 'system-ui, sans-serif',
  bajada: 'system-ui, sans-serif',
}

interface CanvasEditorProps {
  composition: TemplateComposition
  tokens: RegionTokens
  data: MockData
  scaleFactor: number
  selectedLayerIndex: number | null
  gridEnabled: boolean
  elements?: DBElement[]
  onSelect: (index: number | null) => void
  onUpdateLayer: (index: number, updates: Partial<Layer>) => void
  onCommit: () => void          // called on drag/resize end (for undo history)
  onRemoveLayer: (index: number) => void
  onMeasure?: (widths: Record<number, number>) => void
  onUpdateData?: (key: string, value: string) => void
}

export default function CanvasEditor({
  composition, tokens, data, scaleFactor,
  selectedLayerIndex, gridEnabled,
  elements = [],
  onSelect, onUpdateLayer, onCommit, onRemoveLayer, onMeasure, onUpdateData,
}: CanvasEditorProps) {
  const { w: canvasW, h: canvasH } = composition.canvas
  const [guides, setGuides] = useState<Guide[]>([])
  const [measuredWidths, setMeasuredWidths] = useState<Record<number, number>>({})
  const [editingLayerIndex, setEditingLayerIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Measure text element widths after render ─────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const newWidths: Record<number, number> = {}
    const divs = containerRef.current.querySelectorAll<HTMLElement>('[data-layer-index]')
    divs.forEach(div => {
      const idx = parseInt(div.getAttribute('data-layer-index') ?? '', 10)
      const rect = div.getBoundingClientRect()
      if (rect.width > 0) {
        // getBoundingClientRect() returns screen pixels (already scaled)
        // divide by scaleFactor to get logical canvas units
        newWidths[idx] = Math.round(rect.width / scaleFactor)
      }
    })
    setMeasuredWidths(newWidths)
    onMeasure?.(newWidths)
  }, [composition, scaleFactor, onMeasure])

  // ── Effective width helper ───────────────────────────────────────────────
  function effectiveWidth(layer: Layer, oi: number): number {
    if (TEXT_ELEMENTS.has(layer.element)) {
      return measuredWidths[oi] ?? Math.max(50, (layer.size ?? 36) * 3)
    }
    return layer.w ?? canvasW
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (selectedLayerIndex === null) return
      const layer = composition.layers[selectedLayerIndex]
      if (!layer || layer.element === 'fondo') return

      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const step = e.shiftKey ? 10 : 1
      if (e.key === 'ArrowLeft')  { e.preventDefault(); onUpdateLayer(selectedLayerIndex, { x: Math.max(0, (layer.x ?? 0) - step) }); onCommit() }
      if (e.key === 'ArrowRight') { e.preventDefault(); onUpdateLayer(selectedLayerIndex, { x: Math.min(canvasW - (effectiveWidth(layer, selectedLayerIndex)), (layer.x ?? 0) + step) }); onCommit() }
      if (e.key === 'ArrowUp')    { e.preventDefault(); onUpdateLayer(selectedLayerIndex, { y: Math.max(0, (layer.y ?? 0) - step) }); onCommit() }
      if (e.key === 'ArrowDown')  { e.preventDefault(); onUpdateLayer(selectedLayerIndex, { y: Math.min(canvasH - 40, (layer.y ?? 0) + step) }); onCommit() }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onRemoveLayer(selectedLayerIndex) }
      if (e.key === 'Escape') { onSelect(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayerIndex, composition, onUpdateLayer, onCommit, onRemoveLayer, onSelect, canvasW, canvasH, measuredWidths])

  // ── Smart guide calculation ─────────────────────────────────────────────────
  function calcSmartGuides(
    dragIdx: number,
    nx: number, ny: number,
    lw: number, lh: number,
  ): { nx: number; ny: number; guides: Guide[] } {
    const found: Guide[] = []
    let sx = nx, sy = ny

    // Points of the dragged element (left, center, right / top, center, bottom)
    const dPoints = {
      xl: nx, xc: nx + lw / 2, xr: nx + lw,
      yt: ny, yc: ny + lh / 2, yb: ny + lh,
    }

    // Candidate snap lines: canvas edges + other layers
    const candidatesX: number[] = [...SNAP_STATIC_X]
    const candidatesY: number[] = [...SNAP_STATIC_Y]

    composition.layers.forEach((other, oi) => {
      if (oi === dragIdx || other.element === 'fondo') return
      const ow = effectiveWidth(other, oi)
      const oh = other.h ?? ELEMENT_HEIGHTS[other.element] ?? 100
      const ox = other.x ?? 0
      const oy = other.y ?? 0
      candidatesX.push(ox, ox + ow / 2, ox + ow)
      candidatesY.push(oy, oy + oh / 2, oy + oh)
    })

    // X snapping — check each dragged anchor against each candidate
    for (const cx of candidatesX) {
      if (Math.abs(dPoints.xl - cx) < SNAP_THRESHOLD) { sx = cx; found.push({ type: 'v', pos: cx }); break }
      if (Math.abs(dPoints.xc - cx) < SNAP_THRESHOLD) { sx = cx - lw / 2; found.push({ type: 'v', pos: cx }); break }
      if (Math.abs(dPoints.xr - cx) < SNAP_THRESHOLD) { sx = cx - lw; found.push({ type: 'v', pos: cx }); break }
    }
    for (const cy of candidatesY) {
      if (Math.abs(dPoints.yt - cy) < SNAP_THRESHOLD) { sy = cy; found.push({ type: 'h', pos: cy }); break }
      if (Math.abs(dPoints.yc - cy) < SNAP_THRESHOLD) { sy = cy - lh / 2; found.push({ type: 'h', pos: cy }); break }
      if (Math.abs(dPoints.yb - cy) < SNAP_THRESHOLD) { sy = cy - lh; found.push({ type: 'h', pos: cy }); break }
    }

    return { nx: Math.round(sx), ny: Math.round(sy), guides: found }
  }

  // ── Grid snap ───────────────────────────────────────────────────────────────
  function snapGrid(v: number): number {
    return Math.round(v / GRID_SIZE) * GRID_SIZE
  }

  // ── Drag handler ───────────────────────────────────────────────────────────
  function handleDragDown(e: React.PointerEvent<HTMLDivElement>, layerIndex: number) {
    if (composition.layers[layerIndex].element === 'fondo') { onSelect(null); return }
    e.preventDefault()
    e.stopPropagation()
    onSelect(layerIndex)

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const startCX = e.clientX, startCY = e.clientY
    const layer = composition.layers[layerIndex]
    const startLogX = layer.x ?? 0
    const startLogY = layer.y ?? 0
    const lw = effectiveWidth(layer, layerIndex)
    const lh = layer.h ?? ELEMENT_HEIGHTS[layer.element] ?? 100

    function onMove(me: PointerEvent) {
      let nx = startLogX + (me.clientX - startCX) / scaleFactor
      let ny = startLogY + (me.clientY - startCY) / scaleFactor

      if (gridEnabled) { nx = snapGrid(nx); ny = snapGrid(ny) }

      const result = calcSmartGuides(layerIndex, nx, ny, lw, lh)
      nx = result.nx; ny = result.ny
      setGuides(result.guides)

      nx = Math.max(0, Math.min(canvasW - lw, nx))
      ny = Math.max(0, Math.min(canvasH - 40, ny))
      onUpdateLayer(layerIndex, { x: Math.round(nx), y: Math.round(ny) })
    }
    function onUp() {
      setGuides([])
      onCommit()
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
  }

  // ── Resize handler ─────────────────────────────────────────────────────────
  function handleResizeDown(
    e: React.PointerEvent<HTMLDivElement>,
    layerIndex: number,
    dir: HandleDir,
  ) {
    e.preventDefault()
    e.stopPropagation()

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const layer = composition.layers[layerIndex]
    const startCX = e.clientX, startCY = e.clientY
    const origX = layer.x ?? 0
    const origY = layer.y ?? 0
    const origW = layer.w ?? 200
    const origH = layer.h ?? ELEMENT_HEIGHTS[layer.element] ?? 100
    const origSize = layer.size ?? (layer.element === 'chip' ? 36 : layer.element === 'titular' ? 80 : 40)
    const isText = TEXT_ELEMENTS.has(layer.element)
    const hasH = layer.h !== undefined // ornamentals have explicit h

    function onMove(me: PointerEvent) {
      const dx = (me.clientX - startCX) / scaleFactor
      const dy = (me.clientY - startCY) / scaleFactor

      // Text elements: resize by font size, not width
      if (isText) {
        // s/se/sw: drag down = bigger (dy positive = bigger)
        // n/ne/nw: drag up = bigger (dy negative = bigger → use -dy)
        // e: dx positive = bigger; w: dx negative = bigger → use -dx
        // corners: use whichever axis has larger movement
        let delta: number
        if (dir === 's' || dir === 'se' || dir === 'sw') {
          delta = dy
        } else if (dir === 'n' || dir === 'ne' || dir === 'nw') {
          delta = -dy
        } else if (dir === 'e') {
          delta = dx
        } else if (dir === 'w') {
          delta = -dx
        } else {
          delta = Math.abs(dx) > Math.abs(dy) ? dx : -dy
        }
        const newSize = Math.round(Math.max(12, origSize + delta * 0.5))
        onUpdateLayer(layerIndex, { size: newSize })
        return
      }

      let nx = origX, ny = origY, nw = origW, nh = origH

      // Width/X changes by direction
      if (dir === 'e' || dir === 'ne' || dir === 'se') {
        nw = Math.max(50, origW + dx)
      }
      if (dir === 'w' || dir === 'nw' || dir === 'sw') {
        const delta = Math.min(dx, origW - 50)
        nx = origX + delta
        nw = origW - delta
      }
      if (dir === 'n' || dir === 'nw' || dir === 'ne') {
        if (hasH) {
          // ornamental: north drag shrinks/grows height from top
          const delta = Math.min(dy, origH - 20)
          ny = origY + delta
          nh = origH - delta
        } else {
          const delta = Math.min(dy, origH - 20)
          ny = origY + delta
        }
      }
      if (dir === 's' || dir === 'se' || dir === 'sw') {
        if (hasH) {
          nh = Math.max(20, origH + dy)
        }
        ny = origY // south doesn't change y
      }

      const updates: Partial<Layer> = { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw) }
      if (hasH) updates.h = Math.round(nh)
      onUpdateLayer(layerIndex, updates)
    }
    function onUp() {
      onCommit()
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const sortedLayers = [...composition.layers]
    .map((layer, originalIndex) => ({ layer, originalIndex }))
    .sort((a, b) => (a.layer.z ?? 0) - (b.layer.z ?? 0))

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        position: 'relative',
        width: canvasW * scaleFactor,
        height: canvasH * scaleFactor,
        flexShrink: 0,
        outline: 'none',
      }}
      onClick={() => onSelect(null)}
    >
      {/* The one renderer — pointer events disabled */}
      <div style={{ pointerEvents: 'none' }}>
        <TemplateRenderer composition={composition} tokens={tokens} data={data} scale={scaleFactor} elements={elements} />
      </div>

      {/* Interaction overlay */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* Smart guide lines */}
        {guides.map((g, gi) => (
          <div key={gi} style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 100,
            backgroundColor: '#FF00FF',
            opacity: 0.8,
            ...(g.type === 'h'
              ? { left: 0, right: 0, top: g.pos * scaleFactor, height: 1 }
              : { top: 0, bottom: 0, left: g.pos * scaleFactor, width: 1 }),
          }} />
        ))}

        {/* Grid overlay */}
        {gridEnabled && (
          <svg
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.15 }}
            width={canvasW * scaleFactor}
            height={canvasH * scaleFactor}
          >
            {Array.from({ length: Math.floor(canvasW / GRID_SIZE) + 1 }).map((_, i) => (
              <line key={`gx${i}`} x1={i * GRID_SIZE * scaleFactor} y1={0} x2={i * GRID_SIZE * scaleFactor} y2={canvasH * scaleFactor} stroke="#34D17E" strokeWidth={0.5} />
            ))}
            {Array.from({ length: Math.floor(canvasH / GRID_SIZE) + 1 }).map((_, i) => (
              <line key={`gy${i}`} x1={0} y1={i * GRID_SIZE * scaleFactor} x2={canvasW * scaleFactor} y2={i * GRID_SIZE * scaleFactor} stroke="#34D17E" strokeWidth={0.5} />
            ))}
          </svg>
        )}

        {/* Layer hit-boxes */}
        {sortedLayers.map(({ layer, originalIndex: oi }) => {
          const isFondo = layer.element === 'fondo'
          const isText = TEXT_ELEMENTS.has(layer.element)
          const isSelected = selectedLayerIndex === oi
          const sx = (layer.x ?? 0) * scaleFactor
          const sy = (layer.y ?? 0) * scaleFactor
          const sw = effectiveWidth(layer, oi) * scaleFactor
          const logH = layer.h ?? ELEMENT_HEIGHTS[layer.element] ?? 100
          const sh = logH * scaleFactor

          const HANDLE_SIZE = 8

          // Text elements: 4 corners + top/bottom center handles (S drag = bigger text)
          const handles: [HandleDir, React.CSSProperties][] = isText
            ? [
                ['nw', { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'nw-resize' }],
                ['n',  { top: -HANDLE_SIZE/2, left: sw/2-HANDLE_SIZE/2, cursor: 'n-resize' }],
                ['ne', { top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'ne-resize' }],
                ['se', { bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'se-resize' }],
                ['s',  { bottom: -HANDLE_SIZE/2, left: sw/2-HANDLE_SIZE/2, cursor: 's-resize' }],
                ['sw', { bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'sw-resize' }],
              ]
            : [
                ['nw', { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'nw-resize' }],
                ['n',  { top: -HANDLE_SIZE/2, left: sw/2-HANDLE_SIZE/2, cursor: 'n-resize' }],
                ['ne', { top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'ne-resize' }],
                ['e',  { top: sh/2-HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'e-resize' }],
                ['se', { bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2, cursor: 'se-resize' }],
                ['s',  { bottom: -HANDLE_SIZE/2, left: sw/2-HANDLE_SIZE/2, cursor: 's-resize' }],
                ['sw', { bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'sw-resize' }],
                ['w',  { top: sh/2-HANDLE_SIZE/2, left: -HANDLE_SIZE/2, cursor: 'w-resize' }],
              ]

          return (
            <div
              key={oi}
              onPointerDown={(e) => { if (editingLayerIndex === oi) return; handleDragDown(e, oi) }}
              onClick={(e) => { e.stopPropagation(); if (!isFondo) onSelect(oi) }}
              onDoubleClick={(e) => {
                if (!isText || !onUpdateData) return
                e.stopPropagation()
                onSelect(oi)
                setEditingLayerIndex(oi)
              }}
              style={{
                position: 'absolute',
                left:   isFondo ? 0 : sx,
                top:    isFondo ? 0 : sy,
                width:  isFondo ? canvasW * scaleFactor : sw,
                height: isFondo ? canvasH * scaleFactor : sh,
                cursor: isFondo ? 'default' : 'grab',
                border: isSelected ? '2px solid #34D17E' : isFondo ? 'none' : '1px dashed transparent',
                boxSizing: 'border-box',
                zIndex: (layer.z ?? 0) + 10,
              }}
              onMouseEnter={e => { if (!isSelected && !isFondo) e.currentTarget.style.borderColor = 'rgba(52,209,126,0.35)' }}
              onMouseLeave={e => { if (!isSelected && !isFondo) e.currentTarget.style.borderColor = 'transparent' }}
            >
              {/* Selection: label + resize handles */}
              {isSelected && !isFondo && (
                <>
                  {/* Label badge */}
                  <div style={{
                    position: 'absolute', top: -18, left: 0,
                    backgroundColor: '#34D17E', color: '#0A0F0A',
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>
                    {layer.element}{layer.size ? ` · ${layer.size}px` : ''}
                  </div>

                  {/* Resize handles */}
                  {handles.map(([dir, pos]) => (
                    <div
                      key={dir}
                      onPointerDown={(e) => { e.stopPropagation(); handleResizeDown(e, oi, dir) }}
                      style={{
                        position: 'absolute',
                        width: HANDLE_SIZE, height: HANDLE_SIZE,
                        borderRadius: 2,
                        backgroundColor: '#34D17E',
                        border: '1px solid #0A0F0A',
                        zIndex: 30,
                        ...pos,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          )
        })}

        {/* Inline text editor overlay */}
        {editingLayerIndex !== null && (() => {
          const layer = composition.layers[editingLayerIndex]
          const bindKey = typeof layer.bind === 'string' ? layer.bind : null
          if (!bindKey || !onUpdateData) return null

          const screenX = (layer.x ?? 0) * scaleFactor
          const screenY = (layer.y ?? 0) * scaleFactor
          const logicalSize = layer.size ?? DEFAULT_FONT_SIZES[layer.element] ?? 36
          const screenFontSize = logicalSize * scaleFactor
          const fontFamily = DEFAULT_FONTS[layer.element] ?? 'system-ui, sans-serif'
          const color = layer.token ? (tokens[layer.token] ?? '#F2E8D4') : '#F2E8D4'
          const currentValue = (data[bindKey] as string) ?? ''
          const minW = Math.max(80, (measuredWidths[editingLayerIndex] ?? 200) * scaleFactor)

          return (
            <textarea
              key={editingLayerIndex}
              autoFocus
              defaultValue={currentValue}
              onChange={(e) => onUpdateData(bindKey, e.target.value)}
              onBlur={() => setEditingLayerIndex(null)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { e.preventDefault(); setEditingLayerIndex(null) }
                e.stopPropagation()  // prevent canvas keyboard shortcuts while typing
              }}
              style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                minWidth: minW,
                fontSize: screenFontSize,
                fontFamily,
                fontWeight: layer.element === 'titular' ? 700 : 400,
                lineHeight: layer.element === 'titular' ? 1.05 : 1.4,
                letterSpacing: layer.element === 'titular' ? '-0.02em' : undefined,
                textTransform: layer.element === 'chip' ? 'uppercase' : undefined,
                color,
                background: 'rgba(10,15,10,0.82)',
                border: '2px solid #34D17E',
                borderRadius: 4,
                outline: 'none',
                padding: '4px 8px',
                resize: 'none',
                overflow: 'hidden',
                zIndex: 500,
                caretColor: '#34D17E',
                whiteSpace: 'pre-wrap',
                rows: undefined,
              } as React.CSSProperties}
              rows={3}
            />
          )
        })()}
      </div>
    </div>
  )
}
