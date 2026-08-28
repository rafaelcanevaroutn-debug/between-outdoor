import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  readCheckpoint,
  resolveBeforeUsage,
  globalCheckpointUsage,
  resolveCreativeLabInvocation,
} from '../lib/admin-generation/creative-lab-checkpoint.ts'

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'creative-lab-checkpoint-'))
}

function writeCheckpoint(dir, fileName, content) {
  fs.writeFileSync(path.join(dir, fileName), JSON.stringify(content))
}

test('readCheckpoint devuelve null si el archivo no existe, sin explotar', () => {
  const dir = tempDir()
  assert.equal(readCheckpoint(dir, '1'), null)
})

test('readCheckpoint devuelve null ante un JSON corrupto o sin budget usable', () => {
  const dir = tempDir()
  fs.writeFileSync(path.join(dir, 'molde-1-paid-run.json'), '{not json')
  assert.equal(readCheckpoint(dir, '1'), null)

  const dir2 = tempDir()
  writeCheckpoint(dir2, 'molde-1-paid-run.json', { status: 'completed' })
  assert.equal(readCheckpoint(dir2, '1'), null)
})

test('molde 2 y 6 leen el mismo archivo compartido moldes-2-6-paid-run.json', () => {
  const dir = tempDir()
  writeCheckpoint(dir, 'moldes-2-6-paid-run.json', { status: 'completed', budget: { spentUsd: 0.3, responses: 4, inputTokens: 100, outputTokens: 200 } })
  const forMolde2 = readCheckpoint(dir, '2')
  const forMolde6 = readCheckpoint(dir, '6')
  assert.deepEqual(forMolde2, forMolde6)
  assert.equal(forMolde2.budget.spentUsd, 0.3)
})

test('resolveBeforeUsage: molde 1 sin checkpoint arranca fresco y no requiere --resume', () => {
  const dir = tempDir()
  const result = resolveBeforeUsage(dir, '1')
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.willResume, false)
  assert.deepEqual(result.usage, { spentUsd: 0, responses: 0, inputTokens: 0, outputTokens: 0 })
})

test('resolveBeforeUsage: molde 1 con checkpoint existente exige --resume y hereda su gasto', () => {
  const dir = tempDir()
  writeCheckpoint(dir, 'molde-1-paid-run.json', { status: 'completed', budget: { spentUsd: 0.2, responses: 50, inputTokens: 1000, outputTokens: 2000 } })
  const result = resolveBeforeUsage(dir, '1')
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.willResume, true)
  assert.equal(result.usage.spentUsd, 0.2)
})

test('resolveBeforeUsage: molde 2/6 sin checkpoint propio hereda de molde 1, sin exigir --resume', () => {
  const dir = tempDir()
  writeCheckpoint(dir, 'molde-1-paid-run.json', { status: 'completed', budget: { spentUsd: 0.2, responses: 50, inputTokens: 1000, outputTokens: 2000 } })
  const result = resolveBeforeUsage(dir, '2')
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.willResume, false)
  assert.equal(result.usage.spentUsd, 0.2)
})

test('resolveBeforeUsage: molde 2/6 sin checkpoint propio ni de molde 1 no tiene de dónde partir', () => {
  const dir = tempDir()
  const result = resolveBeforeUsage(dir, '6')
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /Molde 1 haya corrido/u)
})

test('resolveBeforeUsage: molde 2/6 con checkpoint propio ya existente exige --resume, ignora el de molde 1', () => {
  const dir = tempDir()
  writeCheckpoint(dir, 'molde-1-paid-run.json', { status: 'completed', budget: { spentUsd: 0.2, responses: 50, inputTokens: 1000, outputTokens: 2000 } })
  writeCheckpoint(dir, 'moldes-2-6-paid-run.json', { status: 'completed', budget: { spentUsd: 0.3, responses: 76, inputTokens: 1500, outputTokens: 3000 } })
  const result = resolveBeforeUsage(dir, '2')
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.willResume, true)
  assert.equal(result.usage.spentUsd, 0.3)
})

test('globalCheckpointUsage toma el checkpoint que reporta más gastado, nunca subestima el remanente', () => {
  const dir = tempDir()
  writeCheckpoint(dir, 'molde-1-paid-run.json', { status: 'completed', budget: { spentUsd: 0.2, responses: 50, inputTokens: 1000, outputTokens: 2000 } })
  writeCheckpoint(dir, 'moldes-2-6-paid-run.json', { status: 'completed', budget: { spentUsd: 0.3, responses: 76, inputTokens: 1500, outputTokens: 3000 } })
  assert.equal(globalCheckpointUsage(dir).spentUsd, 0.3)
})

test('globalCheckpointUsage devuelve null si no hay ningún checkpoint todavía', () => {
  const dir = tempDir()
  assert.equal(globalCheckpointUsage(dir), null)
})

test('resolveCreativeLabInvocation arma los args correctos por molde y modo', () => {
  assert.deepEqual(resolveCreativeLabInvocation('1', false), ['scripts/run-creative-lab-molde-1.ts', '--execute'])
  assert.deepEqual(resolveCreativeLabInvocation('1', true), ['scripts/run-creative-lab-molde-1.ts', '--execute', '--resume'])
  assert.deepEqual(resolveCreativeLabInvocation('2', true), ['scripts/run-creative-lab-moldes-2-6.ts', '--mold=2', '--execute', '--resume'])
  assert.deepEqual(resolveCreativeLabInvocation('6', false), ['scripts/run-creative-lab-moldes-2-6.ts', '--mold=6', '--execute'])
})
