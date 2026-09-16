import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNicheContext, resolveCopySubvertical } from '../lib/context-builder.ts'

test('Aislamiento Trekking Local: Horco Molle solo carga local-recurring y no expedición ni internacional', () => {
  const context = buildNicheContext('trekking', {
    tipoViaje: 'salida_recurrente',
    destino: 'Horco Molle',
  })

  assert.equal(context.filesMissing.length, 0, `Archivos faltantes: ${context.filesMissing.join(', ')}`)
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/local-recurring-writer.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/local-recurring-content/SKILL.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/local-recurring-content/reference/local-examples.md'))

  // Aislamiento: no debe contener expedición ni internacional
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/expedition-writer.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/skills/expedition-high-ticket/SKILL.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/international-travel-writer.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/SKILL.md'))
})

test('Aislamiento Trekking Expedición: El Chaltén solo carga expedition y no local ni internacional', () => {
  const context = buildNicheContext('trekking', {
    tipoViaje: 'expedicion_premium',
    destino: 'El Chaltén',
  })

  assert.equal(context.filesMissing.length, 0, `Archivos faltantes: ${context.filesMissing.join(', ')}`)
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/expedition-writer.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/expedition-high-ticket/SKILL.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/expedition-high-ticket/reference/expedition-guidelines.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/expedition-high-ticket/reference/expedition-examples.md'))

  // Aislamiento: no debe contener local ni internacional
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/local-recurring-writer.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/skills/local-recurring-content/SKILL.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/international-travel-writer.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/SKILL.md'))
})

test('Aislamiento Internacional Playa/Caribe: Cancún carga caribbean-beach y NUNCA vertical-trekking', () => {
  const context = buildNicheContext('turismo_aventura', {
    tipoViaje: 'viaje_playa_caribe',
    destino: 'Cancún y Playa del Carmen',
  })

  assert.equal(context.filesMissing.length, 0, `Archivos faltantes: ${context.filesMissing.join(', ')}`)
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/international-travel-writer.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/SKILL.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/reference/caribbean-beach.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/reference/travel-examples.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/reference/anti-patterns.md'))

  // Aislamiento: NUNCA debe cargar vertical-trekking ni subagentes de trekking
  assert.ok(!context.filesLoaded.some(f => f.includes('vertical-trekking')), 'No debe cargar vertical-trekking en Caribe')
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/local-recurring-writer.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/expedition-writer.md'))
})

test('Aislamiento Internacional Europa/Ciudad: Madrid y Roma carga european-city y NUNCA vertical-trekking ni caribe', () => {
  const context = buildNicheContext('turismo_aventura', {
    subvertical: 'europa_ciudad',
    destino: 'Madrid y Roma',
  })

  assert.equal(context.filesMissing.length, 0, `Archivos faltantes: ${context.filesMissing.join(', ')}`)
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/international-travel-writer.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/SKILL.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/reference/european-city.md'))

  // Aislamiento: NUNCA debe cargar vertical-trekking, caribe ni montaña
  assert.ok(!context.filesLoaded.some(f => f.includes('vertical-trekking')), 'No debe cargar vertical-trekking en Europa')
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/skills/international-travel/reference/caribbean-beach.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/local-recurring-writer.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/expedition-writer.md'))
})
