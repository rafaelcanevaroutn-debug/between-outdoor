import test from 'node:test'
import assert from 'node:assert/strict'
import {validateCreativeTemplateHtml} from '../lib/creative-lab/template-contract.ts'
import {MOLDE_3_CREATIVE_CONTRACT, MOLDE_3_CREATIVE_SKELETON} from '../lib/creative-lab/molde-3-lab.ts'
import {MOLDE_4_CREATIVE_CONTRACT, MOLDE_4_CREATIVE_SKELETON} from '../lib/creative-lab/molde-4-lab.ts'
import {MOLDE_5_CREATIVE_CONTRACT, MOLDE_5_CREATIVE_SKELETON} from '../lib/creative-lab/molde-5-lab.ts'

for (const [mold, contract, html] of [[3, MOLDE_3_CREATIVE_CONTRACT, MOLDE_3_CREATIVE_SKELETON], [4, MOLDE_4_CREATIVE_CONTRACT, MOLDE_4_CREATIVE_SKELETON], [5, MOLDE_5_CREATIVE_CONTRACT, MOLDE_5_CREATIVE_SKELETON]]) {
  test(`Molde ${mold}: contrato y esqueleto son válidos a 1080×1350`, () => {
    assert.deepEqual(validateCreativeTemplateHtml(contract, html), [])
  })
}
