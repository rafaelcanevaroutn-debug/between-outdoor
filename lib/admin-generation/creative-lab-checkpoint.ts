import fs from 'node:fs'
import path from 'node:path'

export type CreativeLabMolde = '1' | '2' | '6'

export interface CheckpointBudget {
  spentUsd: number
  responses: number
  inputTokens: number
  outputTokens: number
}

export interface CheckpointState {
  status: string
  budget: CheckpointBudget
  updatedAt?: string
  completedAt?: string
}

// Molde 2 y 6 comparten un único checkpoint: scripts/run-creative-lab-
// moldes-2-6.ts corre ambos moldes con un solo presupuesto encadenado,
// heredado la primera vez del checkpoint de Molde 1. No son autorizaciones
// independientes — es una sola cadena de USD 2.
const CHECKPOINT_FILE_BY_MOLDE: Record<CreativeLabMolde, string> = {
  '1': 'molde-1-paid-run.json',
  '2': 'moldes-2-6-paid-run.json',
  '6': 'moldes-2-6-paid-run.json',
}

const EMPTY_USAGE: CheckpointBudget = { spentUsd: 0, responses: 0, inputTokens: 0, outputTokens: 0 }

export function checkpointPathFor(checkpointDir: string, molde: CreativeLabMolde): string {
  return path.join(checkpointDir, CHECKPOINT_FILE_BY_MOLDE[molde])
}

export function readCheckpoint(checkpointDir: string, molde: CreativeLabMolde): CheckpointState | null {
  const filePath = checkpointPathFor(checkpointDir, molde)
  if (!fs.existsSync(filePath)) return null
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
  const budget = raw.budget as Partial<CheckpointBudget> | undefined
  if (
    !budget
    || typeof budget.spentUsd !== 'number'
    || typeof budget.responses !== 'number'
    || typeof budget.inputTokens !== 'number'
    || typeof budget.outputTokens !== 'number'
  ) {
    return null
  }
  return {
    status: typeof raw.status === 'string' ? raw.status : 'unknown',
    budget: { spentUsd: budget.spentUsd, responses: budget.responses, inputTokens: budget.inputTokens, outputTokens: budget.outputTokens },
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : undefined,
  }
}

// El presupuesto del que va a partir el script si corre AHORA para este
// molde — exactamente la misma resolución que hace el script (checkpoint
// propio, o heredado de Molde 1 para 2/6, o fresco solo para Molde 1).
// `willResume` dice si el próximo POST va a necesitar --resume: es cierto
// si y solo si el checkpoint PROPIO del target ya existe (moldes-2-6 no
// necesita --resume la primera vez, aunque herede gasto de Molde 1).
export function resolveBeforeUsage(
  checkpointDir: string,
  molde: CreativeLabMolde,
): { ok: true; usage: CheckpointBudget; willResume: boolean; sourceStatus: string | null } | { ok: false; error: string } {
  const own = readCheckpoint(checkpointDir, molde)
  if (own) return { ok: true, usage: own.budget, willResume: true, sourceStatus: own.status }
  if (molde === '1') return { ok: true, usage: EMPTY_USAGE, willResume: false, sourceStatus: null }
  const inherited = readCheckpoint(checkpointDir, '1')
  if (!inherited) {
    return {
      ok: false,
      error: 'Moldes 2 y 6 necesitan que Molde 1 haya corrido al menos una vez — todavía no hay gasto acumulado del que partir.',
    }
  }
  return { ok: true, usage: inherited.budget, willResume: false, sourceStatus: null }
}

// Snapshot conservador del gasto real: toma, entre los checkpoints que
// existan, el que reporta MÁS gastado — nunca subestima cuánto queda.
export function globalCheckpointUsage(checkpointDir: string): CheckpointBudget | null {
  const candidates = [readCheckpoint(checkpointDir, '1')?.budget, readCheckpoint(checkpointDir, '2')?.budget]
    .filter((budget): budget is CheckpointBudget => Boolean(budget))
  if (candidates.length === 0) return null
  return candidates.reduce((max, budget) => (budget.spentUsd > max.spentUsd ? budget : max))
}

export function resolveCreativeLabInvocation(molde: CreativeLabMolde, willResume: boolean): string[] {
  const resumeFlag = willResume ? ['--resume'] : []
  if (molde === '1') return ['scripts/run-creative-lab-molde-1.ts', '--execute', ...resumeFlag]
  return ['scripts/run-creative-lab-moldes-2-6.ts', `--mold=${molde}`, '--execute', ...resumeFlag]
}
