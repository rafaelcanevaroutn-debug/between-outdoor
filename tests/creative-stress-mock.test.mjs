import test from 'node:test'
import assert from 'node:assert/strict'

import {MOLDE_2_CREATIVE_CONTRACT} from '../lib/creative-lab/molde-2-lab.ts'
import {MOLDE_6_CREATIVE_CONTRACT} from '../lib/creative-lab/molde-6-lab.ts'
import {buildCreativeStressMockData} from '../lib/creative-lab/stress-mock.ts'

test('arma casos extremos para todos los slots sin superar sus caps', () => {
  for (const contract of [MOLDE_2_CREATIVE_CONTRACT, MOLDE_6_CREATIVE_CONTRACT]) {
    const mock = buildCreativeStressMockData({contract, logoDataUrl: 'data:image/png;base64,YWJj', backgroundDataUrl: 'data:image/jpeg;base64,YWJj'})
    assert.deepEqual(Object.keys(mock).sort(), Object.keys(contract.slots).sort())
    for (const [name, slot] of Object.entries(contract.slots)) {
      if (slot.type === 'text') {
        assert.equal(mock[name].length <= slot.max_chars, true)
        assert.equal(mock[name].length >= Math.min(12, slot.max_chars), true)
      }
    }
  }
})
