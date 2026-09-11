import fs from 'node:fs'
import path from 'node:path'
import type { Niche } from '@/types'

// Maps Niche type values to their knowledge file names
const NICHE_FILE_MAP: Record<Niche, string> = {
  trekking: 'trekking',
  running: 'running',
  ciclismo: 'ciclismo',
  turismo_aventura: 'turismo-aventura',
}

interface KnowledgeFile {
  label: string
  relativePath: string
  fallbackPath?: string
}

function readKnowledgeFile(relativePath: string, fallbackPath?: string): { content: string; resolvedPath: string } | null {
  const fullPath = path.join(process.cwd(), 'knowledge', relativePath)
  try {
    if (fs.existsSync(fullPath)) {
      return { content: fs.readFileSync(fullPath, 'utf-8'), resolvedPath: `knowledge/${relativePath}` }
    }
  } catch {}

  if (fallbackPath) {
    const fallbackFullPath = path.join(process.cwd(), 'knowledge', fallbackPath)
    try {
      if (fs.existsSync(fallbackFullPath)) {
        return { content: fs.readFileSync(fallbackFullPath, 'utf-8'), resolvedPath: `knowledge/${fallbackPath}` }
      }
    } catch {}
  }

  return null
}

export interface BuiltContext {
  // The assembled context text to inject into the prompt
  text: string
  // List of files that were successfully loaded (for logging)
  filesLoaded: string[]
  // List of files that were missing (for logging)
  filesMissing: string[]
}

export type CopySubvertical =
  | 'trekking_local'
  | 'trekking_expedicion'
  | 'playa_caribe'
  | 'europa_ciudad'
  | 'otro_nicho'

export interface BuildNicheContextOptions {
  tipoViaje?: string
  subvertical?: string
  destino?: string
  formato?: 'carrusel' | 'video' | 'flyer' | 'historia'
}

export function resolveCopySubvertical(
  niche: Niche,
  options?: BuildNicheContextOptions,
): CopySubvertical {
  const sv = options?.subvertical?.toLowerCase()
  const tipo = options?.tipoViaje?.toLowerCase()
  const dest = options?.destino?.toLowerCase() || ''

  if (sv === 'playa_caribe' || tipo === 'viaje_playa_caribe') {
    return 'playa_caribe'
  }
  if (sv === 'europa_ciudad') {
    return 'europa_ciudad'
  }
  if (/canc[uú]n|playa del carmen|caribe|punta cana|tulum|riviera maya/i.test(dest)) {
    return 'playa_caribe'
  }
  if (/madrid|roma|par[ií]s|barcelona|italia|españa|francia|londres|europa/i.test(dest)) {
    return 'europa_ciudad'
  }
  if (sv === 'trekking_local' || (niche === 'trekking' && tipo === 'salida_recurrente')) {
    return 'trekking_local'
  }
  if (/horco molle|san javier|lules|cadillal|aguas chiquitas|periurban/i.test(dest)) {
    return 'trekking_local'
  }
  if (sv === 'trekking_expedicion' || (niche === 'trekking' && (tipo === 'expedicion_premium' || tipo === 'expedicion_montana'))) {
    return 'trekking_expedicion'
  }
  if (/chalt[eé]n|fitz roy|lan[ií]n|aconcagua|cordillera|andes|patagonia/i.test(dest)) {
    return 'trekking_expedicion'
  }

  // Fallbacks según nicho y tipo
  if (niche === 'trekking') {
    return tipo === 'salida_recurrente' ? 'trekking_local' : 'trekking_expedicion'
  }
  if (niche === 'turismo_aventura') {
    return 'playa_caribe'
  }
  return 'otro_nicho'
}

