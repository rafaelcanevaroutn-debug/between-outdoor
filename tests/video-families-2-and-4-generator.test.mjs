import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const family2 = fs.readFileSync(path.join(process.cwd(), 'lib/generators/video-familia-2.ts'), 'utf8')
const family4 = fs.readFileSync(path.join(process.cwd(), 'lib/generators/video-familia-4.ts'), 'utf8')
const family4Knowledge = fs.readFileSync(path.join(process.cwd(), 'lib/knowledge/formatos/video/video_comercial.md'), 'utf8')

test('expone dos generadores separados y overloads estrictos para 2a/2b', () => {
  assert.match(family2, /export function generateVideoFamilia2/)
  assert.match(family2, /subfamilia: '2a'/)
  assert.match(family2, /subfamilia: '2b'/)
  assert.match(family4, /export async function generateVideoFamilia4/)
})

test('Familia 4 declara copy y dato_duro como dos bloques del contrato', () => {
  assert.match(family4Knowledge, /"dato_duro"/u)
  assert.match(family4Knowledge, /`copy` reúne CONVOCATORIA \+ CTA CONCRETO/u)
  assert.match(family4Knowledge, /`dato_duro` contiene solamente el DATO DURO VERIFICADO/u)
})

test('cada generador hace una sola llamada por intento, con corrección dirigida', () => {
  for (const source of [family2, family4]) {
    assert.equal((source.match(/generateWithRetryTracked\(/gu) ?? []).length, 1)
    assert.match(source, /CORRECCIÓN DIRIGIDA/)
  }
})

test('Familia 2 sube a 3 intentos — 21 chars por ventana deja poco margen a Gemini', () => {
  assert.match(family2, /const MAX_GENERATION_ATTEMPTS = 3/)
})

test('Familia 4 mantiene 2 intentos', () => {
  assert.match(family4, /const MAX_GENERATION_ATTEMPTS = 2/)
})

test('Familia 2 usa el modelo de ventanas fijas y Familia 4 separa copy (tiempo) de dato_duro (ancho)', () => {
  assert.match(family2, /validateVideoSequence/)
  assert.match(family2, /resolveVideoSequenceDuration/)
  assert.match(family2, /validateSequenceField/)
  assert.match(family2, /MAX_BULLETS/)
  assert.match(family2, /TARGET_BULLETS/)
  assert.match(family4, /validateVideoText/)
  assert.match(family4, /resolveVideoClipDuration/)
  assert.match(family4, /raw\.dato_duro/)
  assert.match(family4, /validateDatoDuroWidth/)
  assert.doesNotMatch(family4, /completeText/)
})

test('no conecta los generadores a endpoints ni al motor legado', () => {
  assert.doesNotMatch(family2, /api\/generate|generators\/video['"]/)
  assert.doesNotMatch(family4, /api\/generate|generators\/video['"]/)
})
