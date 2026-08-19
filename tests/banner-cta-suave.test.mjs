import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// banner-cta-suave.ts importa desde '@/lib/gemini-core' — sin resolución de
// path alias fuera de Next.js, mismo motivo por el que video-family-3-
// generator.test.mjs lee el generador como texto en vez de importarlo.
const generator = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/banner-cta-suave.ts'),
  'utf8',
)

test('es una sola etapa con máximo dos intentos y corrección dirigida', () => {
  assert.match(generator, /const MAX_GENERATION_ATTEMPTS = 2/)
  assert.equal((generator.match(/generateWithRetryTracked\(/g) ?? []).length, 1)
  assert.match(generator, /CORRECCIÓN DIRIGIDA/)
})

test('valida contra los mismos patrones que ya usa el compositor de Molde 2 del PR #14, no unos nuevos', () => {
  assert.match(generator, /from '.\/banner-molde-2\.ts'/)
  assert.match(generator, /SUAVE_CTA_PATTERN/)
  assert.match(generator, /COMMERCIAL_CTA_PATTERN/)
})

test('el contrato pedido al modelo es solo el CTA, un único campo', () => {
  const responseContract = generator.match(/Respondé ÚNICAMENTE con JSON válido:[\s\S]*?\}/)?.[0] ?? ''
  assert.match(responseContract, /"cta"/)
  assert.doesNotMatch(responseContract, /"titulo"|"items"|"copy"/)
})

test('no hay ejemplos de CTA fijos para copiar — mismo criterio anti-clon que 2c', () => {
  assert.match(generator, /Ejemplos de LONGITUD, no textos para copiar/)
})

test('no toca ni importa ningún generador existente de video', () => {
  assert.doesNotMatch(generator, /from '@\/lib\/generators\/video-familia/)
  assert.doesNotMatch(generator, /from '\.\/video-familia/)
})
