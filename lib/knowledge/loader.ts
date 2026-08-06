import fs   from 'node:fs'
import path from 'node:path'
import type { FormatoCarrusel, VideoFamilia3Subfamilia } from '@/types'

const KB_ROOT = path.join(process.cwd(), 'lib/knowledge')

/** Lee un archivo de la knowledge base. Devuelve '' si no existe o está vacío. */
function read(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(KB_ROOT, relativePath), 'utf-8').trim()
  } catch {
    return ''
  }
}

/** Compatibilidad del formato editorial actual: algunas guías dependen del tema. */
const EDITORIAL_TEMA_FORMATO_MAP: Record<string, string> = {
  testimonios:     'formatos/carrusel_storytelling.md',
  detras_del_guia: 'formatos/carrusel_storytelling.md',
  destinos:        'formatos/carrusel_storytelling.md',
  motivacion:      'formatos/reflexion.md',
  bienestar:       'formatos/reflexion.md',
}

/** Cada formato nuevo carga su guía de manera explícita, independiente del tema. */
const FORMATO_FILE_MAP: Record<Exclude<FormatoCarrusel, 'editorial'>, string> = {
  organico:     'formatos/carrusel_organico.md',
  itinerario:   'formatos/carrusel_itinerario.md',
  ascenso:      'formatos/carrusel_ascenso.md',
  calendario:   'formatos/carrusel_calendario.md',
  lugar:        'formatos/carrusel_lugar.md',
  conversacion: 'formatos/carrusel_conversacion.md',
}

export const VIDEO_FAMILY_3_FILE_MAP: Record<VideoFamilia3Subfamilia, string> = {
  '3a': 'formatos/video/video_reflexivo.md',
  '3b': 'formatos/video/video_pov.md',
  '3c': 'formatos/video/video_meme.md',
  '3d': 'formatos/video/video_conversacional.md',
  '3e': 'formatos/video/video_lugar.md',
}

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
  const lineamentoText   = read('global/lineamiento.md')
  const antiPatternsText = read('global/anti-patterns.md')
  const mundoText        = read(`nichos/${niche}/mundo.md`)
  const patronesText     = read(`nichos/${niche}/patrones.md`)

  // Voz: cliente específico → default → vacío (omitido)
  const vozText =
    (vozSlug ? read(`nichos/${niche}/voz/${vozSlug}.md`) : '') ||
    read(`nichos/${niche}/voz/default.md`) ||
    ''

  const formatoFile = formatoCarrusel === 'editorial'
    ? (EDITORIAL_TEMA_FORMATO_MAP[tema] ?? '')
    : FORMATO_FILE_MAP[formatoCarrusel]
  const formatoText = formatoFile ? read(formatoFile) : ''

  const temaText = read(`temas/${niche}/${tema}.md`)

  return {
    lineamentoText,
    antiPatternsText,
    mundoText,
    patronesText,
    vozText,
    formatoText,
    temaText,
  }
}

export function loadVideoContext({
  niche,
  subfamilia,
  vozSlug,
}: {
  niche: string
  subfamilia: VideoFamilia3Subfamilia
  vozSlug?: string
}): VideoContext {
  const lineamentoText   = read('global/lineamiento.md')
  const antiPatternsText = read('global/anti-patterns.md')
  const mundoText        = read(`nichos/${niche}/mundo.md`)
  const patronesText     = read(`nichos/${niche}/patrones.md`)
  const vozText =
    (vozSlug ? read(`nichos/${niche}/voz/${vozSlug}.md`) : '') ||
    read(`nichos/${niche}/voz/default.md`) ||
    ''
  const formatoText = read(VIDEO_FAMILY_3_FILE_MAP[subfamilia])

  return {
    lineamentoText,
    antiPatternsText,
    mundoText,
    patronesText,
    vozText,
    formatoText,
  }
}

/** Convierte el contexto en bloque de texto para inyectar en el prompt. */
export function contextToPromptBlock(ctx: CarruselContext, includeAntiPatterns: boolean): string {
  const sections: string[] = []

  if (ctx.lineamentoText)   sections.push(`=== LINEAMIENTO ===\n${ctx.lineamentoText}`)
  if (ctx.mundoText)        sections.push(`=== MUNDO DEL NICHO ===\n${ctx.mundoText}`)
  if (ctx.patronesText)     sections.push(`=== PATRONES DE COMUNICACIÓN ===\n${ctx.patronesText}`)
  if (ctx.vozText)          sections.push(`=== VOZ Y TONO ===\n${ctx.vozText}`)
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
