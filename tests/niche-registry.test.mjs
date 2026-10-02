import test from 'node:test'
import assert from 'node:assert/strict'
import { getNicheConfig } from '../lib/content-engine/niche-registry.ts'
import { VERTICAL_PROMPTS } from '../lib/verticals.ts'

test('Registry: Devuelve la configuración base para turismo_aventura', () => {
  const config = getNicheConfig('turismo_aventura')
  
  assert.ok(config, 'Debe devolver un objeto de configuración')
  assert.equal(config.id, 'turismo_aventura', 'El ID debe coincidir')
  assert.ok(config.prompts, 'Debe tener el bloque de prompts definidos')
  assert.equal(config.prompts['promocional'], VERTICAL_PROMPTS['promocional'], 'Debe contener los prompts reales históricos')
  assert.ok(Array.isArray(config.antipatterns), 'Debe tener un array de antipatrones')
  assert.ok(Array.isArray(config.examples), 'Debe tener un array de ejemplos')
})

test('Registry: Fallback seguro a turismo_aventura para nichos desconocidos', () => {
  // Simulamos un input inválido saltando typescript
  const config = getNicheConfig('nicho_desconocido')
  
  assert.equal(config.id, 'turismo_aventura', 'Debe hacer fallback automático y seguro a turismo_aventura')
})

test('Registry: Devuelve configuración específica al solicitar montañismo', () => {
  const config = getNicheConfig('montañismo') 
  
  assert.equal(config.id, 'montañismo', 'Debe devolver el ID correcto')
  assert.ok(config.prompts)
})
