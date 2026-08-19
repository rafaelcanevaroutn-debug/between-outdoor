import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {buildCreativeStressResult, creativeTemplateApprovalBlocker} from '../lib/creative-lab/stress-status.ts'

test('la aprobación exige una prueba extrema persistida y aprobada', () => {
  assert.match(creativeTemplateApprovalBlocker({}) ?? '', /Falta ejecutar/u)
  assert.equal(creativeTemplateApprovalBlocker({stress_tested_at: '2026-08-19T00:00:00.000Z', stress_test_passed: false, stress_test_error: 'overflow'}), 'overflow')
  assert.equal(creativeTemplateApprovalBlocker({stress_tested_at: '2026-08-19T00:00:00.000Z', stress_test_passed: true}), null)
})

test('normaliza el resultado que guarda la auditoría', () => {
  assert.deepEqual(buildCreativeStressResult({ok: true, testedAt: '2026-08-19T00:00:00.000Z'}), {
    stress_tested_at: '2026-08-19T00:00:00.000Z', stress_test_passed: true, stress_test_error: null,
  })
  assert.equal(buildCreativeStressResult({ok: false, error: '  overflow  ', testedAt: 'now'}).stress_test_error, 'overflow')
})

test('la ruta, el panel y la base mantienen el mismo guardarraíl', () => {
  const route = fs.readFileSync(new URL('../app/api/admin/creative-templates/[id]/route.ts', import.meta.url), 'utf8')
  const page = fs.readFileSync(new URL('../app/admin/creative-lab/page.tsx', import.meta.url), 'utf8')
  const migration = fs.readFileSync(new URL('../supabase/migrations/025_creative_template_stress_gate.sql', import.meta.url), 'utf8')
  assert.match(route, /creativeTemplateApprovalBlocker/u)
  assert.match(page, /approvalEnabled=\{template\.stress_test_passed\}/u)
  assert.match(page, /Abrir PNG en tamaño completo/u)
  assert.match(migration, /status <> 'approved' or stress_test_passed is true/u)
})
