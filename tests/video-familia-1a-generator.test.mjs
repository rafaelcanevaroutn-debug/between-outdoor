import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { estimateVideoFamilia1aDuration } from '../lib/generators/video-family-1a-contract.ts'

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

test('calcula la duración TTS sobre las palabras del discurso final trimmeado', () => {
  assert.equal(estimateVideoFamilia1aDuration('  uno dos tres cuatro cinco  '), 4)
  assert.equal(estimateVideoFamilia1aDuration('uno\ndos   tres cuatro cinco seis'), 5)
  assert.match(generator, /estimateVideoFamilia1aDuration\(discurso\)/u)
  assert.doesNotMatch(generator, /raw\.duracion_estimada_segundos/u)
})

test('el Route Handler reemplaza el stub inline por el generador 1a', () => {
  assert.match(route, /import \{ generateVideoFamilia1a \}/u)
  assert.match(route, /pieces = \[await generateVideoFamilia1a\(commonVideoParams\)\]/u)
  assert.doesNotMatch(route, /Video sin copy \(Modo Discurso\)/u)
})
