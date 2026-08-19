import test from 'node:test'
import assert from 'node:assert/strict'
import {critiqueCreativeCandidate, generateCreativeCandidates} from '../lib/creative-lab/openai-designer.ts'

const contract = {template_id: 'banner_molde_1_minimal', version: '1.0.0', piece_type: 'banner', mold_type: 1, dimensions: {width: 1080, height: 1350}, variant: 'dark', slots: {titulo: {type: 'text', required: true, max_chars: 40}}, branding_tokens: ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body']}
const html = `<style data-template-css>.slide{width:1080px;height:1350px;overflow:hidden;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1{font-family:var(--font-title)}</style><main class="slide"><h1 data-slot="titulo"></h1></main>`

function fake(body) {
  return async (_url, init) => {
    const request = JSON.parse(init.body)
    assert.equal(request.store, false)
    assert.equal(request.text.format.type, 'json_schema')
    return new Response(JSON.stringify({output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(body)}]}]}), {status: 200, headers: {'Content-Type': 'application/json'}})
  }
}

test('genera candidatos estructurados y valida cada HTML localmente', async () => {
  const result = await generateCreativeCandidates({contract, brief: 'mínimo', brandGuidelines: 'sobrio', rubric: 'legible', count: 1, config: {apiKey: 'test', model: 'test-model', fetchImpl: fake({candidates: [{name: 'A', rationale: 'Jerarquía clara', html}]})}})
  assert.equal(result[0].name, 'A')
})

test('la crítica visual envía PNG y sólo reemplaza CSS', async () => {
  let sentImage = false
  const fetchImpl = async (_url, init) => {
    const request = JSON.parse(init.body)
    sentImage = request.input[0].content.some(item => item.type === 'input_image' && item.image_url.startsWith('data:image/png;base64,'))
    return fake({verdict: 'fix', issues: ['contraste'], corrected_css: '.slide{width:1080px;height:1350px;overflow:hidden;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1{font-family:var(--font-title);font-size:80px}'})(_url, init)
  }
  const result = await critiqueCreativeCandidate({contract, html, pngBase64: 'YWJj', rubric: 'premium', config: {apiKey: 'test', model: 'test-model', fetchImpl}})
  assert.equal(sentImage, true)
  assert.match(result.correctedHtml, /font-size:80px/u)
  assert.match(result.correctedHtml, /data-slot="titulo"/u)
})

test('sin credenciales no intenta llamar a OpenAI', async () => {
  await assert.rejects(() => generateCreativeCandidates({contract, brief: '', brandGuidelines: '', rubric: '', count: 1, config: {apiKey: '', model: ''}}), /OPENAI_API_KEY/u)
})
