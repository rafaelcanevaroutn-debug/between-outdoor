import test from 'node:test'
import assert from 'node:assert/strict'

import {COMMERCIAL_LANGUAGE_PATTERN, INVENTED_URGENCY_PATTERN} from '../lib/generators/video-commercial-patterns.ts'

test('los límites Unicode detectan formas con vocal acentuada', () => {
  for (const text of ['Reservá tu lugar', 'Comentá INFO', 'Últimos lugares', 'Escribinos por WhatsApp']) {
    assert.equal(COMMERCIAL_LANGUAGE_PATTERN.test(text), true, text)
  }
  assert.equal(INVENTED_URGENCY_PATTERN.test('Quedan los últimos lugares'), true)
  assert.equal(INVENTED_URGENCY_PATTERN.test('Sólo hoy'), true)
})

test('los límites Unicode no disparan por subcadenas dentro de otra palabra', () => {
  assert.equal(COMMERCIAL_LANGUAGE_PATTERN.test('Una preciosidad de paisaje'), false)
  assert.equal(COMMERCIAL_LANGUAGE_PATTERN.test('Un comentario sobre el sendero'), false)
})
