import test from 'node:test'
import assert from 'node:assert/strict'

import {ORGANIC_CARIBBEAN_TEMPLATES} from '../lib/creative-lab/organic-caribbean-templates.ts'
import {validateCreativeTemplateHtml} from '../lib/creative-lab/template-contract.ts'

test('los tres banners orgánicos son contratos válidos, 4:5 y sin logo obligatorio', () => {
  assert.equal(ORGANIC_CARIBBEAN_TEMPLATES.length, 3)
  assert.deepEqual(ORGANIC_CARIBBEAN_TEMPLATES.map(item => item.contract.mold_type), [1, 3, 5])
  for (const template of ORGANIC_CARIBBEAN_TEMPLATES) {
    assert.deepEqual(validateCreativeTemplateHtml(template.contract, template.html), [])
    assert.deepEqual(template.contract.dimensions, {width: 1080, height: 1350})
    assert.equal(template.contract.slots.logo.required, false)
    assert.match(template.html, /data-slot="bg_image"/u)
  }
})

test('la dirección visual evita componentes de web o agencia', () => {
  for (const template of ORGANIC_CARIBBEAN_TEMPLATES) {
    assert.doesNotMatch(template.html, /<button|class="card|class="pill|box-shadow/iu)
    assert.match(template.html, /object-fit:cover/u)
    assert.match(template.html, /text-align:center/u)
  }
})

