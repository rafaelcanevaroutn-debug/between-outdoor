'use client'

import { useEffect, useState } from 'react'

interface Snapshot { limitUsd: number; spentUsd: number; remainingUsd: number; responses: number }
interface SpendRow { input_tokens: number; output_tokens: number; cost_usd: number; created_at: string; admin_user_id: string; molde: string }
interface Target { molde: string; willResume: boolean; sourceStatus: string | null; error?: string }
interface StatusResponse { snapshot?: Snapshot; target?: Target | null; history?: SpendRow[]; available?: boolean; reason?: string | null; error?: string }
interface RunError { error: string; stderr?: string; mode?: string }
interface RunResult { success: true; molde: string; mode: 'execute' | 'resume'; result: unknown; snapshot: Snapshot; noNewSpend: boolean }

const SECTION_STYLE: React.CSSProperties = {
  background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: 16,
  display: 'flex', flexDirection: 'column', gap: 10,
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
    const json = await response.json() as StatusResponse
    setStatus(json)
  }

  useEffect(() => { refresh(molde) }, [molde])

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
        setRunError({ error: json.error ?? 'Error al ejecutar la curaduría', stderr: json.stderr, mode: json.mode })
        return
      }
      setResult(json as RunResult)
      await refresh(molde)
    } catch (cause) {
      setRunError({ error: cause instanceof Error ? cause.message : 'Error al ejecutar la curaduría' })
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={SECTION_STYLE}>
        <span style={{ color: '#7E9286', fontSize: 11 }}>Guardarraíl de gasto (acumulado, USD)</span>
        {snapshot ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
            <div><div style={{ color: '#EAF2EC', fontSize: 18, fontWeight: 750 }}>${snapshot.limitUsd.toFixed(2)}</div><div style={{ color: '#7E9286', fontSize: 10 }}>Tope</div></div>
            <div><div style={{ color: '#fb7185', fontSize: 18, fontWeight: 750 }}>${snapshot.spentUsd.toFixed(4)}</div><div style={{ color: '#7E9286', fontSize: 10 }}>Gastado</div></div>
            <div><div style={{ color: '#34D17E', fontSize: 18, fontWeight: 750 }}>${snapshot.remainingUsd.toFixed(4)}</div><div style={{ color: '#7E9286', fontSize: 10 }}>Remanente</div></div>
            <div><div style={{ color: '#EAF2EC', fontSize: 18, fontWeight: 750 }}>{snapshot.responses}</div><div style={{ color: '#7E9286', fontSize: 10 }}>Respuestas OpenAI</div></div>
          </div>
        ) : (
          <p style={{ color: '#526159', fontSize: 12, margin: 0 }}>{status?.error ?? 'Cargando…'}</p>
        )}
        {!available && status && (
          <p style={{ color: '#fbbf24', fontSize: 11, margin: 0 }}>{status.reason}</p>
        )}
      </div>

      <div style={SECTION_STYLE}>
        <span style={{ color: '#7E9286', fontSize: 11 }}>Ejecutar corrida</span>
        <select
          value={molde}
          onChange={event => { setMolde(event.target.value); setConfirming(false); setResult(null); setRunError(null) }}
          style={{ background: '#0B110C', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, color: '#EAF2EC', fontSize: 12, padding: '7px 9px', width: 200 }}
        >
          {MOLDE_OPTIONS.map(value => <option key={value} value={value}>Molde {value}</option>)}
        </select>
        <p style={{ color: '#526159', fontSize: 10, margin: 0 }}>
          Moldes 3, 4 y 5 no usan IA — no tienen script de curaduría. Molde 2 y 6 comparten un único presupuesto encadenado.
        </p>

        {target && (
          <div style={{
            display: 'inline-flex', alignSelf: 'flex-start', gap: 6, alignItems: 'center',
            border: `1px solid ${target.willResume ? 'rgba(96,165,250,.35)' : 'rgba(52,209,126,.35)'}`,
            background: target.willResume ? 'rgba(96,165,250,.1)' : 'rgba(52,209,126,.1)',
            color: target.willResume ? '#60a5fa' : '#34D17E',
            borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700,
          }}>
            {modeLabel}
            {target.sourceStatus && <span style={{ fontWeight: 400, opacity: 0.85 }}>· checkpoint: {target.sourceStatus}</span>}
          </div>
        )}
        {target?.error && (
          <p style={{ color: '#fb7185', fontSize: 11, margin: 0 }}>{target.error}</p>
        )}

        {!confirming && (
          <button
            type="button"
            disabled={!canRun}
            onClick={() => setConfirming(true)}
            style={{
              alignSelf: 'flex-start', border: '1px solid rgba(52,209,126,.4)', background: 'rgba(52,209,126,.14)', color: '#34D17E',
              borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: canRun ? 'pointer' : 'not-allowed', opacity: canRun ? 1 : 0.5,
            }}
          >
            Preparar corrida
          </button>
        )}

        {confirming && (
          <div style={{ border: '1px solid rgba(251,191,36,.3)', background: 'rgba(251,191,36,.06)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ color: '#fbbf24', fontSize: 12, margin: 0, fontWeight: 700 }}>
              {target?.willResume ? 'Esto va a CONTINUAR una autorización paga existente (--resume).' : 'Esto va a ABRIR una corrida nueva (--execute) y gastar contra OpenAI de verdad.'}
            </p>
            <p style={{ color: '#C5D0C8', fontSize: 11, margin: 0 }}>
              Remanente actual: <strong>${snapshot?.remainingUsd.toFixed(4) ?? '—'}</strong> de ${snapshot?.limitUsd.toFixed(2) ?? '—'} de tope acumulado.
              {target?.willResume && ' Si el checkpoint ya tiene todo lo pedido completado, esto no va a gastar nada — solo lo confirma.'}
              {' '}El script rechaza la corrida si el costo máximo estimado de la próxima llamada supera el remanente — pero el monto exacto solo se conoce
              después de la respuesta de OpenAI.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                disabled={running}
                onClick={execute}
                style={{ border: '1px solid rgba(251,113,133,.4)', background: 'rgba(251,113,133,.14)', color: '#fb7185', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: running ? 'wait' : 'pointer' }}
              >
                {running ? 'Ejecutando…' : target?.willResume ? 'Sí, continuar (--resume)' : 'Sí, gastar y ejecutar'}
              </button>
              <button
                type="button"
                disabled={running}
                onClick={() => setConfirming(false)}
                style={{ border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#A7B5AC', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {runError && (
          <div style={{ border: '1px solid rgba(251,113,133,.3)', background: 'rgba(251,113,133,.06)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p role="alert" style={{ color: '#fb7185', fontSize: 12, margin: 0, fontWeight: 700 }}>{runError.error}</p>
            {runError.stderr && (
              <pre style={{ background: '#050805', borderRadius: 8, padding: 10, fontSize: 10, color: '#C5D0C8', overflowX: 'auto', maxHeight: 240, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {runError.stderr}
              </pre>
            )}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ color: result.noNewSpend ? '#7E9286' : '#34D17E', fontSize: 11, margin: 0, fontWeight: 700 }}>
              {result.noNewSpend
                ? `Corrida (${result.mode}) completada sin gasto nuevo — ya estaba todo hecho en el checkpoint.`
                : `Corrida (${result.mode}) completada — gasto registrado en el historial.`}
            </p>
            <pre style={{ background: '#050805', borderRadius: 8, padding: 12, fontSize: 11, color: '#C5D0C8', overflowX: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div style={SECTION_STYLE}>
        <span style={{ color: '#7E9286', fontSize: 11 }}>Historial de gasto</span>
        {!status?.history || status.history.length === 0 ? (
          <p style={{ color: '#526159', fontSize: 12, margin: 0 }}>Sin corridas registradas todavía desde el admin.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {status.history.map((row, index) => (
              <div key={`${row.created_at}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#C5D0C8', borderBottom: '1px solid rgba(255,255,255,.04)', paddingBottom: 6 }}>
                <span>Molde {row.molde} · {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at))}</span>
                <span>${row.cost_usd.toFixed(4)} · {row.input_tokens + row.output_tokens} tokens</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
