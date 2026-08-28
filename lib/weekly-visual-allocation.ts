export interface WeeklyVisualAsset {
  id: string
  name: string
}

export interface WeeklyVisualSelection {
  ids: string[]
  names: string[]
  reusedAfterExhaustion: boolean
}

function hashText(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function deterministicOrder(assets: readonly WeeklyVisualAsset[], seed: string): WeeklyVisualAsset[] {
  return [...assets]
    .filter((asset, index, all) => asset.id.trim() && all.findIndex(candidate => candidate.id === asset.id) === index)
    .sort((left, right) => {
      const score = hashText(`${seed}:${left.id}`) - hashText(`${seed}:${right.id}`)
      return score || left.id.localeCompare(right.id)
    })
}

/**
 * Reparte el banco visual a nivel de semana. Mientras queden fotos sin usar,
 * ninguna pieza vuelve a recibir una ya asignada. Si el banco no alcanza,
 * abre un ciclo nuevo recién después de haber agotado todas las disponibles.
 * Dentro de una pieza nunca duplica una foto si el banco tiene suficientes.
 */
export function createWeeklyVisualAllocator(
  assetsBySalidaId: Map<string, readonly WeeklyVisualAsset[]>,
  seed: string,
) {
  const state = new Map<string, {
    ordered: WeeklyVisualAsset[]
    cursor: number
    usedThisCycle: Set<string>
  }>()

  const getState = (salidaId: string) => {
    const existing = state.get(salidaId)
    if (existing) return existing
    const created = {
      ordered: deterministicOrder(assetsBySalidaId.get(salidaId) ?? [], `${seed}:${salidaId}`),
      cursor: 0,
      usedThisCycle: new Set<string>(),
    }
    state.set(salidaId, created)
    return created
  }

  return {
    allocate(salidaId: string, requested: number): WeeklyVisualSelection {
      const visualState = getState(salidaId)
      const count = Math.max(0, Math.floor(requested))
      if (count === 0 || visualState.ordered.length === 0) {
        return { ids: [], names: [], reusedAfterExhaustion: false }
      }

      const selected: WeeklyVisualAsset[] = []
      const selectedInsidePiece = new Set<string>()
      let reusedAfterExhaustion = false
      let guard = 0
      const maxGuard = Math.max(visualState.ordered.length * Math.max(3, count + 1), 20)

      while (selected.length < count && guard < maxGuard) {
        guard += 1
        if (visualState.usedThisCycle.size >= visualState.ordered.length) {
          visualState.usedThisCycle.clear()
          reusedAfterExhaustion = true
        }
        const candidate = visualState.ordered[visualState.cursor % visualState.ordered.length]
        visualState.cursor = (visualState.cursor + 1) % visualState.ordered.length
        if (!candidate || visualState.usedThisCycle.has(candidate.id)) continue

        visualState.usedThisCycle.add(candidate.id)
        if (selectedInsidePiece.has(candidate.id)) {
          // Si la pieza pide más imágenes que las existentes, repetimos sólo
          // después de agotar el banco. Con banco suficiente nunca entra acá.
          if (selectedInsidePiece.size < visualState.ordered.length) continue
        }
        selectedInsidePiece.add(candidate.id)
        selected.push(candidate)
      }

      return {
        ids: selected.map(asset => asset.id),
        names: selected.map(asset => asset.name),
        reusedAfterExhaustion,
      }
    },
  }
}
