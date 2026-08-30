import test from 'node:test'
import assert from 'node:assert/strict'
import { sumSpendLogRows, computeSpendDelta, validateCurationConfirmation } from '../lib/admin-generation/openai-spend-log.ts'

test('sumSpendLogRows acumula gasto histórico para pasarlo como initialUsage', () => {
  const rows = [
    { input_tokens: 1000, output_tokens: 200, cost_usd: 0.08 },
    { input_tokens: 500, output_tokens: 100, cost_usd: 0.04 },
  ]
  assert.deepEqual(sumSpendLogRows(rows), { spentUsd: 0.12, responses: 2, inputTokens: 1500, outputTokens: 300 })
})

test('sumSpendLogRows sin filas devuelve todo en cero, no undefined', () => {
  assert.deepEqual(sumSpendLogRows([]), { spentUsd: 0, responses: 0, inputTokens: 0, outputTokens: 0 })
})

test('computeSpendDelta calcula solo lo nuevo entre dos snapshots acumulados', () => {
  const before = { spentUsd: 0.12, responses: 2, inputTokens: 1500, outputTokens: 300 }
  const after = { spentUsd: 0.20, responses: 3, inputTokens: 2000, outputTokens: 450 }
  const delta = computeSpendDelta(before, after)
  assert.ok(Math.abs(delta.cost_usd - 0.08) < 1e-9)
  assert.equal(delta.input_tokens, 500)
  assert.equal(delta.output_tokens, 150)
  assert.equal(delta.responses, 1)
})

test('computeSpendDelta nunca devuelve negativo si el snapshot no avanzó', () => {
  const same = { spentUsd: 0.12, responses: 2, inputTokens: 1500, outputTokens: 300 }
  assert.deepEqual(computeSpendDelta(same, same), { cost_usd: 0, input_tokens: 0, output_tokens: 0, responses: 0 })
})

test('validateCurationConfirmation exige confirm:true explícito antes de gastar', () => {
  assert.deepEqual(validateCurationConfirmation({ molde: '1', confirm: false }), { ok: false, error: 'Se requiere confirmación explícita (confirm: true) antes de gastar' })
  assert.deepEqual(validateCurationConfirmation({ molde: '1' }), { ok: false, error: 'Se requiere confirmación explícita (confirm: true) antes de gastar' })
  assert.deepEqual(validateCurationConfirmation({ molde: '1', confirm: true }), { ok: true, molde: '1' })
})

test('validateCurationConfirmation rechaza sin molde o cuerpo inválido', () => {
  assert.equal(validateCurationConfirmation({ confirm: true }).ok, false)
  assert.equal(validateCurationConfirmation(null).ok, false)
  assert.equal(validateCurationConfirmation('nope').ok, false)
})
