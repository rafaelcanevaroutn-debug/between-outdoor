import path from 'node:path'
import fs from 'node:fs'

export function loadKnowledge(filename: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'lib/knowledge', filename), 'utf-8')
  } catch {
    return ''
  }
}

export function loadAntiPatterns(): string {
  return loadKnowledge('global/anti-patterns.md')
}
