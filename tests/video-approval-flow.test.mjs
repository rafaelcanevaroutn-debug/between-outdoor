import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const route = fs.readFileSync(
  path.join(process.cwd(), 'app/api/generate/video/[id]/aprobar/route.ts'),
  'utf8',
)
const ui = fs.readFileSync(
  path.join(process.cwd(), 'components/contenido/ContenidoTable.tsx'),
  'utf8',
)
const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/020_video_render_approval.sql'),
  'utf8',
)
const renameMigration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/021_generalize_render_approval.sql'),
  'utf8',
)

test('el endpoint autentica, valida ownership y reconstruye el contrato aprobado', () => {
  assert.match(route, /auth\.getUser\(\)/u)
  assert.match(route, /callerProfile\?\.role !== 'admin'/u)
  assert.match(route, /row\.user_id !== user\.id/u)
  assert.match(route, /rebuildApprovedVideoContract\(row\)/u)
})

test('la aprobación reclama la pieza de forma idempotente y dispara el dispatcher nuevo', () => {
  assert.match(route, /approved_pending_contract/u)
  assert.match(route, /render_status/u)
  assert.match(route, /render_status: 'dispatching'/u)
  assert.match(route, /after\(\(\) => dispatchFamiliesVideoRender/u)
  assert.match(route, /dispatched: true/u)
  assert.doesNotMatch(route, /dispatchVideoRenders/iu)
})

test('la aprobación bloquea still_image_with_music antes de marcar dispatching', () => {
  const gateIndex = route.indexOf('pendingMatiContainerContractError(row.generation_metadata)')
  const dispatchingIndex = route.indexOf("render_status: 'dispatching'")
  assert.ok(gateIndex >= 0)
  assert.ok(dispatchingIndex > gateIndex)
  assert.match(route, /status: 409/u)
})

test('la aprobación actualiza el contrato neutral con el copy 3a editado', () => {
  assert.match(route, /render_content_contract: createReflexiveVideoContent/u)
  assert.match(route, /rebuilt\.contract\.copy/u)
})

test('la migración original agrega estados auditables y backfill de piezas existentes', () => {
  assert.match(migration, /video_render_status text/u)
  assert.match(migration, /video_approved_at timestamptz/u)
  assert.match(migration, /video_approved_by uuid/u)
  for (const status of ['pending_review', 'approved_pending_contract', 'dispatching', 'rendering', 'rendered', 'failed']) {
    assert.match(migration, new RegExp(status))
  }
  assert.match(migration, /generation_metadata->>'video_motor' = 'familias'/u)
})

test('la migración de generalización renombra las columnas para que las use también carrusel', () => {
  assert.match(renameMigration, /RENAME COLUMN video_render_status TO render_status/u)
  assert.match(renameMigration, /RENAME COLUMN video_approved_at TO approved_at/u)
  assert.match(renameMigration, /RENAME COLUMN video_approved_by TO approved_by/u)
  assert.match(renameMigration, /RENAME CONSTRAINT contenido_video_render_status_check TO contenido_render_status_check/u)
  assert.match(renameMigration, /RENAME TO contenido_render_status_idx/u)
})

test('VideoCard ofrece aprobación solo a familias y muestra estados honestos', () => {
  assert.match(ui, /Aprobar para render/u)
  assert.match(ui, /Aprobado · pendiente de envío/u)
  assert.match(ui, /Enviar a render/u)
  assert.match(ui, /generation_metadata\?\.video_motor === 'familias'/u)
  assert.match(ui, /\/api\/generate\/video\/\$\{item\.id\}\/aprobar/u)
})
