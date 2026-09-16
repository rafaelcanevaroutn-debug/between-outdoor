import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNicheContext } from '../lib/context-builder.ts'

test('buildNicheContext carga la nueva arquitectura modular para trekking y salida recurrente', () => {
  const context = buildNicheContext('trekking', { tipoViaje: 'salida_recurrente' })
  assert.equal(context.filesMissing.length, 0, `Archivos faltantes: ${context.filesMissing.join(', ')}`)
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/agent.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/editorial-standards/reference/brand-voice.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/editorial-standards/reference/business-model.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/editorial-standards/reference/anti-patterns.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/vertical-trekking/reference/domain.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/vertical-trekking/reference/patterns.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/vertical-trekking/reference/real-examples.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/hook-crafting/SKILL.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/local-recurring-writer.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/local-recurring-content/SKILL.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/local-recurring-content/reference/local-examples.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/quality-auditor.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/skills/expedition-high-ticket/SKILL.md'))
  assert.match(context.text, /Copy Agent/i)
  assert.match(context.text, /Local & Recurring/i)
})

test('buildNicheContext carga expedition-high-ticket para salidas que no son recurrentes', () => {
  const context = buildNicheContext('trekking', { tipoViaje: 'expedicion_montana' })
  assert.equal(context.filesMissing.length, 0)
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/subagents/expedition-writer.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/expedition-high-ticket/SKILL.md'))
  assert.ok(!context.filesLoaded.includes('knowledge/agents/copy-agent/skills/local-recurring-content/SKILL.md'))
  assert.match(context.text, /Expedition/i)
})

test('buildNicheContext carga skill de carrusel cuando formato es carrusel', () => {
  const context = buildNicheContext('running', { formato: 'carrusel' })
  assert.equal(context.filesMissing.length, 0)
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/format-carousel/SKILL.md'))
  assert.ok(context.filesLoaded.includes('knowledge/agents/copy-agent/skills/vertical-running/reference/domain.md'))
})

test('knowledge-registry resuelve capas canónicas desde knowledge/', async () => {
  const { resolveCarouselKnowledge } = await import('../lib/content-engine/knowledge-registry.ts')
  const layers = resolveCarouselKnowledge({
    niche: 'trekking',
    theme: 'destinos',
    format: 'organico',
  })
  assert.ok(layers.length > 0)
  const lineamiento = layers.find(l => l.key === 'lineamiento')
  const antiPatterns = layers.find(l => l.key === 'anti_patterns')
  const mundo = layers.find(l => l.key === 'mundo')

  assert.ok(lineamiento)
  assert.equal(lineamiento.source, 'agents/copy-agent/skills/editorial-standards/reference/brand-voice.md')
  assert.ok(antiPatterns)
  assert.equal(antiPatterns.source, 'agents/copy-agent/skills/editorial-standards/reference/anti-patterns.md')
  assert.ok(mundo)
  assert.equal(mundo.source, 'agents/copy-agent/skills/vertical-trekking/reference/domain.md')
})
