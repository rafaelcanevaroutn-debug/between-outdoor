import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { VIDEO_KNOWLEDGE_FILE_MAP } from '../lib/knowledge/loader.ts'

const generator = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/video-familia-5.ts'),
  'utf8',
)
const knowledgeDoc = fs.readFileSync(
  path.join(process.cwd(), 'lib/knowledge/formatos/video/video_consejos.md'),
  'utf8',
)

test('Familia 5 no tiene subfamilias — un solo generador, sin variante seleccionable en los params', () => {
  assert.match(generator, /export async function generateVideoFamilia5/)
  const paramsBlock = generator.match(/export interface GenerateVideoFamilia5Params \{[\s\S]*?\}/)?.[0] ?? ''
  assert.ok(paramsBlock, 'debe declarar GenerateVideoFamilia5Params')
  assert.doesNotMatch(paramsBlock, /subfamilia/i)
})

test('es una sola etapa con máximo dos intentos y corrección dirigida', () => {
  assert.match(generator, /const MAX_GENERATION_ATTEMPTS = 2/)
  assert.equal((generator.match(/generateWithRetryTracked\(/g) ?? []).length, 1)
  assert.match(generator, /CORRECCIÓN DIRIGIDA/)
})

test('el contrato es un único campo copy, sin heredar campos de carrusel ni de otras familias', () => {
  const responseContract = generator.match(/Respondé ÚNICAMENTE con JSON válido:[\s\S]*?El sistema recalculará/)?.[0] ?? ''
  assert.match(responseContract, /"copy"/)
  assert.match(responseContract, /"tipografia_id"/)
  assert.match(responseContract, /"duracion_estimada_segundos"/)
  assert.doesNotMatch(responseContract, /"slides"|"pill_text"|"texto_apoyo"|"cta_comentario"|"items"|"dato_duro"/)
})

test('reusa el mecanismo de presupuesto por CPS de video-text-limits, no el de ancho fijo de Familia 4', () => {
  assert.match(generator, /maxVideoCopyCharacters/)
  assert.match(generator, /validateVideoText/)
  assert.match(generator, /truncateVideoCopyAtWord/)
  assert.doesNotMatch(generator, /validateDatoDuroWidth|DATO_DURO_MAX_CHARACTERS/)
})

test('el target de caracteres es una hipótesis explícitamente marcada como no confirmada por Mati', () => {
  assert.match(generator, /VIDEO_FAMILY_5_TARGET_CHARACTERS = \d+/)
  assert.match(generator, /[Hh]ipótesis de arranque/)
})

test('usa familia como discriminante, igual que Familia 4, no subfamilia', () => {
  assert.match(generator, /familia:\s*'5'/)
})

test('reusa el corpus factual compartido en vez de reimplementarlo', () => {
  assert.doesNotMatch(generator, /function factualCorpus/)
})

test('el mapa de knowledge incluye Familia 5 sin alterar las demás', () => {
  assert.equal(VIDEO_KNOWLEDGE_FILE_MAP['5'], 'formatos/video/video_consejos.md')
  assert.equal(VIDEO_KNOWLEDGE_FILE_MAP['4'], 'formatos/video/video_comercial.md')
})

test('la guía documenta los dos ángulos y la prueba de reemplazo como criterio central', () => {
  assert.match(knowledgeDoc, /Ángulo 1/)
  assert.match(knowledgeDoc, /Ángulo 2/)
  assert.match(knowledgeDoc, /prueba de reemplazo/i)
  assert.match(knowledgeDoc, /No mencionar el destino ni ningún lugar verificado|No mencionar el destino/i)
})
