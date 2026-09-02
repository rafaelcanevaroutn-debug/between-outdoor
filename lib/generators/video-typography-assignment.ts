import type { VideoKnowledgeFormat, VideoTypographyId } from '@/types'
import { VIDEO_TYPOGRAPHY_CATALOG } from './video-typography.ts'

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Una tipografía distinta por pieza dentro de una misma generación
// múltiple (batch, o varias subfamilias juntas en el individual). Con 1
// sola pieza la regla no aplica — se manda el catálogo completo y Gemini
// elige libre. Con más de 5 piezas, rota en el mismo orden ya shuffleado
// rota recién después de agotar el catálogo completo. Así garantizamos
// cero repetidos dentro de cualquier semana normal sin perder ninguna de
// las familias tipográficas habilitadas. No falla, no re-shufflea.
//
// El resultado es la lista `tipografiasPermitidas` a mandarle a
// /api/generate en la llamada de esa pieza puntual — un solo elemento
// cuando hay que forzar una tipografía exacta, el catálogo entero cuando
// da lo mismo cuál elija Gemini.
export function assignDistinctTypographies(count: number): VideoTypographyId[][] {
  if (count <= 1) {
    return Array.from({ length: Math.max(count, 0) }, () => [...VIDEO_TYPOGRAPHY_CATALOG])
  }
  const order = shuffled(VIDEO_TYPOGRAPHY_CATALOG)
  return Array.from({ length: count }, (_, i) => [order[i % order.length]])
}

const CURATED_VIDEO_TYPOGRAPHIES: Record<VideoKnowledgeFormat, readonly VideoTypographyId[]> = {
  '1a': ['Inter', 'Montserrat', 'plex'],
  '1b': ['poppins', 'plex', 'Inter'],
  '1c': ['oswald', 'poppins', 'plex'],
  '2a': ['oswald', 'plex', 'poppins'],
  '2b': ['plex', 'poppins', 'oswald'],
  '2c': ['poppins', 'plex', 'Inter'],
  '3a': ['cormorant', 'Playfair Display', 'crimson text', 'elegant'],
  '3b': ['poppins', 'plex', 'modern', 'Inter'],
  '3c': ['oswald', 'poppins', 'Bangers', 'plex'],
  '3d': ['plex', 'Montserrat', 'poppins', 'Inter'],
  '3e': ['cinzel', 'cormorant', 'Playfair Display', 'elegant'],
  '4': ['oswald', 'poppins', 'plex', 'Montserrat'],
  '5': ['plex', 'poppins', 'Inter'],
}

export function curatedVideoTypographyPool(family: VideoKnowledgeFormat): VideoTypographyId[] {
  return [...CURATED_VIDEO_TYPOGRAPHIES[family]]
}

/**
 * Una vez que el cliente configuró su sistema tipográfico, ninguna familia
 * puede volver silenciosamente al catálogo genérico. La asignación puntual
 * de la familia manda; si falta, se reutiliza el pool global elegido para ese
 * cliente. El catálogo curado solo existe para cuentas todavía sin configurar.
 */
export function resolveClientVideoTypographyPool(
  family: VideoKnowledgeFormat,
  familyTypographyIds: readonly VideoTypographyId[],
  clientTypographyIds: readonly VideoTypographyId[],
): VideoTypographyId[] {
  const familyPool = [...new Set(familyTypographyIds)]
  if (familyPool.length > 0) return familyPool
  const clientPool = [...new Set(clientTypographyIds)]
  return clientPool.length > 0 ? clientPool : curatedVideoTypographyPool(family)
}

/**
 * Elige una sola fuente por video y agota las opciones disponibles antes de
 * repetir. Respeta el pool configurado por el cliente; el catálogo curado se
 * usa únicamente cuando el cliente todavía no eligió tipografías.
 */
export function assignDistinctTypographiesFromPools(
  pools: readonly (readonly VideoTypographyId[])[],
  seed = 0,
): VideoTypographyId[][] {
  const used = new Set<VideoTypographyId>()
  return pools.map((pool, pieceIndex) => {
    const candidates = [...new Set(pool)]
    if (candidates.length === 0) candidates.push('Inter')
    const start = Math.abs(seed + pieceIndex) % candidates.length
    const selected = Array.from({length: candidates.length}, (_, offset) => (
      candidates[(start + offset) % candidates.length]
    )).find(candidate => !used.has(candidate)) ?? candidates[start]
    used.add(selected)
    return [selected]
  })
}
