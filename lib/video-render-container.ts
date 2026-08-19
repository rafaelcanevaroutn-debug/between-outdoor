export const VIDEO_RENDER_CONTAINER_KINDS = ['video_background', 'still_image_with_music'] as const
export const VIDEO_MUSIC_TONES = ['reflexivo', 'comico', 'epico'] as const
export const STILL_IMAGE_MUSIC_DURATION_SECONDS = 10
export const STILL_IMAGE_MUSIC_TEMPLATE_SLUG = 'TemplateStillImageMusic' as const

export type VideoRenderContainerKind = typeof VIDEO_RENDER_CONTAINER_KINDS[number]
export type VideoMusicTone = typeof VIDEO_MUSIC_TONES[number]

export interface ReflexiveVideoContentContract {
  contentKind: '3a/reflexivo'
  copy: string
  typographyId: string
}

export interface VideoBackgroundRenderContainer {
  kind: 'video_background'
  background: {type: 'video'; reference: string}
  resultDurationSeconds: number
  music: {status: 'renderer_managed'}
  textAnimation: {status: 'renderer_managed'}
}

export interface StillImageWithMusicRenderContainer {
  kind: 'still_image_with_music'
  background: {type: 'image'; reference: string}
  resultDurationSeconds: 10
  durationFormula: 'music_only_fixed_10s'
  music: {status: 'selected_by_tone'; tone: VideoMusicTone; source: 'drive_music_bank'}
  textAnimation: {kind: 'kinetic_center'; entrance: 'word_stagger'; exit: 'fade'}
}

export type VideoRenderContainerContract = VideoBackgroundRenderContainer | StillImageWithMusicRenderContainer

export interface ReadyStillImageWithMusicRender {
  ok: true
  templateSlug: typeof STILL_IMAGE_MUSIC_TEMPLATE_SLUG
  rendererPayloadFields: {
    plantilla: typeof STILL_IMAGE_MUSIC_TEMPLATE_SLUG
    titulo: string
    imagen_estatica: string
    tono_musical: VideoMusicTone
    duracion_segundos: 10
    animacion_texto: 'kinetic_center'
    fuente_titulo: string
  }
}

export function isVideoRenderContainerKind(value: unknown): value is VideoRenderContainerKind {
  return typeof value === 'string' && VIDEO_RENDER_CONTAINER_KINDS.includes(value as VideoRenderContainerKind)
}

export function isVideoMusicTone(value: unknown): value is VideoMusicTone {
  return typeof value === 'string' && VIDEO_MUSIC_TONES.includes(value as VideoMusicTone)
}

export function createVideoBackgroundContainer(reference: string, resultDurationSeconds: number): VideoBackgroundRenderContainer {
  const normalizedReference = reference.trim()
  if (!normalizedReference) throw new Error('El contenedor video_background requiere una referencia de video')
  if (!Number.isFinite(resultDurationSeconds) || resultDurationSeconds <= 0) throw new Error('El contenedor video_background requiere una duración positiva')
  return {kind: 'video_background', background: {type: 'video', reference: normalizedReference}, resultDurationSeconds, music: {status: 'renderer_managed'}, textAnimation: {status: 'renderer_managed'}}
}

export function createStillImageWithMusicContainer(imageReference: string, tone: VideoMusicTone): StillImageWithMusicRenderContainer {
  const reference = imageReference.trim()
  if (!reference) throw new Error('El contenedor still_image_with_music requiere una referencia de imagen')
  if (!isVideoMusicTone(tone)) throw new Error('tono musical inválido: use reflexivo, comico o epico')
  return {
    kind: 'still_image_with_music', background: {type: 'image', reference},
    resultDurationSeconds: STILL_IMAGE_MUSIC_DURATION_SECONDS, durationFormula: 'music_only_fixed_10s',
    music: {status: 'selected_by_tone', tone, source: 'drive_music_bank'},
    textAnimation: {kind: 'kinetic_center', entrance: 'word_stagger', exit: 'fade'},
  }
}

export function createReflexiveVideoContent(copy: string, typographyId: string): ReflexiveVideoContentContract {
  const normalizedCopy = copy.trim()
  const normalizedTypographyId = typographyId.trim()
  if (!normalizedCopy) throw new Error('El contenido reflexivo requiere copy')
  if (!normalizedTypographyId) throw new Error('El contenido reflexivo requiere tipografía')
  return {contentKind: '3a/reflexivo', copy: normalizedCopy, typographyId: normalizedTypographyId}
}

export function adaptReflexiveContentToStillImageWithMusic(content: ReflexiveVideoContentContract, container: StillImageWithMusicRenderContainer): ReadyStillImageWithMusicRender {
  return {ok: true, templateSlug: STILL_IMAGE_MUSIC_TEMPLATE_SLUG, rendererPayloadFields: {
    plantilla: STILL_IMAGE_MUSIC_TEMPLATE_SLUG, titulo: content.copy,
    imagen_estatica: container.background.reference, tono_musical: container.music.tone,
    duracion_segundos: container.resultDurationSeconds, animacion_texto: 'kinetic_center',
    fuente_titulo: content.typographyId,
  }}
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function readPersistedRenderContainer(value: unknown): VideoRenderContainerContract | null {
  const container = objectValue(value)
  const background = objectValue(container?.background)
  const reference = typeof background?.reference === 'string' ? background.reference.trim() : ''
  if (!container || !background || !reference) return null
  if (container.kind === 'still_image_with_music' && background.type === 'image') {
    const music = objectValue(container.music)
    return isVideoMusicTone(music?.tone) ? createStillImageWithMusicContainer(reference, music.tone) : null
  }
  if (container.kind === 'video_background' && background.type === 'video' && typeof container.resultDurationSeconds === 'number') return createVideoBackgroundContainer(reference, container.resultDurationSeconds)
  return null
}

/** Gate conservado para la ruta de aprobación: ahora valida, ya no bloquea un contrato cerrado. */
export function pendingMatiContainerContractError(generationMetadata: unknown): string | null {
  const metadata = objectValue(generationMetadata)
  const raw = objectValue(metadata?.render_container)
  if (raw?.kind !== 'still_image_with_music') return null
  return readPersistedRenderContainer(raw) ? null : 'El contrato persistido de still_image_with_music es inválido o no tiene tono musical permitido'
}
