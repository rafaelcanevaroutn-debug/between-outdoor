import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const routePath = path.join(process.cwd(), 'app/api/generate/preview/route.ts')
const source = fs.readFileSync(routePath, 'utf8')

test('el preview reutiliza el motor real y la elegibilidad compartida', () => {
  assert.match(source, /generateAdaptiveCarrusel/)
  assert.match(source, /evaluateCarruselEligibility/)
  assert.match(source, /hasPhotos:\s*true/)
})

test('el preview declara explícitamente que no persiste ni despacha renders', () => {
  assert.match(source, /persisted:\s*false/)
  assert.match(source, /matiDispatched:\s*false/)
  assert.match(source, /Cache-Control['"]?:\s*['"]no-store/)
})

test('el preview no contiene operaciones con efectos secundarios', () => {
  const forbidden = [
    [/\.insert\s*\(/, 'insert'],
    [/\.update\s*\(/, 'update'],
    [/\.upsert\s*\(/, 'upsert'],
    [/\.delete\s*\(/, 'delete'],
    [/\bafter\s*\(/, 'after'],
    [/\bfetch\s*\(/, 'fetch'],
    [/revalidatePath/, 'revalidatePath'],
    [/contenido_generado/, 'contenido_generado'],
    [/MATI_SKILL/, 'configuración de Mati'],
  ]

  for (const [pattern, label] of forbidden) {
    assert.doesNotMatch(source, pattern, `El endpoint de preview no puede usar ${label}`)
  }
})

test('el token local queda ignorado fuera de development', () => {
  assert.match(source, /process\.env\.NODE_ENV\s*!==\s*['"]development['"]\) return false/)
  assert.match(source, /ENABLE_COPY_PREVIEW\s*!==\s*['"]true['"]/)
  assert.match(source, /timingSafeEqual/)
})
