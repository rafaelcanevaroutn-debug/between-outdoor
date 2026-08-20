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

test('modela imagen fija con el contrato final de música y duración', () => {
  assert.deepEqual(createStillImageWithMusicContainer(' imagen-123.jpg ', 'epico'), {
    kind: 'still_image_with_music',
    background: { type: 'image', reference: 'imagen-123.jpg' },
    resultDurationSeconds: 10,
    durationFormula: 'music_only_fixed_10s',
    music: { status: 'selected_by_tone', tone: 'epico', source: 'drive_music_bank' },
    textAnimation: { kind: 'kinetic_center', entrance: 'word_stagger', exit: 'fade' },
  })
})

test('rechaza referencias vacías y duraciones inválidas', () => {
  assert.throws(() => createStillImageWithMusicContainer('  ', 'reflexivo'), /referencia de imagen/u)
  assert.throws(() => createStillImageWithMusicContainer('foto.jpg', 'otro'), /tono musical inválido/u)
  assert.throws(() => createVideoBackgroundContainer('videos', 0), /duración positiva/u)
})

test('el adaptador still entrega slug y payload final sin reinterpretar el copy', () => {
  const content = createReflexiveVideoContent(
    '  La montaña no apura a nadie; igual termina mostrando el camino.  ',
    ' Montserrat ',
  )
  const container = createStillImageWithMusicContainer('foto-laguna.jpg', 'reflexivo')

  assert.deepEqual(adaptReflexiveContentToStillImageWithMusic(content, container), {
    ok: true,
    templateSlug: 'TemplateStillImageMusic',
    rendererPayloadFields: {
      plantilla: 'TemplateStillImageMusic',
      titulo: 'La montaña no apura a nadie; igual termina mostrando el camino.',
      imagen_estatica: 'foto-laguna.jpg',
      tono_musical: 'reflexivo',
      duracion_segundos: 10,
      animacion_texto: 'kinetic_center',
      fuente_titulo: 'Montserrat',
    },
  })
})
