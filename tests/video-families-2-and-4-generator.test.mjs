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

test('cada generador hace una sola llamada en un loop de dos intentos', () => {
  for (const source of [family2, family4]) {
    assert.match(source, /const MAX_GENERATION_ATTEMPTS = 2/)
    assert.equal((source.match(/generateWithRetryTracked\(/gu) ?? []).length, 1)
    assert.match(source, /CORRECCIÓN DIRIGIDA/)
  }
})

test('Familia 2 usa presupuesto secuencial y Familia 4 el límite simple', () => {
  assert.match(family2, /validateVideoSequence/)
  assert.match(family2, /resolveVideoSequenceDuration/)
  assert.match(family4, /validateVideoText/)
  assert.match(family4, /resolveVideoClipDuration/)
  assert.match(family4, /raw\.dato_duro/)
  assert.match(family4, /completeText/)
})

test('no conecta los generadores a endpoints ni al motor legado', () => {
  assert.doesNotMatch(family2, /api\/generate|generators\/video['"]/)
  assert.doesNotMatch(family4, /api\/generate|generators\/video['"]/)
})
