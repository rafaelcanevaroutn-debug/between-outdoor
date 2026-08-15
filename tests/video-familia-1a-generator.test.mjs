import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const generator = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/video-familia-1a.ts'),
  'utf8',
)
const route = fs.readFileSync(
  path.join(process.cwd(), 'app/api/generate/route.ts'),
  'utf8',
)

test('Familia 1a expone un generador tipado con la firma del motor', () => {
  assert.match(generator, /export interface GenerateVideoFamilia1aParams/u)
  assert.match(generator, /export async function generateVideoFamilia1a/u)
  assert.match(generator, /Promise<GeneratedVideoFamilia1a>/u)
})

test('genera una única pieza narrada y reintenta si el contrato no tiene arco', () => {
  assert.match(generator, /const MAX_GENERATION_ATTEMPTS = 2/u)
  assert.match(generator, /validateVideoFamily1aDiscourse/u)
  assert.match(generator, /"discurso": "texto narrado con entrada, desarrollo y desenlace"/u)
  assert.doesNotMatch(generator, /buildSalidaBlock/u)
  assert.doesNotMatch(generator, /estimateVideoCopyDuration/u)
})

test('deja la duración TTS como placeholder explícito sin aplicar límites de lectura', () => {
  assert.match(generator, /PENDIENTE: fórmula de Mati \(narración TTS, depende del ritmo de voz\)/u)
  assert.match(generator, /duracion_estimada_segundos:\s*0/u)
  assert.doesNotMatch(generator, /raw\.duracion_estimada_segundos/u)
})

test('el Route Handler reemplaza el stub inline por el generador 1a', () => {
  assert.match(route, /import \{ generateVideoFamilia1a \}/u)
  assert.match(route, /pieces = \[await generateVideoFamilia1a\(commonVideoParams\)\]/u)
  assert.doesNotMatch(route, /Video sin copy \(Modo Discurso\)/u)
})
