import type { FormatoCarrusel, VideoKnowledgeFormat } from '@/types'
import {
  layerText,
  resolveCarouselKnowledge,
  resolveVideoKnowledge,
  VIDEO_FAMILY_3_FILE_MAP,
  VIDEO_KNOWLEDGE_FILE_MAP,
} from '../content-engine/knowledge-registry.ts'

export { VIDEO_FAMILY_3_FILE_MAP, VIDEO_KNOWLEDGE_FILE_MAP }

export interface LoadCarruselContextOptions {
  niche: string
  tema: string
  formatoCarrusel: FormatoCarrusel
  vozSlug?: string
}

export interface CarruselContext {
  lineamentoText:   string  // global/lineamiento.md
  antiPatternsText: string  // global/anti-patterns.md
  mundoText:        string  // nichos/[niche]/mundo.md
  patronesText:     string  // nichos/[niche]/patrones.md
  vozText:          string  // nichos/[niche]/voz/[vozSlug].md → default.md → ''
  formatoText:      string  // formatos/[formato].md según tema
  temaText:         string  // temas/[niche]/[tema].md
}

export interface VideoContext {
  lineamentoText:   string
  antiPatternsText: string
  mundoText:        string
  patronesText:     string
  vozText:          string
  formatoText:      string
}

/**
 * Ensambla el contexto de knowledge base por capas para un carrusel.
 *
 * @param niche     - nicho del cliente (ej: 'trekking')
 * @param tema      - tema asignado (ej: 'destinos')
 * @param vozSlug   - slug del cliente para voz personalizada (ej: 'montania_viva').
 *                    Si no se provee o el archivo no existe, usa voz/default.md.
 *                    Si default.md también está vacío, la capa se omite.
 */
export function loadCarruselContext({
  niche,
  tema,
  formatoCarrusel,
  vozSlug,
}: LoadCarruselContextOptions): CarruselContext {
  const layers = resolveCarouselKnowledge({
    niche,
    theme: tema,
    format: formatoCarrusel,
    voiceSlug: vozSlug,
  })

  return {
    lineamentoText: layerText(layers, 'lineamiento'),
    antiPatternsText: layerText(layers, 'anti_patterns'),
    mundoText: layerText(layers, 'mundo'),
    patronesText: layerText(layers, 'patrones'),
    vozText: layerText(layers, 'voz'),
    formatoText: layerText(layers, 'formato'),
    temaText: layerText(layers, 'tema'),
  }
}

export function loadVideoContext({
  niche,
  subfamilia,
  vozSlug,
}: {
  niche: string
  subfamilia: VideoKnowledgeFormat
  vozSlug?: string
}): VideoContext {
  const layers = resolveVideoKnowledge({ niche, format: subfamilia, voiceSlug: vozSlug })

  return {
    lineamentoText: layerText(layers, 'lineamiento'),
    antiPatternsText: layerText(layers, 'anti_patterns'),
    mundoText: layerText(layers, 'mundo'),
    patronesText: layerText(layers, 'patrones'),
    vozText: layerText(layers, 'voz'),
    formatoText: layerText(layers, 'formato'),
  }
}

/**
 * Convierte el contexto en un bloque para el prompt.
 * `continuation` evita reenviar mundo/patrones/globales en cada etapa del
 * mismo carrusel: el desarrollo ya recibe el ángulo y la portada aprobados.
 */
export function contextToPromptBlock(
  ctx: CarruselContext,
  includeAntiPatterns: boolean,
  scope: 'full' | 'continuation' = 'full',
): string {
  const sections: string[] = []

  if (scope === 'full' && ctx.lineamentoText) sections.push(`=== LINEAMIENTO ===\n${ctx.lineamentoText}`)
  if (scope === 'full' && ctx.mundoText) sections.push(`=== MUNDO DEL NICHO ===\n${ctx.mundoText}`)
  if (scope === 'full' && ctx.patronesText) sections.push(`=== PATRONES DE COMUNICACIÓN ===\n${ctx.patronesText}`)
  if (scope === 'full' && ctx.vozText) sections.push(`=== VOZ Y TONO ===\n${ctx.vozText}`)
  if (ctx.formatoText)      sections.push(`=== GUÍA DE FORMATO ===\n${ctx.formatoText}`)
  if (ctx.temaText)         sections.push(`=== GUÍA DE TEMA ===\n${ctx.temaText}`)
  if (includeAntiPatterns && ctx.antiPatternsText) {
    sections.push(`=== PROHIBICIONES ===\n${ctx.antiPatternsText}`)
  }

  return sections.join('\n\n')
}

export function videoContextToPromptBlock(ctx: VideoContext): string {
  const sections: string[] = []

  if (ctx.lineamentoText)   sections.push(`=== LINEAMIENTO ===\n${ctx.lineamentoText}`)
  if (ctx.mundoText)        sections.push(`=== MUNDO DEL NICHO ===\n${ctx.mundoText}`)
  if (ctx.patronesText)     sections.push(`=== PATRONES DE COMUNICACIÓN ===\n${ctx.patronesText}`)
  if (ctx.vozText)          sections.push(`=== VOZ Y TONO ===\n${ctx.vozText}`)
  if (ctx.formatoText)      sections.push(`=== GUÍA DE FORMATO ===\n${ctx.formatoText}`)
  if (ctx.antiPatternsText) sections.push(`=== PROHIBICIONES ===\n${ctx.antiPatternsText}`)

  return sections.join('\n\n')
}
