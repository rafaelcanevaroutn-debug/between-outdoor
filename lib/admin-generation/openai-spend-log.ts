import type { OpenAICreativeBudgetSnapshot } from '@/lib/creative-lab/openai-budget'

export interface SpendLogRow {
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

type CumulativeUsage = Pick<OpenAICreativeBudgetSnapshot, 'spentUsd' | 'responses' | 'inputTokens' | 'outputTokens'>

// Reconstruye el gasto acumulado histórico a partir de las filas persistidas
// en admin_openai_spend_log, para pasarlo como `initialUsage` a
// openAICreativeBudgetFromEnv — el mismo rol que cumple el checkpoint JSON
// local en los scripts CLI, pero sobrevive entre invocaciones de proceso.
export function sumSpendLogRows(rows: SpendLogRow[]): CumulativeUsage {
  return rows.reduce<CumulativeUsage>(
    (acc, row) => ({
      spentUsd: acc.spentUsd + row.cost_usd,
      responses: acc.responses + 1,
      inputTokens: acc.inputTokens + row.input_tokens,
      outputTokens: acc.outputTokens + row.output_tokens,
    }),
    { spentUsd: 0, responses: 0, inputTokens: 0, outputTokens: 0 },
  )
}

// Los scripts run-creative-lab-*.ts solo reportan un snapshot agregado al
// final de la corrida (budget.snapshot()), no un desglose por respuesta
// individual de OpenAI. Sin modificar esos scripts, la granularidad real
// alcanzable es "una fila por corrida admin", calculada como la diferencia
// entre el snapshot acumulado antes de correr y el que devuelve el script.
export function computeSpendDelta(before: CumulativeUsage, after: CumulativeUsage): SpendLogRow & { responses: number } {
  return {
    cost_usd: Math.max(0, after.spentUsd - before.spentUsd),
    input_tokens: Math.max(0, after.inputTokens - before.inputTokens),
    output_tokens: Math.max(0, after.outputTokens - before.outputTokens),
    responses: Math.max(0, after.responses - before.responses),
  }
}

export function validateCurationConfirmation(body: unknown): { ok: true; molde: string } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Cuerpo inválido' }
  const { molde, confirm } = body as Record<string, unknown>
  if (typeof molde !== 'string' || !molde.trim()) return { ok: false, error: 'molde es requerido' }
  if (confirm !== true) {
    return { ok: false, error: 'Se requiere confirmación explícita (confirm: true) antes de gastar' }
  }
  return { ok: true, molde: molde.trim() }
}
