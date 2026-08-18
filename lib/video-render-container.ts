export const VIDEO_RENDER_CONTAINER_KINDS = [
  'video_background',
  'still_image_with_music',
] as const

export type VideoRenderContainerKind = typeof VIDEO_RENDER_CONTAINER_KINDS[number]

export interface ReflexiveVideoContentContract {
  contentKind: '3a/reflexivo'
  copy: string
  typographyId: string
}

interface RendererManagedBehavior {
  status: 'renderer_managed'
}

export interface PendingMatiContract {
  status: 'pending_mati_contract'
}

export interface VideoBackgroundRenderContainer {
  kind: 'video_background'
  background: {
    type: 'video'
    reference: string
  }
  resultDurationSeconds: number
  music: RendererManagedBehavior
  textAnimation: RendererManagedBehavior
}

export interface StillImageWithMusicRenderContainer {
  kind: 'still_image_with_music'
  background: {
    type: 'image'
    reference: string
  }
  resultDurationSeconds: null
  music: PendingMatiContract
  textAnimation: PendingMatiContract
}

export type VideoRenderContainerContract =
  | VideoBackgroundRenderContainer
  | StillImageWithMusicRenderContainer

export interface StillImageWithMusicRenderDraft {
  content: ReflexiveVideoContentContract
  container: StillImageWithMusicRenderContainer
  templateSlug: null
  rendererPayloadFields: null
}

export interface PendingStillImageWithMusicRender {
  ok: false
  blockedBy: 'mati_contract_pending'
  error: string
  missing: readonly [
    'template_slug',
    'renderer_payload_fields',
    'result_duration_formula',
  ]
  draft: StillImageWithMusicRenderDraft
}

export function isVideoRenderContainerKind(value: unknown): value is VideoRenderContainerKind {
  return typeof value === 'string'
    && VIDEO_RENDER_CONTAINER_KINDS.includes(value as VideoRenderContainerKind)
}

export function createVideoBackgroundContainer(
  reference: string,
  resultDurationSeconds: number,
): VideoBackgroundRenderContainer {
  const normalizedReference = reference.trim()
  if (!normalizedReference) throw new Error('El contenedor video_background requiere una referencia de video')
  if (!Number.isFinite(resultDurationSeconds) || resultDurationSeconds <= 0) {
    throw new Error('El contenedor video_background requiere una duración positiva')
  }

  return {
    kind: 'video_background',
    background: { type: 'video', reference: normalizedReference },
    resultDurationSeconds,
    music: { status: 'renderer_managed' },
    textAnimation: { status: 'renderer_managed' },
  }
}

export function createStillImageWithMusicContainer(
  imageReference: string,
): StillImageWithMusicRenderContainer {
  const normalizedReference = imageReference.trim()
  if (!normalizedReference) {
    throw new Error('El contenedor still_image_with_music requiere una referencia de imagen')
  }

  return {
    kind: 'still_image_with_music',
    background: { type: 'image', reference: normalizedReference },
    // PENDIENTE: contrato de Mati para duración, música y animación de texto.
    resultDurationSeconds: null,
    music: { status: 'pending_mati_contract' },
    textAnimation: { status: 'pending_mati_contract' },
  }
}

export function createReflexiveVideoContent(
  copy: string,
  typographyId: string,
): ReflexiveVideoContentContract {
  const normalizedCopy = copy.trim()
  const normalizedTypographyId = typographyId.trim()
  if (!normalizedCopy) throw new Error('El contenido reflexivo requiere copy')
  if (!normalizedTypographyId) throw new Error('El contenido reflexivo requiere tipografía')

  return {
    contentKind: '3a/reflexivo',
    copy: normalizedCopy,
    typographyId: normalizedTypographyId,
  }
}

export function adaptReflexiveContentToStillImageWithMusic(
  content: ReflexiveVideoContentContract,
  container: StillImageWithMusicRenderContainer,
): PendingStillImageWithMusicRender {
  return {
    ok: false,
    blockedBy: 'mati_contract_pending',
    error: 'El render still_image_with_music espera el contrato de Mati',
    missing: [
      'template_slug',
      'renderer_payload_fields',
      'result_duration_formula',
    ],
    draft: {
      content,
      container,
      // PENDIENTE: slug y campos del payload del template de Mati.
      templateSlug: null,
      rendererPayloadFields: null,
    },
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function readPersistedRenderContainer(
  value: unknown,
): VideoRenderContainerContract | null {
  const container = objectValue(value)
  const background = objectValue(container?.background)
  const reference = typeof background?.reference === 'string' ? background.reference.trim() : ''
  if (!container || !background || !reference) return null

  if (container.kind === 'still_image_with_music' && background.type === 'image') {
    return createStillImageWithMusicContainer(reference)
  }

  if (
    container.kind === 'video_background'
    && background.type === 'video'
    && typeof container.resultDurationSeconds === 'number'
  ) {
    return createVideoBackgroundContainer(reference, container.resultDurationSeconds)
  }

  return null
}

export function pendingMatiContainerContractError(
  generationMetadata: unknown,
): string | null {
  const metadata = objectValue(generationMetadata)
  const rawContainer = objectValue(metadata?.render_container)
  if (rawContainer?.kind !== 'still_image_with_music') return null

  const container = readPersistedRenderContainer(rawContainer)
  if (!container || container.kind !== 'still_image_with_music') {
    return 'El contrato persistido de still_image_with_music es inválido'
  }

  return 'still_image_with_music no puede aprobarse todavía: falta el contrato de Mati (slug, campos y fórmula de duración)'
}
