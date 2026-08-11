import type { VideoTypographyId } from '@/types'
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
// (la pieza 6 repite la tipografía de la 1, la 7 la de la 2, etc.) — es
// la única política que garantiza cero repetidos dentro de cualquier
// ventana de 5 piezas consecutivas. No falla, no re-shufflea.
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
