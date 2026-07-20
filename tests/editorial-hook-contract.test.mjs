import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const editorial = fs.readFileSync(path.join(process.cwd(), 'lib/generators/carrusel.ts'), 'utf8')
const sharedRules = fs.readFileSync(path.join(process.cwd(), 'lib/generators/carrusel-copy-rules.ts'), 'utf8')

const step1Start = editorial.indexOf('function buildStep1Prompt')
const step2Start = editorial.indexOf('function buildStep2Prompt')
const step1Prompt = editorial.slice(step1Start, step2Start)
const outsideStep1 = `${editorial.slice(0, step1Start)}${editorial.slice(step2Start)}`
const parseStep1Start = editorial.indexOf('function parseStep1')
const parseStep2Start = editorial.indexOf('function parseStep2')
const parseStep1 = editorial.slice(parseStep1Start, parseStep2Start)

test('Editorial comparte las mismas reglas de portada que los formatos adaptativos', () => {
  assert.match(editorial, /SHARED_OPENING_RULES,[\s\S]*SHARED_SPECIFICITY_RULES,[\s\S]*from '@\/lib\/generators\/carrusel-copy-rules'/)
  assert.match(step1Prompt, /=== PASO 1: SOLO EL SLIDE DE PORTADA ===[\s\S]*\$\{SHARED_OPENING_RULES\}[\s\S]*\$\{SHARED_SPECIFICITY_RULES\}/)
  assert.doesNotMatch(outsideStep1, /\$\{SHARED_OPENING_RULES\}|\$\{SHARED_SPECIFICITY_RULES\}/)
  assert.equal((editorial.match(/\$\{SHARED_OPENING_RULES\}/g) ?? []).length, 1)
  assert.equal((editorial.match(/\$\{SHARED_SPECIFICITY_RULES\}/g) ?? []).length, 1)
})

test('la fuente compartida contiene el contrato editorial completo', () => {
  assert.match(sharedRules, /tensión, pregunta, contraste o promesa concreta/)
  assert.match(sharedRules, /título de índice/)
  assert.match(sharedRules, /"energía", "transformación", "conexión"/)
  assert.match(sharedRules, /Hacé la prueba de reemplazo/)
  assert.match(sharedRules, /angulo es estrategia interna y la apertura es copy público: no deben ser idénticos/)
})

test('la regla del Editorial es solo instrucción de prompt, sin rechazo duro', () => {
  assert.match(parseStep1, /parseSlide\(slideRaw, 1, 'portada', exceeded\)/)
  assert.match(parseStep1, /truncate\(String\(raw\.angulo \?\? ''\), LIMITS\.angulo/)
  assert.doesNotMatch(parseStep1, /throw new Error/)
  assert.doesNotMatch(editorial, /function (?:ensureDistinctAngleFromOpening|validateEditorialOpening|findForbiddenEditorialOpening)/)
  assert.doesNotMatch(editorial, /throw new Error\([^\n]*(?:angulo[^\n]*(?:portada|hook)|(?:portada|hook)[^\n]*angulo)/i)
})
