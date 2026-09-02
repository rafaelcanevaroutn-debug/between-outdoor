import test from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveVideoGenerationDispatch,
  shouldDeleteExistingContent,
  shouldDispatchVideoToMati,
} from '../lib/video-generation-dispatch.ts'
import fs from 'node:fs'
import path from 'node:path'

const route = fs.readFileSync(path.join(process.cwd(), 'app/api/generate/route.ts'), 'utf8')

test('video sin motor conserva el flujo legacy por defecto', () => {
  assert.deepEqual(
    resolveVideoGenerationDispatch({ formato: 'video' }),
    { ok: true, mode: { kind: 'legacy' } },
  )
})

test('motor familias exige una subfamilia registrada', () => {
  for (const videoSubfamilia of ['2a', '2b', '2c', '3a', '3b', '3c', '3d', '3e', '4', '5']) {
    assert.deepEqual(
      resolveVideoGenerationDispatch({
        formato: 'video',
        videoMotor: 'familias',
        videoSubfamilia,
      }),
      { ok: true, mode: { kind: 'familias', subfamilia: videoSubfamilia } },
    )
  }
  assert.equal(
    resolveVideoGenerationDispatch({
      formato: 'video',
      videoMotor: 'familias',
      videoSubfamilia: 'desconocida',
    }).ok,
    false,
  )
})

test('rechaza combinaciones ambiguas sin afectar requests no-video', () => {
  assert.equal(
    resolveVideoGenerationDispatch({
      formato: 'video',
      videoMotor: 'legacy',
      videoSubfamilia: '3a',
    }).ok,
    false,
  )
  assert.equal(
    resolveVideoGenerationDispatch({
      formato: 'carrusel',
      videoMotor: 'familias',
      videoSubfamilia: '3a',
    }).ok,
    false,
  )
  assert.deepEqual(
    resolveVideoGenerationDispatch({ formato: 'carrusel' }),
    { ok: true, mode: { kind: 'not-video' } },
  )
})

test('familias es append-only y nunca despacha video a Mati', () => {
  const familiesMode = { kind: 'familias', subfamilia: '3a' }
  assert.equal(shouldDeleteExistingContent(false, familiesMode), false)
  assert.equal(shouldDispatchVideoToMati(familiesMode), false)
  assert.equal(shouldDeleteExistingContent(false, { kind: 'legacy' }), true)
  assert.equal(shouldDispatchVideoToMati({ kind: 'legacy' }), true)
  assert.equal(shouldDeleteExistingContent(true, { kind: 'not-video' }), false)
})

test('el Route Handler usa el dispatcher para generación, borrado y Mati', () => {
  assert.match(route, /resolveVideoGenerationDispatch\(\{ formato, videoMotor, videoSubfamilia \}\)/u)
  assert.match(route, /videoMode\.kind === 'familias'/u)
  assert.match(route, /generateVideoFamilia2/u)
  assert.match(route, /generateVideoFamilia3/u)
  assert.match(route, /generateVideoFamilia4/u)
  assert.match(route, /generateVideoFamilia5/u)
  assert.match(route, /videoMode\.subfamilia === '2c'/u)
  assert.match(route, /shouldDeleteExistingContent\(isPromo, videoMode\)/u)
  assert.match(route, /shouldDispatchVideoToMati\(videoMode\)/u)
  assert.match(route, /render deshabilitado hasta definir contrato/u)
})

test('el Route Handler acepta el eje de contenedor solo para 3a y exige imagen en still', () => {
  assert.match(route, /isVideoRenderContainerKind\(videoContainer\)/u)
  assert.match(route, /still_image_with_music solo admite videoSubfamilia 3a/u)
  assert.match(route, /imageReference es requerido para still_image_with_music/u)
  assert.match(route, /videoRenderContainer:/u)
  assert.match(route, /stillImageReference:/u)
})

test('la UI conecta el motor familias explícitamente', () => {
  const ui = fs.readFileSync(path.join(process.cwd(), 'components/salidas/GenerateButton.tsx'), 'utf8')
  assert.match(ui, /videoMotor:\s*'familias'/u)
  assert.match(ui, /videoSubfamilia:\s*subfamilia/u)
  assert.match(ui, /tipografiasPermitidas/u)
  assert.match(ui, /assignDistinctTypographiesFromPools/u)
  assert.match(ui, /curatedVideoTypographyPool/u)
})
