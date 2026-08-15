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

test('el Route Handler reemplaza el stub inline por el generador 1a', () => {
  assert.match(route, /import \{ generateVideoFamilia1a \}/u)
  assert.match(route, /pieces = \[await generateVideoFamilia1a\(commonVideoParams\)\]/u)
  assert.doesNotMatch(route, /Video sin copy \(Modo Discurso\)/u)
})
