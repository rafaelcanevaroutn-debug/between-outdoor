import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const generator = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/video-familia-3.ts'),
  'utf8',
)

test('usa un generador único parametrizado y un mapa declarativo 3a-3e', () => {
  assert.match(generator, /export const VIDEO_SUBFAMILY_CONFIG/)
  assert.match(generator, /export async function generateVideoFamilia3/)
  for (const subfamilia of ['3a', '3b', '3c', '3d', '3e']) {
    assert.match(generator, new RegExp(`'${subfamilia}'`))
  }
})

test('es una sola etapa con máximo dos intentos y corrección dirigida', () => {
  assert.match(generator, /const MAX_GENERATION_ATTEMPTS = 2/)
  assert.equal((generator.match(/generateWithRetryTracked\(/g) ?? []).length, 1)
  assert.match(generator, /CORRECCIÓN DIRIGIDA DEL CAMPO COPY/)
})

test('el contrato no hereda campos de carrusel', () => {
  const responseContract = generator.match(/Respondé ÚNICAMENTE con JSON válido:[\s\S]*?El sistema recalculará/)?.[0] ?? ''
  assert.match(responseContract, /"copy"/)
  assert.match(responseContract, /"tipografia_id"/)
  assert.match(responseContract, /"duracion_estimada_segundos"/)
  assert.doesNotMatch(responseContract, /"slides"|"pill_text"|"texto_apoyo"|"cta_comentario"/)
})

test('la duración y tipografía se resuelven de forma determinística', () => {
  assert.match(generator, /resolveVideoClipDuration\(p\.clipDurationSeconds\)/)
  assert.match(generator, /estimateVideoCopyDuration\(copy\)/)
  assert.match(generator, /typographyIds\.includes\(requestedTypography\)/)
  assert.match(generator, /: typographyIds\[0\]/)
})

test('no toca ni importa el generador de video legado', () => {
  assert.doesNotMatch(generator, /generators\/video['"]/)
  assert.doesNotMatch(generator, /generateVideo\(/)
})
