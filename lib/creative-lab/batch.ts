import type { CreativeTemplateContract } from './template-contract.ts'
import type { CreativeCandidate, CreativeCritique } from './openai-designer.ts'
import {OpenAICreativeBudgetExceededError} from './openai-budget.ts'

export interface CreativeLabBatchInput {
  contract: CreativeTemplateContract
  brief: string
  brandGuidelines: string
  rubric: string
  mockData: Record<string, string>
  branding: {
    primary: string
    secondary: string
    background: string
    text: string
    font_title: 'Inter' | 'Playfair Display'
    font_body: 'Inter' | 'Playfair Display'
  }
  count: number
}

export interface CreativeLabStoredCandidate {
  name: string
  rationale: string
  html: string
  critique: { verdict: 'pass' | 'fix'; issues: string[] }
  previewPng: Uint8Array
}

export interface CreativeLabBatchDependencies {
  generate: (input: CreativeLabBatchInput) => Promise<CreativeCandidate[]>
  render: (input: { contract: CreativeTemplateContract; html: string; mockData: Record<string, string>; branding: CreativeLabBatchInput['branding']; strictLayout: boolean }) => Promise<Uint8Array>
  critique: (input: { contract: CreativeTemplateContract; html: string; previewPng: Uint8Array; rubric: string }) => Promise<CreativeCritique>
  persist: (candidate: CreativeLabStoredCandidate) => Promise<{ id: string }>
}

export interface CreativeLabBatchResult {
  completed: Array<{ id: string; name: string; corrected: boolean }>
  failed: Array<{ name: string; error: string }>
}

export async function runCreativeLabBatch(
  input: CreativeLabBatchInput,
  dependencies: CreativeLabBatchDependencies,
): Promise<CreativeLabBatchResult> {
  const candidates = await dependencies.generate(input)
  if (candidates.length !== input.count) throw new Error('La generación no devolvió la cantidad solicitada')
  const result: CreativeLabBatchResult = {completed: [], failed: []}
  for (const candidate of candidates) {
    try {
      const initialPng = await dependencies.render({contract: input.contract, html: candidate.html, mockData: input.mockData, branding: input.branding, strictLayout: false})
      const critique = await dependencies.critique({contract: input.contract, html: candidate.html, previewPng: initialPng, rubric: input.rubric})
      const corrected = critique.verdict === 'fix'
      const finalHtml = critique.correctedHtml
      // Freno duro: una única corrección. El segundo render no vuelve a OpenAI.
      // La captura para visión es permisiva; la única imagen persistida siempre
      // vuelve a pasar por el renderer estricto, incluso si OpenAI dice `pass`.
      const finalPng = await dependencies.render({contract: input.contract, html: finalHtml, mockData: input.mockData, branding: input.branding, strictLayout: true})
      const stored = await dependencies.persist({
        name: candidate.name,
        rationale: candidate.rationale,
        html: finalHtml,
        critique: {verdict: critique.verdict, issues: critique.issues},
        previewPng: finalPng,
      })
      result.completed.push({id: stored.id, name: candidate.name, corrected})
    } catch (error) {
      if (error instanceof OpenAICreativeBudgetExceededError) throw error
      result.failed.push({name: candidate.name, error: error instanceof Error ? error.message : 'Error desconocido'})
    }
  }
  return result
}
