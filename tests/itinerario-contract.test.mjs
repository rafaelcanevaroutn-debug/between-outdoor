import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const generatorPath = path.join(process.cwd(), 'lib/generators/carrusel-formato.ts')
const guidePath = path.join(process.cwd(), 'lib/knowledge/formatos/carrusel_itinerario.md')
const generator = fs.readFileSync(generatorPath, 'utf8')
const guide = fs.readFileSync(guidePath, 'utf8')

test('Itinerario permite omitir la indicación que luego asigna el sistema', () => {
  assert.match(generator, /formato === 'itinerario'[\s\S]{0,140}La indicación visual se asignará automáticamente/)
  assert.match(generator, /buildItineraryImageInstructions/)
})

test('Itinerario declara los mismos límites que valida el módulo compartido', () => {
  assert.match(generator, /const limits = LIMITS_BY_FORMAT\.itinerario/)
  assert.match(generator, /texto_principal: máximo \$\{limits\.texto_principal\}/)
  assert.match(generator, /texto_apoyo: máximo \$\{limits\.texto_apoyo\}/)
  assert.match(generator, /descripcion_post: máximo \$\{limits\.descripcion_post\}/)
  assert.match(generator, /cta_comentario: máximo \$\{limits\.cta_comentario\}/)
})

test('Itinerario separa puntos principales del slide y secundarios de la descripción', () => {
  assert.match(generator, /buildItineraryRequirements/)
  assert.match(generator, /SLIDE · puntos principales obligatorios/)
  assert.match(generator, /DESCRIPCION_POST · puntos secundarios obligatorios/)
  assert.match(generator, /omitió puntos principales/)
  assert.match(generator, /descripcion_post omitió puntos secundarios/)
  assert.doesNotMatch(guide, /Conservar todos los lugares nombrados dentro de cada día/)
})

test('Itinerario dispone de tres intentos sin cambiar el resto de formatos', () => {
  assert.match(generator, /p\.formato === 'conversacion' \? 4 : p\.formato === 'itinerario' \? 3 : 2/)
})
