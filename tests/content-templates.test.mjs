import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import { resolveCarruselPreviewFormat } from '../lib/content-templates-generator-keys.ts'

test('resolveCarruselPreviewFormat mapea generator_key de carrusel a un formato conocido', () => {
  assert.equal(resolveCarruselPreviewFormat('carrusel_itinerario'), 'itinerario')
  assert.equal(resolveCarruselPreviewFormat('carrusel_lugar'), 'lugar')
  assert.equal(resolveCarruselPreviewFormat('carrusel_organico'), 'organico')
})

test('resolveCarruselPreviewFormat devuelve null para lo que no reconoce', () => {
  assert.equal(resolveCarruselPreviewFormat('video_familia_3_3a'), null)
  assert.equal(resolveCarruselPreviewFormat('banner_molde_3'), null)
  assert.equal(resolveCarruselPreviewFormat('carrusel_no_existe'), null)
  assert.equal(resolveCarruselPreviewFormat('carrusel_'), null)
})

test('la migración define RLS admin-only en las 6 tablas nuevas y un único main default por tipo', () => {
  const migration = fs.readFileSync(new URL('../supabase/migrations/038_content_templates_and_feedback.sql', import.meta.url), 'utf8')
  const tables = [
    'content_templates',
    'content_template_verticals',
    'content_template_families',
    'content_template_requirements',
    'content_template_overrides',
    'content_feedback',
  ]
  for (const table of tables) {
    assert.match(migration, new RegExp(`alter table ${table} enable row level security`, 'u'), `${table} debe tener RLS habilitado`)
    assert.match(
      migration,
      new RegExp(`create policy "admins manage[^"]*"\\s+on ${table} for all`, 'u'),
      `${table} debe tener la policy admin-only`,
    )
  }
  assert.match(migration, /create unique index content_templates_one_default_per_type\s+on content_templates \(type\) where is_main_default/u)
})

test('DELETE de content-templates solo permite borrar en estado borrador', () => {
  const route = fs.readFileSync(new URL('../app/api/admin/content-templates/[id]/route.ts', import.meta.url), 'utf8')
  assert.match(route, /template\.status !== 'borrador'/u)
})

test('preview de content-templates nunca persiste y solo soporta carrusel en esta fase', () => {
  const route = fs.readFileSync(new URL('../app/api/admin/content-templates/[id]/preview/route.ts', import.meta.url), 'utf8')
  assert.match(route, /persisted: false/u)
  assert.match(route, /resolveCarruselPreviewFormat/u)
  assert.doesNotMatch(route, /\.from\('contenido_generado'\)\.insert/u)
})

test('el POST de content-templates arranca siempre en borrador', () => {
  const route = fs.readFileSync(new URL('../app/api/admin/content-templates/route.ts', import.meta.url), 'utf8')
  assert.match(route, /status: 'borrador'/u)
})
