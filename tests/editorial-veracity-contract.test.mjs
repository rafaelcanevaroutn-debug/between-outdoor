import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const editorial = fs.readFileSync(path.join(process.cwd(), 'lib/generators/carrusel.ts'), 'utf8')

const step1Start = editorial.indexOf('function buildStep1Prompt')
const step2Start = editorial.indexOf('function buildStep2Prompt')
const step3Start = editorial.indexOf('function buildStep3Prompt')
const parsersStart = editorial.indexOf('// ─── Parsers')
const step1 = editorial.slice(step1Start, step2Start)
const step2 = editorial.slice(step2Start, step3Start)
const step3 = editorial.slice(step3Start, parsersStart)
const parsers = editorial.slice(parsersStart)

test('la regla explícita de veracidad se inyecta solo en los pasos 2 y 3', () => {
  assert.doesNotMatch(step1, /\$\{EDITORIAL_STEP_2_3_VERACITY_RULES\}/)
  assert.match(step2, /\$\{EDITORIAL_STEP_2_3_VERACITY_RULES\}/)
  assert.match(step3, /\$\{EDITORIAL_STEP_2_3_VERACITY_RULES\}/)
  assert.equal((editorial.match(/\$\{EDITORIAL_STEP_2_3_VERACITY_RULES\}/g) ?? []).length, 2)
})

test('la regla cubre credenciales, equipo, disponibilidad y exigencia física', () => {
  assert.match(editorial, /certificaciones, habilitaciones o credenciales/)
  assert.match(editorial, /equipo técnico específico/)
  assert.match(editorial, /El número total de cupos no indica cuántos quedan disponibles/)
  assert.match(editorial, /niveles de exigencia física, capacidades mínimas o requisitos físicos/)
  assert.match(editorial, /No completes huecos con conocimiento general/)
  assert.match(editorial, /prevalecen sobre la descripción del tema, los ejemplos y la knowledge base/)
})

test('veracidad sigue siendo instrucción editorial y no un validador duro', () => {
  assert.doesNotMatch(parsers, /EDITORIAL_STEP_2_3_VERACITY_RULES/)
  assert.doesNotMatch(editorial, /function (?:validate|findForbidden)EditorialVeracity/)
  assert.doesNotMatch(editorial, /throw new Error\([^\n]*(?:certific|credencial|equipo técnico|cupos restantes|exigencia física)/i)
})

test('pill_text y subtitle_highlight usan saneamiento opcional sin rechazo', () => {
  assert.match(parsers, /truncatePill\(String\(raw\.pill_text\)\.toUpperCase\(\)/)
  assert.match(parsers, /truncatePill\(String\(raw\.subtitle_highlight\)\.toUpperCase\(\)/)
  assert.doesNotMatch(parsers, /throw new Error\([^\n]*(?:pill_text|subtitle_highlight)/i)
})
