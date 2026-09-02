import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const generator = fs.readFileSync(path.join(process.cwd(), 'lib/generators/carrusel-formato.ts'), 'utf8')
const sharedRules = fs.readFileSync(path.join(process.cwd(), 'lib/generators/carrusel-copy-rules.ts'), 'utf8')

test('los seis formatos reciben una única regla compartida de apertura', () => {
  assert.match(sharedRules, /export const SHARED_OPENING_RULES/)
  assert.match(sharedRules, /no debe nombrar el formato, el mes ni el destino a secas/)
  assert.match(sharedRules, /Si la apertura se puede leer como un título de índice, está mal/)
  assert.match(generator, /SHARED_OPENING_RULES,[\s\S]*from '@\/lib\/generators\/carrusel-copy-rules'/)
  assert.doesNotMatch(generator, /const SHARED_OPENING_RULES/)
  assert.ok((generator.match(/\$\{SHARED_OPENING_RULES\}/g) ?? []).length >= 4)
})

test('los seis formatos y sus reviewers reciben la regla compartida de especificidad', () => {
  assert.match(sharedRules, /export const SHARED_SPECIFICITY_RULES/)
  assert.match(sharedRules, /Hacé la prueba de reemplazo/)
  assert.match(sharedRules, /Aplicá esta prueba a portada, desarrollos, cierre y descripcion_post/)
  assert.match(generator, /SHARED_SPECIFICITY_RULES,[\s\S]*from '@\/lib\/generators\/carrusel-copy-rules'/)
  assert.doesNotMatch(generator, /const SHARED_SPECIFICITY_RULES/)
  assert.ok((generator.match(/\$\{SHARED_SPECIFICITY_RULES\}/g) ?? []).length >= 4)
})

test('angulo distinto de apertura se garantiza por autocorrección y no por rechazo', () => {
  assert.match(generator, /function ensureDistinctAngleFromOpening/)
  assert.match(generator, /INTERNAL_ANGLE_FALLBACKS\[formato\]/)
  assert.match(generator, /parsed = ensureDistinctAngleFromOpening\(p\.formato, limitResolution\.output\)/)
  assert.doesNotMatch(generator, /throw new Error\([^\n]*angulo[^\n]*portada/i)
})

test('solo los formatos con imágenes asignadas por sistema aceptan indicaciones ausentes', () => {
  const ownedBlock = generator.match(/const SYSTEM_OWNED_IMAGE_FORMATS[\s\S]*?\]\)/)?.[0] ?? ''
  for (const format of ['organico', 'itinerario', 'calendario', 'lugar']) assert.ok(ownedBlock.includes(`'${format}'`), format)
  assert.ok(!ownedBlock.includes("'ascenso'"))
  assert.doesNotMatch(generator, /Las indicaciones de imagen de Orgánico deben ser específicas/)
  assert.match(generator, /systemImagePlaceholder\(formato\)/)
})

test('Calendario conserva el hook generado y mantiene fichas determinísticas', () => {
  assert.match(generator, /const rawCover = rawSlides\.find/)
  assert.match(generator, /nullableText\(\(rawCover as Record<string, unknown>\)\.texto_principal\) \?\? fallbackCover/)
  assert.match(generator, /groups\.forEach\(\(group, index\) =>/)
})

test('Orgánico normaliza ficha y descripción antes de validar', () => {
  assert.match(generator, /normalizeOrganicDraft\(organicSource/)
  assert.match(generator, /exactDateRange: compactDateRange\(p\.salida\.fecha_inicio, p\.salida\.fecha_fin\)/)
  assert.match(generator, /capacity: p\.salida\.cupos/)
})

test('Conversación preserva metadata base y el reviewer reemplaza solo slides', () => {
  assert.match(generator, /const draftExtracted = extractJson\(result\.text\)/)
  assert.match(generator, /mergeConversationEditorialReview\(draftExtracted, extractJson\(reviewed\.text\)\)/)
  assert.match(generator, /El sistema preservará angulo, descripcion_post y cta_comentario/)
})

test('Conversación local usa IA primero y deja el banco fijo solo como fallback final', () => {
  assert.match(generator, /const useLocalConversationFallback = isLocalConversation && attempt === maxAttempts/)
  assert.match(generator, /const result = useLocalConversationFallback[\s\S]*generateWithRetryTracked/)
  assert.doesNotMatch(generator, /const deterministicLocalConversation/)
})

test('la reescritura dirigida modifica solo descripcion antes de validar límites', () => {
  const parseIndex = generator.indexOf('let candidate = parseResponse(')
  const rewriteIndex = generator.indexOf('candidate = await rewriteDescriptionFieldIfNeeded(p, candidate)')
  const limitsIndex = generator.indexOf('const limitValidation = validateAdaptiveTextLimits', rewriteIndex)
  assert.ok(parseIndex >= 0 && rewriteIndex > parseIndex && limitsIndex > rewriteIndex)
  assert.match(generator, /p\.formato !== 'organico' && p\.formato !== 'conversacion'/)
  assert.match(generator, /editor dirigido de descripcion_post falló; se aplicará fallback local/)
  assert.match(generator, /return \{ \.\.\.output, descripcion \}/)
})

test('Lugar refuerza fidelidad de actividades y CTA único en ambos prompts', () => {
  assert.ok((generator.match(/no (?:pueden prometer|prometen) cumbres, ascensos, escalada/g) ?? []).length >= 2)
  assert.match(generator, /La descripción contiene el CTA una sola vez, al final/)
  assert.match(generator, /activityEvidence:/)
})
