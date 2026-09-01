'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Layers,
  History,
  Info,
} from 'lucide-react'

interface Snapshot {
  limitUsd: number
  spentUsd: number
  remainingUsd: number
  responses: number
}
interface SpendRow {
  input_tokens: number
  output_tokens: number
  cost_usd: number
  created_at: string
  admin_user_id: string
  molde: string
}
interface Target {
  molde: string
  willResume: boolean
  sourceStatus: string | null
  error?: string
}
interface StatusResponse {
  snapshot?: Snapshot
  target?: Target | null
  history?: SpendRow[]
  available?: boolean
  reason?: string | null
  error?: string
}
interface RunError {
  error: string
  stderr?: string
  mode?: string
}
interface RunResult {
  success: true
  molde: string
  mode: 'execute' | 'resume'
  result: unknown
  snapshot: Snapshot
  noNewSpend: boolean
}

const MOLDE_OPTIONS = ['1', '2', '6']

export default function CurationConsole() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [molde, setMolde] = useState('1')
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<RunError | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)

  async function refresh(currentMolde: string) {
    const response = await fetch(`/api/admin/openai-curation?molde=${currentMolde}`)
    const json = (await response.json()) as StatusResponse
    setStatus(json)
  }

  useEffect(() => {
    refresh(molde)
  }, [molde])

  async function execute() {
    setRunning(true)
    setRunError(null)
    setResult(null)
    try {
      const response = await fetch('/api/admin/openai-curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ molde, confirm: true }),
      })
      const json = await response.json()
      if (!response.ok) {
        setRunError({
          error: json.error ?? 'Error al ejecutar la curaduría',
          stderr: json.stderr,
          mode: json.mode,
        })
        return
      }
      setResult(json as RunResult)
      await refresh(molde)
    } catch (cause) {
      setRunError({
        error: cause instanceof Error ? cause.message : 'Error al ejecutar la curaduría',
      })
    } finally {
      setRunning(false)
      setConfirming(false)
    }
  }

  const snapshot = status?.snapshot
  const target = status?.target ?? null
  const available = status?.available ?? false
  const canRun = available && Boolean(target) && !target?.error
  const modeLabel = target?.willResume ? 'Continuación (--resume)' : 'Nueva corrida (--execute)'

  return (
    <div className="flex flex-col gap-5">
      {/* Spend Guardrail */}
      <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--linea)]">
          <DollarSign className="w-4 h-4 text-[var(--cardon)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
            Guardarraíl de gasto (acumulado, USD)
          </span>
        </div>

        {snapshot ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--blanco-piedra)]/70 border border-[var(--linea)] rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Tope
              </span>
              <span className="text-xl font-bold font-display text-[var(--tinta)] mt-1">
                ${snapshot.limitUsd.toFixed(2)}
              </span>
            </div>

            <div className="bg-[var(--blanco-piedra)]/70 border border-[var(--linea)] rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Gastado
              </span>
              <span className="text-xl font-bold font-display text-rose-700 mt-1">
                ${snapshot.spentUsd.toFixed(4)}
              </span>
            </div>

            <div className="bg-[var(--blanco-piedra)]/70 border border-[var(--linea)] rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Remanente
              </span>
              <span className="text-xl font-bold font-display text-[var(--cardon)] mt-1">
                ${snapshot.remainingUsd.toFixed(4)}
              </span>
            </div>

            <div className="bg-[var(--blanco-piedra)]/70 border border-[var(--linea)] rounded-xl p-3.5 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                Respuestas OpenAI
              </span>
              <span className="text-xl font-bold font-display text-[var(--tinta)] mt-1">
                {snapshot.responses}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--piedra)]">
            {status?.error ?? 'Cargando guardarraíl…'}
          </p>
        )}

        {!available && status && status.reason && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            <Info className="w-4 h-4 shrink-0" />
            <span>{status.reason}</span>
          </div>
        )}
      </div>

      {/* Execution Console */}
      <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--linea)]">
          <Layers className="w-4 h-4 text-[var(--cardon)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
            Ejecutar corrida
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={molde}
            onChange={(event) => {
              setMolde(event.target.value)
              setConfirming(false)
              setResult(null)
              setRunError(null)
            }}
            className="bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-xl px-3.5 py-2 text-xs text-[var(--tinta)] font-semibold focus:outline-none focus:border-[var(--cardon)] focus:ring-1 focus:ring-[var(--cardon)] transition-all cursor-pointer w-48"
          >
            {MOLDE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                Molde {value}
              </option>
            ))}
          </select>

          {target && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                target.willResume
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40'
              }`}
            >
              {target.willResume ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{modeLabel}</span>
              {target.sourceStatus && (
                <span className="font-normal opacity-75">· checkpoint: {target.sourceStatus}</span>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-[var(--piedra)]">
          Moldes 3, 4 y 5 no usan IA — no tienen script de curaduría. Molde 2 y 6 comparten un único presupuesto encadenado.
        </p>

        {target?.error && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{target.error}</span>
          </div>
        )}

        {!confirming && (
          <div>
            <button
              type="button"
              disabled={!canRun}
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--cardon)] text-white hover:bg-[var(--cardon-oscuro)] shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Preparar corrida</span>
            </button>
          </div>
        )}

        {confirming && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">
                  {target?.willResume
                    ? 'Esto va a CONTINUAR una autorización paga existente (--resume).'
                    : 'Esto va a ABRIR una corrida nueva (--execute) y gastar contra OpenAI.'}
                </p>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  Remanente actual:{' '}
                  <strong>${snapshot?.remainingUsd.toFixed(4) ?? '—'}</strong> de $
                  {snapshot?.limitUsd.toFixed(2) ?? '—'} de tope acumulado.
                  {target?.willResume &&
                    ' Si el checkpoint ya tiene todo lo pedido completado, esto no va a gastar nada.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={running}
                onClick={execute}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>
                  {running
                    ? 'Ejecutando…'
                    : target?.willResume
                    ? 'Sí, continuar (--resume)'
                    : 'Sí, gastar y ejecutar'}
                </span>
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() => setConfirming(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {runError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col gap-2">
            <p role="alert" className="text-xs font-bold text-rose-700">
              {runError.error}
            </p>
            {runError.stderr && (
              <pre className="bg-[var(--blanco-piedra)] border border-rose-200 rounded-xl p-3 text-[11px] font-mono text-rose-900 overflow-x-auto max-h-48 whitespace-pre-wrap break-words m-0">
                {runError.stderr}
              </pre>
            )}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--linea)]">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--cardon)]">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {result.noNewSpend
                  ? `Corrida (${result.mode}) completada sin gasto nuevo — ya estaba todo hecho en el checkpoint.`
                  : `Corrida (${result.mode}) completada — gasto registrado en el historial.`}
              </span>
            </div>
            <pre className="bg-[var(--blanco-piedra)] border border-[var(--linea)] rounded-xl p-4 font-mono text-[11px] text-[var(--tinta)] overflow-x-auto max-h-96 whitespace-pre-wrap break-words m-0 shadow-inner">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Spend History */}
      <div className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)] flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--linea)]">
          <History className="w-4 h-4 text-[var(--cardon)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
            Historial de gasto
          </span>
        </div>

        {!status?.history || status.history.length === 0 ? (
          <p className="text-xs text-[var(--piedra)]">
            Sin corridas registradas todavía desde el admin.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--linea)]">
            {status.history.map((row, index) => (
              <div
                key={`${row.created_at}-${index}`}
                className="flex items-center justify-between py-2 text-xs text-[var(--tinta)]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold bg-[var(--blanco-piedra)] px-2 py-0.5 rounded border border-[var(--linea)]">
                    Molde {row.molde}
                  </span>
                  <span className="text-[var(--piedra)]">
                    {new Intl.DateTimeFormat('es-AR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(row.created_at))}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-[var(--cardon)]">
                    ${row.cost_usd.toFixed(4)}
                  </span>
                  <span className="text-[11px] text-[var(--piedra)]">
                    {row.input_tokens + row.output_tokens} tokens
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

