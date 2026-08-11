import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const generatorPath = path.join(process.cwd(), 'lib/generators/carrusel-formato.ts')
const guidePath = path.join(process.cwd(), 'lib/knowledge/formatos/carrusel_itinerario.md')
const generator = fs.readFileSync(generatorPath, 'utf8')
const guide = fs.readFileSync(guidePath, 'utf8')

test('Itinerario permite omitir la indicación que luego asigna el sistema', () => {
  assert.match(generator, /SYSTEM_OWNED_IMAGE_FORMATS/)
  assert.match(generator, /systemImagePlaceholder\(formato\)/)
  assert.match(generator, /buildItineraryImageInstructions/)
})

test('Itinerario declara los mismos límites que valida el módulo compartido', () => {
  assert.match(generator, /const limits = LIMITS_BY_FORMAT\.itinerario/)
  assert.match(generator, /texto_principal: máximo \$\{limits\.texto_principal\}/)
  assert.match(generator, /texto_apoyo: máximo \$\{limits\.texto_apoyo\}/)
  assert.match(generator, /descripcion_post: máximo \$\{limits\.descripcion_post\}/)
  assert.match(generator, /cta_comentario: máximo \$\{limits\.cta_comentario\}/)
})

test('Itinerario separa puntos principales del slide y secundarios de la descripción, y autocompleta los que falten sin rechazar la pieza', () => {
  assert.match(generator, /buildItineraryRequirements/)
  assert.match(generator, /SLIDE · puntos principales obligatorios/)
  assert.match(generator, /DESCRIPCION_POST · puntos secundarios obligatorios/)
  assert.match(generator, /const missingPoints = missingNamedRoutePoints\(requirement\?\.primaryPoints \?\? \[\], currentSlideText\)/)
  assert.match(generator, /slide\.texto_apoyo = slide\.texto_apoyo \? `\$\{slide\.texto_apoyo\} · \$\{missingPoints\.join\(' · '\)\}` : missingPoints\.join\(' · '\)/)
  assert.match(generator, /const missingSecondaryPoints = missingNamedRoutePoints\(secondaryPoints, descripcion\)/)
  assert.match(generator, /descripcion = `\$\{descripcion\} · \$\{missingSecondaryPoints\.join\(' · '\)\}`/)
  assert.doesNotMatch(generator, /omitió puntos principales/)
  assert.doesNotMatch(generator, /descripcion_post omitió puntos secundarios/)
  assert.doesNotMatch(guide, /Conservar todos los lugares nombrados dentro de cada día/)
})

test('Itinerario dispone de cinco intentos sin cambiar el resto de formatos', () => {
  assert.match(generator, /p\.formato === 'conversacion' \? 4 : p\.formato === 'itinerario' \? 5 : 2/)
})

test('Itinerario admite hasta ocho slides y agrupa los días por carga', () => {
  assert.match(generator, /itinerario: \{ min: 3, max: 8 \}/)
  assert.match(generator, /groupItineraryDaysByLoad/)
  assert.match(generator, /requiredItems: extractPrimaryPoints\(day\)\.length \+ extractTechnicalFactLabels\(singleDayGroup\)\.length/)
  assert.match(guide, /1 portada \+ hasta 6 slides de recorrido \+ 1 cierre/)
})

test('Itinerario solo bloquea amanecer o atardecer como momentos no documentados', () => {
  const temporalFacts = generator.match(/const unsupportedTemporalFacts = \[([^\]]*)\]/)?.[1]
  assert.equal(temporalFacts, "'amanecer', 'atardecer'")
  assert.match(guide, /No agregar "amanecer" o "atardecer"/)
  assert.doesNotMatch(guide, /No agregar "cerca"/)
})

test('Itinerario prohíbe clichés promocionales en prompt y validación', () => {
  const normalizedGuide = guide.replace(/\s+/g, ' ')
  for (const term of ['único', 'increíble', 'inolvidable', 'épico', 'recargar energías', 'vale la pena']) {
    assert.ok(generator.includes(term), term)
    assert.ok(normalizedGuide.includes(term), term)
  }
  assert.match(generator, /findForbiddenItineraryCopy/)
  assert.match(generator, /lenguaje promocional prohibido/)
})

test('Itinerario separa el ángulo interno del hook público', () => {
  assert.match(generator, /La portada debe PARAR EL SCROLL/)
  assert.match(generator, /angulo es la estrategia interna/)
  assert.match(generator, /angulo es la estrategia interna y texto_principal de portada es el copy público: deben ser diferentes/)
  assert.match(guide, /nunca puede copiarse como texto de[\s\S]{0,40}portada/)
})

test('El ángulo es metadata autocorregible y nunca rechaza una pieza', () => {
  assert.match(generator, /const angulo = nullableText\(raw\.angulo\) \?\? INTERNAL_ANGLE_FALLBACKS\[formato\]/)
  assert.match(generator, /ensureDistinctAngleFromOpening/)
  assert.doesNotMatch(generator, /throw new Error\('Falta angulo'\)/)
  assert.doesNotMatch(generator, /findForbiddenItineraryCopy\(`\$\{angulo\}/)
})

test('Lugar y Ascenso declaran el mismo máximo de principal que valida el módulo', () => {
  assert.match(generator, /hasta \$\{limits\.texto_principal\} caracteres/)
  assert.match(generator, /máximo \$\{LIMITS_BY_FORMAT\.ascenso\.texto_principal\} caracteres/)
  assert.doesNotMatch(generator, /hasta 75 caracteres/)
  assert.doesNotMatch(generator, /máximo 80 caracteres/)
})
