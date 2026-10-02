import type { Vertical } from '../../types/index.ts'
import { getNicheConfig } from './niche-registry.ts'

/**
 * Construye la instrucción específica para Gemini combinando el prompt base
 * de la vertical con las reglas específicas del nicho (antipatrones y ejemplos).
 */
export function buildNicheInstruction(niche: string, vertical: Vertical): string {
  const config = getNicheConfig(niche)
  const basePrompt = config.prompts[vertical]

  let instruction = basePrompt

  if (config.domain_knowledge && config.domain_knowledge.length > 0) {
    instruction += `\n\n🌍 CONTEXTO DEL ESCENARIO (BACKGROUND KNOWLEDGE):\n- ${config.domain_knowledge.join('\n- ')}`
  }

  if (config.subtypes && config.subtypes.length > 0) {
    instruction += `\n\n🎯 SUBTIPOS DE ESTA ACTIVIDAD:\n- ${config.subtypes.join('\n- ')}`
  }

  if (config.criticalFacts && config.criticalFacts.length > 0) {
    instruction += `\n\n⚠️ CRITICAL FACTS — NEVER INVENT:\n- ${config.criticalFacts.join('\n- ')}`
  }

  if (config.buyerQuestions && config.buyerQuestions.length > 0) {
    instruction += `\n\n❓ PREGUNTAS DEL COMPRADOR A RESPONDER/ABORDAR:\n- ${config.buyerQuestions.join('\n- ')}`
  }

  if (config.editorialPillars && config.editorialPillars.length > 0) {
    instruction += `\n\n🏛️ PILARES EDITORIALES / ÁNGULOS:\n- ${config.editorialPillars.join('\n- ')}`
  }

  if (config.assetRequirements && config.assetRequirements.length > 0) {
    instruction += `\n\n📷 ASSET HINTS (Material visual ideal):\n- ${config.assetRequirements.join('\n- ')}`
  }

  if (config.antipatterns && config.antipatterns.length > 0) {
    instruction += `\n\n⛔ ANTIPATRONES (NO HACER NI DECIR):\n- ${config.antipatterns.join('\n- ')}`
  }

  // 🛡️ REGLA GLOBAL GUARDRAIL APLICABLE A TODOS LOS NICHOS
  instruction += `\n\n🛡️ FACTUAL INTEGRITY — OUTDOOR GUARDRAIL:
Never invent or infer operational, safety, regulatory or commercial facts.
If a critical fact is missing: omit it, request it, or use wording that does not imply a value.
Never infer a critical fact from an image, destination name, or general model knowledge.`

  if (config.examples && config.examples.length > 0) {
    instruction += `\n\n✅ EJEMPLOS IDEALES:\n`
    instruction += config.examples.map(ex => `[Contexto]: ${ex.contexto}\n[Copy]: ${ex.copy_ideal}`).join('\n\n')
  }

  return instruction
}
