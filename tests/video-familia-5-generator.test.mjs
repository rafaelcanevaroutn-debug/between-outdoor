import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/video-familia-5.ts'),
  'utf8',
)

test('Familia 5 expone el generador con el contrato de parámetros del motor', () => {
  assert.match(source, /export interface GenerateVideoFamilia5Params/u)
  assert.match(source, /export async function generateVideoFamilia5/u)
})
