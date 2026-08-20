import test from 'node:test'
import assert from 'node:assert/strict'
import {MOLDE_1_CREATIVE_CONTRACT, MOLDE_1_MOCK_TEXT} from '../lib/creative-lab/molde-1-lab.ts'
import {validateCreativeTemplateContract} from '../lib/creative-lab/template-contract.ts'
import {BANNER_MOLDE_1_CAPS} from '../lib/banner-render-contract.ts'

test('el contrato creativo de Molde 1 comparte los caps de producción', () => {
  assert.deepEqual(validateCreativeTemplateContract(MOLDE_1_CREATIVE_CONTRACT), [])
  assert.equal(MOLDE_1_CREATIVE_CONTRACT.dimensions.width, 1080)
  assert.equal(MOLDE_1_CREATIVE_CONTRACT.dimensions.height, 1350)
  assert.equal(MOLDE_1_CREATIVE_CONTRACT.slots.copy.max_chars, BANNER_MOLDE_1_CAPS.copy)
  assert.equal(MOLDE_1_CREATIVE_CONTRACT.slots.item_1.max_chars, BANNER_MOLDE_1_CAPS.item)
  for (const [name, value] of Object.entries(MOLDE_1_MOCK_TEXT)) {
    const slot = MOLDE_1_CREATIVE_CONTRACT.slots[name]
    if (slot.type === 'text') assert.ok(value.length <= slot.max_chars, `${name} excede su cap`)
    else assert.match(value, /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,/u)
  }
})
