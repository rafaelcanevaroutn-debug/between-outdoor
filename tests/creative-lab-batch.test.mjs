import test from 'node:test'
import assert from 'node:assert/strict'
import {runCreativeLabBatch} from '../lib/creative-lab/batch.ts'

const input = {contract: {template_id: 'banner_molde_1', version: '1.0.0', piece_type: 'banner', mold_type: 1, dimensions: {width: 1080, height: 1350}, variant: 'dark', slots: {titulo: {type: 'text', required: true, max_chars: 40}}, branding_tokens: ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body']}, brief: 'mínimo', brandGuidelines: 'sobrio', rubric: 'legible', mockData: {titulo: 'El Chaltén'}, branding: {primary: '#F4C95D', secondary: '#315B4C', background: '#07100F', text: '#FFFFFF', font_title: 'Playfair Display', font_body: 'Inter'}, count: 2}

test('hace una sola crítica y re-renderiza únicamente el candidato corregido', async () => {
  let renders = 0
  let critiques = 0
  const persisted = []
  const result = await runCreativeLabBatch(input, {
    generate: async () => [{name: 'A', rationale: 'a', html: 'html-a'}, {name: 'B', rationale: 'b', html: 'html-b'}],
    render: async ({html}) => { renders++; return new TextEncoder().encode(`png:${html}`) },
    critique: async ({html}) => { critiques++; return html === 'html-a' ? {verdict: 'fix', issues: ['contraste'], correctedHtml: 'html-a-css'} : {verdict: 'pass', issues: [], correctedHtml: html} },
    persist: async candidate => { persisted.push(candidate); return {id: `id-${candidate.name}`} },
  })
  assert.equal(critiques, 2)
  assert.equal(renders, 3)
  assert.equal(result.completed[0].corrected, true)
  assert.equal(result.completed[1].corrected, false)
  assert.equal(new TextDecoder().decode(persisted[0].previewPng), 'png:html-a-css')
})

test('un candidato roto no cancela el resto de la tanda', async () => {
  const result = await runCreativeLabBatch(input, {
    generate: async () => [{name: 'roto', rationale: '', html: 'bad'}, {name: 'bueno', rationale: '', html: 'ok'}],
    render: async ({html}) => { if (html === 'bad') throw new Error('overflow'); return new Uint8Array([1]) },
    critique: async ({html}) => ({verdict: 'pass', issues: [], correctedHtml: html}),
    persist: async candidate => ({id: candidate.name}),
  })
  assert.deepEqual(result.failed, [{name: 'roto', error: 'overflow'}])
  assert.deepEqual(result.completed, [{id: 'bueno', name: 'bueno', corrected: false}])
})
