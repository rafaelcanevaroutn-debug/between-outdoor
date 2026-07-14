import fs   from 'node:fs'
import path from 'node:path'

const KB_ROOT = path.join(process.cwd(), 'lib/knowledge')

/** Lee un archivo de la knowledge base. Devuelve '' si no existe o está vacío. */
function read(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(KB_ROOT, relativePath), 'utf-8').trim()
  } catch {
    return ''
  }
}

/** Mapeo tema → archivo de formato */
const TEMA_FORMATO_MAP: Record<string, string> = {
  testimonios:     'formatos/carrusel_storytelling.md',
  detras_del_guia: 'formatos/carrusel_storytelling.md',
  destinos:        'formatos/carrusel_storytelling.md',
  motivacion:      'formatos/reflexion.md',
  bienestar:       'formatos/reflexion.md',
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

/**
 * Ensambla el contexto de knowledge base por capas para un carrusel.
 *
 * @param niche     - nicho del cliente (ej: 'trekking')
 * @param tema      - tema asignado (ej: 'destinos')
 * @param vozSlug   - slug del cliente para voz personalizada (ej: 'montania_viva').
 *                    Si no se provee o el archivo no existe, usa voz/default.md.
 *                    Si default.md también está vacío, la capa se omite.
 */
export function loadCarruselContext(
  niche: string,
  tema: string,
  vozSlug?: string,
): CarruselContext {
  const lineamentoText   = read('global/lineamiento.md')
  const antiPatternsText = read('global/anti-patterns.md')
  const mundoText        = read(`nichos/${niche}/mundo.md`)
  const patronesText     = read(`nichos/${niche}/patrones.md`)

  // Voz: cliente específico → default → vacío (omitido)
  const vozText =
    (vozSlug ? read(`nichos/${niche}/voz/${vozSlug}.md`) : '') ||
    read(`nichos/${niche}/voz/default.md`) ||
    ''

  const formatoFile = TEMA_FORMATO_MAP[tema] ?? ''
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
