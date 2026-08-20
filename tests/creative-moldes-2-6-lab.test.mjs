import test from 'node:test'
import assert from 'node:assert/strict'

import {MOLDE_2_CREATIVE_CONTRACT, MOLDE_2_CREATIVE_SKELETON, MOLDE_2_MOCK_TEXT} from '../lib/creative-lab/molde-2-lab.ts'
import {MOLDE_6_CREATIVE_CONTRACT, MOLDE_6_CREATIVE_SKELETON, MOLDE_6_MOCK_TEXT} from '../lib/creative-lab/molde-6-lab.ts'
import {validateCreativeTemplateHtml} from '../lib/creative-lab/template-contract.ts'

test('Molde 2 fija 1080×1350 y traduce la ficha a seis slots visuales acotados', () => {
  assert.deepEqual(MOLDE_2_CREATIVE_CONTRACT.dimensions, {width: 1080, height: 1350})
  assert.equal(MOLDE_2_CREATIVE_CONTRACT.mold_type, 2)
  assert.equal(MOLDE_2_CREATIVE_CONTRACT.slots.ficha_1.required, true)
  assert.equal(MOLDE_2_CREATIVE_CONTRACT.slots.ficha_3.required, true)
  assert.equal(MOLDE_2_CREATIVE_CONTRACT.slots.ficha_6.required, false)
  for (const [name, slot] of Object.entries(MOLDE_2_CREATIVE_CONTRACT.slots)) {
    if (slot.type === 'text' && name in MOLDE_2_MOCK_TEXT) assert.equal(MOLDE_2_MOCK_TEXT[name].length <= slot.max_chars, true)
  }
})

test('Molde 6 conserva mensaje y convocatoria como slots separados', () => {
  assert.deepEqual(MOLDE_6_CREATIVE_CONTRACT.dimensions, {width: 1080, height: 1350})
  assert.equal(MOLDE_6_CREATIVE_CONTRACT.mold_type, 6)
  assert.equal(MOLDE_6_MOCK_TEXT.mensaje.length <= MOLDE_6_CREATIVE_CONTRACT.slots.mensaje.max_chars, true)
  assert.equal(MOLDE_6_MOCK_TEXT.convocatoria.length <= MOLDE_6_CREATIVE_CONTRACT.slots.convocatoria.max_chars, true)
})

test('los esqueletos bloqueados contienen todos los slots y tokens antes de llamar a OpenAI', () => {
  assert.deepEqual(validateCreativeTemplateHtml(MOLDE_2_CREATIVE_CONTRACT, MOLDE_2_CREATIVE_SKELETON), [])
  assert.deepEqual(validateCreativeTemplateHtml(MOLDE_6_CREATIVE_CONTRACT, MOLDE_6_CREATIVE_SKELETON), [])
})
