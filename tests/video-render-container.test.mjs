import test from 'node:test'
import assert from 'node:assert/strict'
import {
  adaptReflexiveContentToStillImageWithMusic,
  createReflexiveVideoContent,
  createStillImageWithMusicContainer,
  createVideoBackgroundContainer,
  isVideoRenderContainerKind,
} from '../lib/video-render-container.ts'

test('reconoce el eje cerrado de contenedores de render', () => {
  assert.equal(isVideoRenderContainerKind('video_background'), true)
  assert.equal(isVideoRenderContainerKind('still_image_with_music'), true)
  assert.equal(isVideoRenderContainerKind('otro'), false)
})

test('modela el video de fondo actual sin cambiar su contrato de render', () => {
  assert.deepEqual(createVideoBackgroundContainer(' Videos Chaltén ', 7), {
    kind: 'video_background',
    background: { type: 'video', reference: 'Videos Chaltén' },
    resultDurationSeconds: 7,
    music: { status: 'renderer_managed' },
    textAnimation: { status: 'renderer_managed' },
  })
})

test('modela imagen fija y deja explícitos los campos pendientes de Mati', () => {
  assert.deepEqual(createStillImageWithMusicContainer(' imagen-123.jpg '), {
    kind: 'still_image_with_music',
    background: { type: 'image', reference: 'imagen-123.jpg' },
    resultDurationSeconds: null,
    music: { status: 'pending_mati_contract' },
    textAnimation: { status: 'pending_mati_contract' },
  })
})

test('rechaza referencias vacías y duraciones inválidas', () => {
  assert.throws(() => createStillImageWithMusicContainer('  '), /referencia de imagen/u)
  assert.throws(() => createVideoBackgroundContainer('videos', 0), /duración positiva/u)
})

test('el adaptador still conserva el copy 3a y bloquea sin inventar contrato de Mati', () => {
  const content = createReflexiveVideoContent(
    '  La montaña no apura a nadie; igual termina mostrando el camino.  ',
    ' Montserrat ',
  )
  const container = createStillImageWithMusicContainer('foto-laguna.jpg')

  assert.deepEqual(adaptReflexiveContentToStillImageWithMusic(content, container), {
    ok: false,
    blockedBy: 'mati_contract_pending',
    error: 'El render still_image_with_music espera el contrato de Mati',
    missing: ['template_slug', 'renderer_payload_fields', 'result_duration_formula'],
    draft: {
      content: {
        contentKind: '3a/reflexivo',
        copy: 'La montaña no apura a nadie; igual termina mostrando el camino.',
        typographyId: 'Montserrat',
      },
      container,
      templateSlug: null,
      rendererPayloadFields: null,
    },
  })
})
