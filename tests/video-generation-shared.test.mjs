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

test('normaliza contra el catálogo cerrado, descarta lo que no pertenece y conserva fallback determinístico', () => {
  assert.deepEqual(
    uniqueVideoTypographyIds([' Montserrat ', 'Inter', 'Montserrat', '', 'ComicSans']),
    ['Montserrat', 'Inter'],
  )
  assert.equal(resolveVideoTypography('Inter', ['Montserrat', 'Inter']), 'Inter')
  assert.equal(resolveVideoTypography('inventada', ['Montserrat', 'Inter']), 'Montserrat')
})
