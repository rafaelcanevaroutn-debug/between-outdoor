import test from 'node:test'
import assert from 'node:assert/strict'
import {critiqueCreativeCandidate, generateCreativeCandidates} from '../lib/creative-lab/openai-designer.ts'
import {OpenAICreativeBudget} from '../lib/creative-lab/openai-budget.ts'

const contract = {template_id: 'banner_molde_1_minimal', version: '1.0.0', piece_type: 'banner', mold_type: 1, dimensions: {width: 1080, height: 1350}, variant: 'dark', slots: {titulo: {type: 'text', required: true, max_chars: 40}}, branding_tokens: ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body']}
const html = `<style data-template-css>.slide{width:1080px;height:1350px;overflow:hidden;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1{font-family:var(--font-title)}</style><main class="slide"><h1 data-slot="titulo"></h1></main>`

function fake(body) {
  return async (_url, init) => {
    const request = JSON.parse(init.body)
    assert.equal(request.store, false)
    assert.equal(request.text.format.type, 'json_schema')
    assert.equal(typeof request.max_output_tokens, 'number')
    return new Response(JSON.stringify({usage: {input_tokens: 100, output_tokens: 50, total_tokens: 150}, output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(body)}]}]}), {status: 200, headers: {'Content-Type': 'application/json'}})
  }
}

function budget(limitUsd = 2) {
  return new OpenAICreativeBudget({limitUsd, pricing: {model: 'test-model', inputUsdPerMillion: 1, outputUsdPerMillion: 2}})
}

test('genera candidatos estructurados y valida cada HTML localmente', async () => {
  const usageBudget = budget()
  const result = await generateCreativeCandidates({contract, brief: 'mínimo', brandGuidelines: 'sobrio', rubric: 'legible', count: 1, config: {apiKey: 'test', model: 'test-model', budget: usageBudget, fetchImpl: fake({candidates: [{name: 'A', rationale: 'Jerarquía clara', html}]})}})
  assert.equal(result[0].name, 'A')
  assert.deepEqual(usageBudget.snapshot(), {limitUsd: 2, spentUsd: 0.0002, reservedUsd: 0, remainingUsd: 1.9998, responses: 1, inputTokens: 100, outputTokens: 50})
})

test('la crítica visual envía PNG y sólo reemplaza CSS', async () => {
  let sentImage = false
  const fetchImpl = async (_url, init) => {
    const request = JSON.parse(init.body)
    sentImage = request.input[0].content.some(item => item.type === 'input_image' && item.image_url.startsWith('data:image/png;base64,'))
    return fake({verdict: 'fix', issues: ['contraste'], corrected_css: '.slide{width:1080px;height:1350px;overflow:hidden;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1{font-family:var(--font-title);font-size:80px}'})(_url, init)
  }
  const result = await critiqueCreativeCandidate({contract, html, pngBase64: 'YWJj', rubric: 'premium', config: {apiKey: 'test', model: 'test-model', budget: budget(), fetchImpl}})
  assert.equal(sentImage, true)
  assert.match(result.correctedHtml, /font-size:80px/u)
  assert.match(result.correctedHtml, /data-slot="titulo"/u)
})

test('sin credenciales no intenta llamar a OpenAI', async () => {
  await assert.rejects(() => generateCreativeCandidates({contract, brief: '', brandGuidelines: '', rubric: '', count: 1, config: {apiKey: '', model: '', budget: budget()}}), /OPENAI_API_KEY/u)
})

test('el presupuesto insuficiente detiene antes de llamar a OpenAI', async () => {
  let called = false
  const tinyBudget = budget(0.001)
  await assert.rejects(
    () => generateCreativeCandidates({contract, brief: 'mínimo', brandGuidelines: 'sobrio', rubric: 'legible', count: 1, config: {apiKey: 'test', model: 'test-model', budget: tinyBudget, fetchImpl: async () => { called = true; throw new Error('no debería ejecutarse') }}}),
    /Presupuesto OpenAI insuficiente/u,
  )
  assert.equal(called, false)
  assert.equal(tinyBudget.snapshot().spentUsd, 0)
})

test('si falta usage detiene la tanda y carga la reserva máxima por seguridad', async () => {
  const usageBudget = budget()
  await assert.rejects(
    () => generateCreativeCandidates({contract, brief: 'mínimo', brandGuidelines: 'sobrio', rubric: 'legible', count: 1, config: {apiKey: 'test', model: 'test-model', budget: usageBudget, fetchImpl: async () => new Response(JSON.stringify({output: []}), {status: 200})}}),
    /no devolvió usage/u,
  )
  assert.equal(usageBudget.snapshot().responses, 1)
  assert.equal(usageBudget.snapshot().remainingUsd < 2, true)
})
