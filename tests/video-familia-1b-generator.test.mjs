import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { maxVideoCopyCharacters } from '../lib/generators/video-text-limits.ts'
import { VIDEO_SUBFAMILIES } from '../lib/video-generation-dispatch.ts'

// video-familia-1b.ts importa desde '@/lib/...' (gemini-core, knowledge/loader,
// etc.), sin resolución de path alias fuera de Next.js — mismo motivo por el
// que video-family-3-generator.test.mjs lee el generador como texto en vez
// de importarlo directamente (ver ese archivo).
const generator = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/video-familia-1b.ts'),
  'utf8',
)

test('ventana real de texto confirmada por Mati: 10.5s (15s fijos - ~4.3s de barras/error)', () => {
  assert.match(generator, /export const FAMILIA_1B_TEXT_WINDOW_SECONDS = 10\.5/)
})

test('el techo teórico de la fórmula (117) sigue calculado, pero el target real queda capado a 65 tras la primera calibración', () => {
  assert.match(generator, /FAMILIA_1B_FORMULA_CEILING_CHARACTERS = maxVideoCopyCharacters\(FAMILIA_1B_TEXT_WINDOW_SECONDS\)/)
  assert.match(generator, /FAMILIA_1B_TARGET_CHARACTERS = Math\.min\(FAMILIA_1B_FORMULA_CEILING_CHARACTERS, 65\)/)
  // floor((10.5 - 0.75) * 12) = 117 — techo teórico, ya no es el target real.
  assert.equal(maxVideoCopyCharacters(10.5), 117)
})

test('rechazo duro si el copy no menciona nada del campo semántico de señal/conexión/notificaciones — no solo instrucción de prompt', () => {
  assert.match(generator, /GAG_ANCHOR_PATTERN/)
  assert.match(generator, /if \(!GAG_ANCHOR_PATTERN\.test\(copy\)\)/)
  assert.match(generator, /no depende del gag visual, podría ser una frase genérica de Familia 3a/)
})

test('duracion_estimada_segundos es siempre 15 — el render es Modo Título fijo, no depende del copy', () => {
  assert.match(generator, /export const FAMILIA_1B_FIXED_DURATION_SECONDS = 15/)
  assert.match(generator, /duracion_estimada_segundos: FAMILIA_1B_FIXED_DURATION_SECONDS/)
  assert.doesNotMatch(generator, /estimateVideoCopyDuration/)
})

test('el contrato pedido al modelo no incluye duracion_estimada_segundos — el sistema la fija, no Gemini', () => {
  const responseContract = generator.match(/Respondé ÚNICAMENTE con JSON válido:[\s\S]*?No agregues duracion_estimada_segundos/)?.[0] ?? ''
  assert.match(responseContract, /"copy"/)
  assert.match(responseContract, /"tipografia_id"/)
  assert.doesNotMatch(responseContract, /"duracion_estimada_segundos"/)
})

test('es una sola etapa con máximo dos intentos y corrección dirigida', () => {
  assert.match(generator, /const MAX_GENERATION_ATTEMPTS = 2/)
  assert.equal((generator.match(/generateWithRetryTracked\(/g) ?? []).length, 1)
  assert.match(generator, /CORRECCIÓN DIRIGIDA DEL CAMPO COPY/)
})

test('no ancla a la salida — reglas de veracidad prohíben nombrar geografía y hay chequeo de lugar verificado', () => {
  assert.match(generator, /No menciones ningún nombre geográfico/)
  assert.match(generator, /mentionsVerifiedPlace/)
  assert.match(generator, /Familia 1b debe ser atemporal/)
})

test('no toca ni importa el generador de video legado', () => {
  assert.doesNotMatch(generator, /generators\/video['"]/)
  assert.doesNotMatch(generator, /generateVideo\(/)
})

test('1b está registrado en el catálogo de subfamilias válidas', () => {
  assert.equal(VIDEO_SUBFAMILIES.has('1b'), true)
})
