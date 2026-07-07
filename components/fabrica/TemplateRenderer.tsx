import type { TemplateComposition, RegionTokens, MockData, Layer, DBElement } from '@/types/fabrica'
import FondoElement from './elements/FondoElement'
import TitularElement from './elements/TitularElement'
import ChipElement from './elements/ChipElement'
import CalendarioElement from './elements/CalendarioElement'
import BajadaElement from './elements/BajadaElement'
import OrnamentalElement from './elements/OrnamentalElement'

// ── Resolve bind → data value ──────────────────────────────────────────────
type BoundData = string | string[] | Record<string, string> | null

function resolveBind(bind: Layer['bind'], data: MockData): BoundData {
  if (bind === undefined || bind === null) return null
  if (typeof bind === 'string') {
    return (data[bind] ?? null) as string | string[] | null
  }
  // Record<string, string>: keys are element prop names, values are slot names
  return Object.fromEntries(
    Object.entries(bind).map(([propKey, slotName]) => [
      propKey,
      typeof data[slotName] === 'string' ? data[slotName] as string : '',
    ])
  ) as Record<string, string>
}

// ── Element registry ───────────────────────────────────────────────────────
interface ElemProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  tokenValue?: string
  w?: number
  h?: number
  size?: number
}

const ELEMENTS: Record<string, React.ComponentType<ElemProps>> = {
  fondo:      FondoElement as React.ComponentType<ElemProps>,
  titular:    TitularElement as React.ComponentType<ElemProps>,
  chip:       ChipElement as React.ComponentType<ElemProps>,
  calendario: CalendarioElement as React.ComponentType<ElemProps>,
  bajada:     BajadaElement as React.ComponentType<ElemProps>,
}

const TEXT_ELEMENTS = new Set(['chip', 'titular', 'bajada'])

// ── Layer renderer ─────────────────────────────────────────────────────────
function LayerNode({
  layer,
  layerIndex,
  data,
  tokens,
  canvasW,
  canvasH,
  elements,
}: {
  layer: Layer
  layerIndex: number
  data: MockData
  tokens: RegionTokens
  canvasW: number
  canvasH: number
  elements: DBElement[]
}) {
  // Check for ornamental first
  const ornamental = elements.find(e => e.component_key === layer.element && e.kind === 'ornamental')
  if (ornamental) {
    return (
      <div
        data-layer-index={layerIndex}
        style={{
          position: 'absolute',
          left: layer.x ?? 0,
          top: layer.y ?? 0,
          width: layer.w ?? 200,
          height: layer.h ?? 400,
          zIndex: layer.z ?? 0,
          transform: layer.rot ? `rotate(${layer.rot}deg)` : undefined,
        }}
      >
        <OrnamentalElement
          assetUrl={ornamental.asset_url ?? ''}
          w={layer.w ?? 200}
          h={layer.h ?? 400}
          colorMode={layer.color_mode ?? ornamental.color_mode}
          colorMap={Object.keys(ornamental.color_map ?? {}).length > 0 ? ornamental.color_map : undefined}
          tokens={tokens}
        />
      </div>
    )
  }

  const Elem = ELEMENTS[layer.element]
  if (!Elem) return null

  const boundData = resolveBind(layer.bind, data)
  const tokenValue = layer.token ? tokens[layer.token] : undefined

  const isFondo = layer.element === 'fondo'
  const isText = TEXT_ELEMENTS.has(layer.element)

  return (
    <div
      data-layer-index={layerIndex}
      style={{
        position: 'absolute',
        left: isFondo ? 0 : (layer.x ?? 0),
        top: isFondo ? 0 : (layer.y ?? 0),
        width: isFondo ? canvasW : isText ? 'fit-content' : (layer.w ?? 'auto'),
        zIndex: layer.z ?? 0,
        transform: layer.rot ? `rotate(${layer.rot}deg)` : undefined,
      }}
    >
      <Elem
        data={boundData}
        tokenValue={tokenValue}
        w={isFondo ? canvasW : isText ? undefined : (layer.w ?? undefined)}
        h={isFondo ? canvasH : undefined}
        size={layer.size}
      />
    </div>
  )
}

// ── Main renderer ──────────────────────────────────────────────────────────
interface TemplateRendererProps {
  composition: TemplateComposition
  tokens: RegionTokens
  data: MockData
  scale?: number
  elements?: DBElement[]
}

export default function TemplateRenderer({
  composition,
  tokens,
  data,
  scale = 0.4,
  elements = [],
}: TemplateRendererProps) {
  const { w, h } = composition.canvas

  // Build CSS custom properties from tokens
  const cssVars = Object.entries(tokens).reduce<Record<string, string>>((acc, [role, value]) => {
    acc[`--token-${role}`] = value
    return acc
  }, {})

  return (
    <div
      style={{
        width: w * scale,
        height: h * scale,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
          backgroundColor: tokens['bg'] ?? '#110D06',
          ...cssVars,
        }}
      >
        {[...composition.layers]
          .map((layer, originalIndex) => ({ layer, originalIndex }))
          .sort((a, b) => (a.layer.z ?? 0) - (b.layer.z ?? 0))
          .map(({ layer, originalIndex }) => (
            <LayerNode
              key={originalIndex}
              layer={layer}
              layerIndex={originalIndex}
              data={data}
              tokens={tokens}
              canvasW={w}
              canvasH={h}
              elements={elements}
            />
          ))}
      </div>
    </div>
  )
}
