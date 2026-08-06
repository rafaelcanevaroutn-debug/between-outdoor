import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractVideoJson,
  resolveVideoTypography,
  uniqueVideoTypographyIds,
} from '../lib/generators/video-generation-shared.ts'

test('extrae el mismo objeto JSON con o sin fence', () => {
  assert.deepEqual(extractVideoJson('```json\n{"copy":"hola"}\n```'), { copy: 'hola' })
  assert.deepEqual(extractVideoJson('texto {"copy":"hola"} final'), { copy: 'hola' })
})

test('normaliza catálogo y conserva fallback determinístico', () => {
  assert.deepEqual(uniqueVideoTypographyIds([' serif ', 'sans', 'serif', '']), ['serif', 'sans'])
  assert.equal(resolveVideoTypography('sans', ['serif', 'sans']), 'sans')
  assert.equal(resolveVideoTypography('inventada', ['serif', 'sans']), 'serif')
})
