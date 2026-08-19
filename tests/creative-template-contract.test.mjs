import test from 'node:test'
import assert from 'node:assert/strict'
import {replaceCreativeTemplateCss, validateCreativeTemplateHtml} from '../lib/creative-lab/template-contract.ts'

const contract = {
  template_id: 'banner_molde_1_minimal', version: '1.0.0', piece_type: 'banner', mold_type: 1,
  dimensions: {width: 1080, height: 1350}, variant: 'dark',
  slots: {titulo: {type: 'text', required: true, max_chars: 40}, foto: {type: 'image_url', required: true}},
  branding_tokens: ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body'],
}
const html = `<style data-template-css>.slide{width:1080px;height:1350px;overflow:hidden;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1{font-family:var(--font-title)}</style><main class="slide"><img data-slot="foto"><h1 data-slot="titulo"></h1></main>`

test('acepta un molde seguro, versionado y con slots exactos', () => {
  assert.deepEqual(validateCreativeTemplateHtml(contract, html), [])
})

test('la crítica sólo puede reemplazar el bloque CSS marcado', () => {
  const changed = replaceCreativeTemplateCss(html, '.slide{overflow:hidden;color:var(--brand-text)}')
  assert.match(changed, /data-slot="titulo"/u)
  assert.match(changed, /color:var\(--brand-text\)/u)
  assert.throws(() => replaceCreativeTemplateCss(html, '</style><script>x()</script>'))
})

test('rechaza scripts, handlers, red externa y fuentes importadas', () => {
  for (const fragment of ['<script>alert(1)</script>', '<img onerror="x()">', '<iframe></iframe>', '@import url(https://fonts.test/x.css)']) {
    assert.ok(validateCreativeTemplateHtml(contract, `${html}${fragment}`).some(error => error.includes('prohibido')))
  }
})

test('rechaza slot requerido ausente o duplicado', () => {
  assert.ok(validateCreativeTemplateHtml(contract, html.replace('data-slot="titulo"', '')).some(error => error.includes('titulo')))
  assert.ok(validateCreativeTemplateHtml(contract, `${html}<b data-slot="titulo"></b>`).some(error => error.includes('titulo')))
})

test('rechaza semver, caps, dimensiones y tokens fuera del catálogo', () => {
  const invalid = {...contract, version: 'v1', dimensions: {width: 100, height: 9000}, slots: {titulo: {type: 'text', required: true}}, branding_tokens: [...contract.branding_tokens, '--font-inventada']}
  const errors = validateCreativeTemplateHtml(invalid, html)
  assert.ok(errors.some(error => error.includes('semver')))
  assert.ok(errors.some(error => error.includes('max_chars')))
  assert.ok(errors.some(error => error.includes('dimensions')))
  assert.ok(errors.some(error => error.includes('--font-inventada')))
})
