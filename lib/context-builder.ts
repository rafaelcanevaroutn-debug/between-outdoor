import fs from 'node:fs'
import path from 'node:path'
import { Niche } from '@/types'

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
}

function readKnowledgeFile(relativePath: string): string | null {
  const fullPath = path.join(process.cwd(), 'knowledge', relativePath)
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return null
  }
}

export interface BuiltContext {
  // The assembled context text to inject into the prompt
  text: string
  // List of files that were successfully loaded (for logging)
  filesLoaded: string[]
  // List of files that were missing (for logging)
  filesMissing: string[]
}

export function buildNicheContext(niche: Niche): BuiltContext {
  const nicheFile = NICHE_FILE_MAP[niche]

  const filesToLoad: KnowledgeFile[] = [
    { label: 'Lineamiento Between',   relativePath: 'global/lineamiento-between.md' },
    { label: 'Modelo de Negocio',     relativePath: 'global/modelo-negocio.md' },
    { label: 'Ventas',                relativePath: 'global/ventas.md' },
    { label: 'Formatos de Contenido', relativePath: 'global/formatos-contenido.md' },
    { label: `Nicho: ${niche}`,       relativePath: `nichos/${nicheFile}.md` },
    { label: `Insights: ${niche}`,    relativePath: `insights/${nicheFile}-insights.md` },
    { label: 'Agente Copy',           relativePath: 'agentes/agente-copy.md' },
  ]

  const filesLoaded: string[] = []
  const filesMissing: string[] = []
  const sections: string[] = []

  for (const file of filesToLoad) {
    const content = readKnowledgeFile(file.relativePath)
    if (content) {
      filesLoaded.push(`knowledge/${file.relativePath}`)
      sections.push(`=== ${file.label.toUpperCase()} ===\n${content.trim()}`)
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
