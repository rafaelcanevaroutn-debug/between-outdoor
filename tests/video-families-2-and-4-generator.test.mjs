import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const family2 = fs.readFileSync(path.join(process.cwd(), 'lib/generators/video-familia-2.ts'), 'utf8')
const family4 = fs.readFileSync(path.join(process.cwd(), 'lib/generators/video-familia-4.ts'), 'utf8')
const family4Knowledge = fs.readFileSync(path.join(process.cwd(), 'lib/knowledge/formatos/video/video_comercial.md'), 'utf8')

test('expone tres subfamilias con overloads estrictos: 2a, 2b y 2c', () => {
  assert.match(family2, /export function generateVideoFamilia2/)
  assert.match(family2, /subfamilia: '2a'/)
  assert.match(family2, /subfamilia: '2b'/)
  assert.match(family2, /subfamilia: '2c'/)
  assert.match(family4, /export async function generateVideoFamilia4/)
})

test('2c reusa el modelo de ventanas de 2a, pero con tips de texto libre en vez de una lista cerrada de lugares', () => {
  assert.match(family2, /validateVideoTips/)
  assert.match(family2, /Cada tip debe ser accionable/)
  assert.match(family2, /const listicleCandidatesBlock = p\.subfamilia === '2a'/)
})

test('2c permite nombrar el destino real en el título, a diferencia de las familias atemporales', () => {
  assert.match(family2, /en 2c SÍ corresponde nombrar el destino real/)
})

test('2c usa TIPS_MAX_CHARACTERS (60, confirmado por Mati) para el cap por tip, no WINDOW_MAX_CHARACTERS de 2a (30)', () => {
  assert.match(family2, /TIPS_MAX_CHARACTERS/)
  assert.match(family2, /validateVideoSequence\(items, clipDurationSeconds, TIPS_MAX_CHARACTERS\)/)
  // El bloque de reglas de 2c no debe seguir citando el cap de 2a.
  const tipsRulesBlock = family2.match(/: p\.subfamilia === '2c'\s*\n\s*\? `([\s\S]*?)`\s*\n\s*: `- Cada \$\{bulletLabel\}/)?.[1] ?? ''
  assert.ok(tipsRulesBlock, 'debe encontrar el bloque de reglas de 2c')
  assert.doesNotMatch(tipsRulesBlock, /\$\{WINDOW_MAX_CHARACTERS\}/)
})

test('2c usa TIPS_TITLE_MAX_CHARACTERS (65) y TIPS_CTA_MAX_CHARACTERS (40), no FIELD_MAX_CHARACTERS (30) de 2a', () => {
  assert.match(family2, /TIPS_TITLE_MAX_CHARACTERS/)
  assert.match(family2, /TIPS_CTA_MAX_CHARACTERS/)
  assert.match(family2, /validateSequenceField\(titulo, TIPS_TITLE_MAX_CHARACTERS\)/)
  assert.match(family2, /validateSequenceField\(cta, TIPS_CTA_MAX_CHARACTERS\)/)
  assert.match(family2, /titleMaxCharacters = p\.subfamilia === '2c' \? TIPS_TITLE_MAX_CHARACTERS : FIELD_MAX_CHARACTERS/)
  assert.match(family2, /ctaMaxCharacters = p\.subfamilia === '2c' \? TIPS_CTA_MAX_CHARACTERS : FIELD_MAX_CHARACTERS/)
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
