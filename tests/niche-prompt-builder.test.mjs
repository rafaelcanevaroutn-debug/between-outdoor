import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNicheInstruction } from '../lib/content-engine/niche-prompt-builder.ts'
import { getNicheConfig } from '../lib/content-engine/niche-registry.ts'

test('PromptBuilder: Incluye el prompt base para un nicho válido', () => {
  const instruction = buildNicheInstruction('turismo_aventura', 'promocional')
  const basePrompt = getNicheConfig('turismo_aventura').prompts['promocional']
  
  assert.ok(instruction.includes(basePrompt), 'Debe incluir el prompt base')
  assert.ok(!instruction.includes('⛔ ANTIPATRONES'), 'No debe incluir sección antipatrones si está vacía')
})

test('PromptBuilder: Inyecta antipatrones y ejemplos si existen (montañismo mock)', () => {
  // En fase 3 temporalmente modificamos el config de montañismo en memoria para la prueba
  const config = getNicheConfig('montañismo')
  config.antipatterns = ['garantizar cumbre', 'paseo fácil']
  config.examples = [{ contexto: 'Venta Lanín', copy_ideal: 'Vení al Lanín con nosotros.' }]

  const instruction = buildNicheInstruction('montañismo', 'promocional')
  
  assert.ok(instruction.includes('garantizar cumbre'), 'Debe inyectar antipatrones')
  assert.ok(instruction.includes('Vení al Lanín con nosotros.'), 'Debe inyectar ejemplos')
})
