import test from 'node:test'
import assert from 'node:assert/strict'
import {
  expandPromoVariants,
  isPromoVariantRequest,
} from '../lib/carrusel-promo-variant.ts'

test('acepta únicamente las tres variantes promo y todas', () => {
  for (const value of ['promo_simple', 'promo_cta', 'promo_info', 'todas']) {
    assert.equal(isPromoVariantRequest(value), true, value)
  }
})

test('rechaza valores promo inválidos antes de invocar el generador', () => {
  for (const value of [undefined, null, '', 'promo_desconocida', 123, ['promo_simple']]) {
    assert.equal(isPromoVariantRequest(value), false, JSON.stringify(value))
  }
})

test('expande todas sin casts ni variantes inventadas', () => {
  assert.deepEqual(expandPromoVariants('todas'), ['promo_simple', 'promo_cta', 'promo_info'])
  assert.deepEqual(expandPromoVariants('promo_cta'), ['promo_cta'])
})