export function buildNicheContext(niche: Niche, options?: BuildNicheContextOptions): BuiltContext {
  const nicheFile = NICHE_FILE_MAP[niche]
  const resolvedSubvertical = resolveCopySubvertical(niche, options)

  const filesToLoad: KnowledgeFile[] = [
    // 1. Agente Orquestador Canónico de Claude
    { label: 'Agente Copy Principal', relativePath: 'agents/copy-agent/agent.md' },

    // 2. Estándares Editoriales de la Marca (Skill del Agente)
    { label: 'Voz y Tono de Marca',    relativePath: 'agents/copy-agent/skills/editorial-standards/reference/brand-voice.md' },
    { label: 'Modelo de Negocio',      relativePath: 'agents/copy-agent/skills/editorial-standards/reference/business-model.md' },
    { label: 'Anti-Patrones y Reglas', relativePath: 'agents/copy-agent/skills/editorial-standards/reference/anti-patterns.md' },
  ]

  // 3. Dominio, Patrones y Subagentes según la vertical aislada
  if (resolvedSubvertical === 'playa_caribe') {
    // VIAJES INTERNACIONALES: PLAYA Y CARIBE (CERO vocabulario de trekking/montaña)
    filesToLoad.push(
      {
        label: 'Subagente: Redactor Viajes Internacionales',
        relativePath: 'agents/copy-agent/subagents/international-travel-writer.md',
      },
      {
        label: 'Skill Especializada: Viajes Internacionales',
        relativePath: 'agents/copy-agent/skills/international-travel/SKILL.md',
      },
      {
        label: 'Guía de Dominio: Playa y Caribe',
        relativePath: 'agents/copy-agent/skills/international-travel/reference/caribbean-beach.md',
      },
      {
        label: 'Banco de Ejemplos: Viajes Internacionales',
        relativePath: 'agents/copy-agent/skills/international-travel/reference/travel-examples.md',
      },
      {
        label: 'Anti-Patrones: Viajes Internacionales',
        relativePath: 'agents/copy-agent/skills/international-travel/reference/anti-patterns.md',
      }
    )
  } else if (resolvedSubvertical === 'europa_ciudad') {
    // VIAJES INTERNACIONALES: EUROPA Y CIUDADES CULTURALES (CERO vocabulario de trekking/montaña)
    filesToLoad.push(
      {
        label: 'Subagente: Redactor Viajes Internacionales',
        relativePath: 'agents/copy-agent/subagents/international-travel-writer.md',
      },
      {
        label: 'Skill Especializada: Viajes Internacionales',
        relativePath: 'agents/copy-agent/skills/international-travel/SKILL.md',
      },
      {
        label: 'Guía de Dominio: Europa y Ciudades Culturales',
        relativePath: 'agents/copy-agent/skills/international-travel/reference/european-city.md',
      },
      {
        label: 'Banco de Ejemplos: Viajes Internacionales',
        relativePath: 'agents/copy-agent/skills/international-travel/reference/travel-examples.md',
      },
      {
        label: 'Anti-Patrones: Viajes Internacionales',
        relativePath: 'agents/copy-agent/skills/international-travel/reference/anti-patterns.md',
      }
    )
  } else if (resolvedSubvertical === 'trekking_local') {
    // TREKKING: SUBVERTICAL LOCAL Y RECURRENTE (Hábito, comunidad, cercanía)
    filesToLoad.push(
      { label: 'Vertical Dominio: trekking',  relativePath: 'agents/copy-agent/skills/vertical-trekking/reference/domain.md' },
      { label: 'Vertical Patrones: trekking', relativePath: 'agents/copy-agent/skills/vertical-trekking/reference/patterns.md' },
      { label: 'Vertical Ejemplos: trekking', relativePath: 'agents/copy-agent/skills/vertical-trekking/reference/real-examples.md' },
      {
        label: 'Subagente: Redactor Salidas Locales',
        relativePath: 'agents/copy-agent/subagents/local-recurring-writer.md',
      },
      {
        label: 'Skill Especializada: Salidas Locales y Recurrentes',
        relativePath: 'agents/copy-agent/skills/local-recurring-content/SKILL.md',
      },
      {
        label: 'Banco de Ejemplos Locales y Recurrentes',
        relativePath: 'agents/copy-agent/skills/local-recurring-content/reference/local-examples.md',
      }
    )
  } else if (resolvedSubvertical === 'trekking_expedicion') {
    // TREKKING: SUBVERTICAL EXPEDICIÓN Y ALTA MONTAÑA (Chaltén, Lanín, Cordillera)
    filesToLoad.push(
      { label: 'Vertical Dominio: trekking',  relativePath: 'agents/copy-agent/skills/vertical-trekking/reference/domain.md' },
      { label: 'Vertical Patrones: trekking', relativePath: 'agents/copy-agent/skills/vertical-trekking/reference/patterns.md' },
      { label: 'Vertical Ejemplos: trekking', relativePath: 'agents/copy-agent/skills/vertical-trekking/reference/real-examples.md' },
      {
        label: 'Subagente: Redactor Grandes Expediciones',
        relativePath: 'agents/copy-agent/subagents/expedition-writer.md',
      },
      {
        label: 'Skill Especializada: Grandes Expediciones',
        relativePath: 'agents/copy-agent/skills/expedition-high-ticket/SKILL.md',
      },
      {
        label: 'Directrices de Expedición',
        relativePath: 'agents/copy-agent/skills/expedition-high-ticket/reference/expedition-guidelines.md',
      },
      {
        label: 'Banco de Ejemplos Expediciones',
        relativePath: 'agents/copy-agent/skills/expedition-high-ticket/reference/expedition-examples.md',
      }
    )
  } else {
    // Otros nichos (running, ciclismo, etc.)
    filesToLoad.push(
      { label: `Vertical Dominio: ${niche}`,  relativePath: `agents/copy-agent/skills/vertical-${nicheFile}/reference/domain.md` },
      { label: `Vertical Patrones: ${niche}`, relativePath: `agents/copy-agent/skills/vertical-${nicheFile}/reference/patterns.md` },
      { label: `Vertical Ejemplos: ${niche}`, relativePath: `agents/copy-agent/skills/vertical-${nicheFile}/reference/real-examples.md` },
      {
        label: 'Subagente: Redactor Grandes Expediciones',
        relativePath: 'agents/copy-agent/subagents/expedition-writer.md',
      },
      {
        label: 'Skill Especializada: Grandes Expediciones',
        relativePath: 'agents/copy-agent/skills/expedition-high-ticket/SKILL.md',
      }
    )
  }

  // 4. Skills atómicas comunes del Agente
  filesToLoad.push(
    { label: 'Skill: Hook Crafting',        relativePath: 'agents/copy-agent/skills/hook-crafting/SKILL.md' },
    { label: 'Skill: Manejo de Objeciones', relativePath: 'agents/copy-agent/skills/objection-handling/SKILL.md' },
    { label: 'Skill: Conversion CTA',       relativePath: 'agents/copy-agent/skills/conversion-cta/SKILL.md' }
  )

  // 5. Inyección condicional de formato
  if (options?.formato === 'carrusel') {
    filesToLoad.push({
      label: 'Skill Formato: Carrusel',
      relativePath: 'agents/copy-agent/skills/format-carousel/SKILL.md',
    })
  } else if (options?.formato === 'video') {
    filesToLoad.push({
      label: 'Skill Formato: Video Vertical',
      relativePath: 'agents/copy-agent/skills/format-video-reel/SKILL.md',
    })
  }

  // 6. Auditor de Calidad (Subagente final con verificación de separación)
  filesToLoad.push({
    label: 'Subagente: Auditor de Calidad',
    relativePath: 'agents/copy-agent/subagents/quality-auditor.md',
  })

  const filesLoaded: string[] = []
  const filesMissing: string[] = []
  const sections: string[] = []

  for (const file of filesToLoad) {
    const result = readKnowledgeFile(file.relativePath, file.fallbackPath)
    if (result) {
      filesLoaded.push(result.resolvedPath)
      sections.push(`=== ${file.label.toUpperCase()} ===\n${result.content.trim()}`)
    } else {
      filesMissing.push(`knowledge/${file.relativePath}`)
    }
  }

  return {
    text: sections.join('\n\n'),
    filesLoaded,
    filesMissing,
  }
}

export function logContextInjection(niche: Niche, vertical: string, context: BuiltContext, subvertical?: string): void {
  const SEP = '─'.repeat(70)
  console.log(`\n${SEP}`)
  const svLabel = subvertical ? ` | subvertical=${subvertical}` : ''
  console.log(`[CONTEXT] nicho=${niche} | vertical=${vertical}${svLabel}`)
  console.log(`[CONTEXT] Archivos inyectados (${context.filesLoaded.length}):`)
  for (const f of context.filesLoaded) {
    console.log(`  ✓  ${f}`)
  }
  if (context.filesMissing.length > 0) {
    console.log(`[CONTEXT] Archivos faltantes (${context.filesMissing.length}):`)
    for (const f of context.filesMissing) {
      console.log(`  ✗  ${f}`)
    }
  }
  console.log(SEP)
}
