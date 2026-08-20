import test from 'node:test'
import assert from 'node:assert/strict'
import {addPricesToApprovedMolde4} from '../lib/creative-lab/upgrade-molde-4-template.ts'

const source = `<style data-template-css>.logo {width:190px;height:56px;object-fit:contain}.row{grid-template-columns: 1fr 250px;}.date {color:var(--brand-primary);text-align:right}</style><main>${[1,2,3,4].map(index => `<div><span class="date" data-slot="salida_${index}_fecha"></span></div>`).join('')}</main>`

test('agrega precio a las cuatro filas preservando fecha y dirección visual', () => {
  const result = addPricesToApprovedMolde4(source)
  assert.match(result, /grid-template-columns: 1fr 190px 175px/u)
  assert.equal([...result.matchAll(/data-slot="salida_[1-4]_precio"/gu)].length, 4)
  assert.equal([...result.matchAll(/data-slot="salida_[1-4]_fecha"/gu)].length, 4)
  assert.match(result, /between-logo-contrast/u)
  assert.match(result, /width: 240px/u)
})

test('es idempotente y falla cerrado ante una plantilla inesperada', () => {
  const once = addPricesToApprovedMolde4(source)
  assert.equal(addPricesToApprovedMolde4(once), once)
  assert.throws(() => addPricesToApprovedMolde4('<main></main>'), /grilla aprobada/u)
})
