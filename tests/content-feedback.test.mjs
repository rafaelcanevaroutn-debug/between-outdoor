import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import { missingReferenceFieldForScope } from '../lib/content-feedback.ts'

test('cada scope exige su referencia correspondiente', () => {
  assert.equal(missingReferenceFieldForScope('pieza', {}), 'piece_id')
  assert.equal(missingReferenceFieldForScope('pieza', { piece_id: 'p1' }), null)
  assert.equal(missingReferenceFieldForScope('familia', {}), 'family_key')
  assert.equal(missingReferenceFieldForScope('familia', { family_key: 'video_familia_3' }), null)
  assert.equal(missingReferenceFieldForScope('motor', {}), 'generator_key')
  assert.equal(missingReferenceFieldForScope('motor', { generator_key: 'video_familia_3_3a' }), null)
  assert.equal(missingReferenceFieldForScope('run', {}), 'run_id')
  assert.equal(missingReferenceFieldForScope('run', { run_id: 'r1' }), null)
})

test('una referencia de otro scope no alcanza', () => {
  assert.equal(missingReferenceFieldForScope('pieza', { family_key: 'video_familia_3' }), 'piece_id')
})

test('la ruta y la migración usan el mismo guardarraíl de scope→referencia', () => {
  const route = fs.readFileSync(new URL('../app/api/admin/feedback/route.ts', import.meta.url), 'utf8')
  const migration = fs.readFileSync(new URL('../supabase/migrations/038_content_templates_and_feedback.sql', import.meta.url), 'utf8')
  assert.match(route, /missingReferenceFieldForScope/u)
  assert.match(migration, /scope = 'pieza' and piece_id is not null/u)
  assert.match(migration, /scope = 'familia' and family_key is not null/u)
  assert.match(migration, /scope = 'motor' and generator_key is not null/u)
  assert.match(migration, /scope = 'run' and run_id is not null/u)
})

test('las rutas de content-templates y feedback exigen admin', () => {
  const routes = [
    '../app/api/admin/content-templates/route.ts',
    '../app/api/admin/content-templates/[id]/route.ts',
    '../app/api/admin/content-templates/[id]/preview/route.ts',
    '../app/api/admin/content-templates/[id]/overrides/route.ts',
    '../app/api/admin/feedback/route.ts',
    '../app/api/admin/feedback/[id]/route.ts',
    '../app/api/admin/feedback/export/route.ts',
  ]
  for (const path of routes) {
    const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /requireAdmin\(\)/u, `${path} debe llamar requireAdmin()`)
  }
})
