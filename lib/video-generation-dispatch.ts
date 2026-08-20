import type { VideoKnowledgeFormat } from '@/types'

export type VideoMotor = 'legacy' | 'familias'

export type VideoGenerationMode =
  | { kind: 'not-video' }
  | { kind: 'legacy' }
  | { kind: 'familias'; subfamilia: VideoKnowledgeFormat }

export type VideoDispatchResolution =
  | { ok: true; mode: VideoGenerationMode }
  | { ok: false; error: string }

export const VIDEO_SUBFAMILIES = new Set<VideoKnowledgeFormat>([
  '1a', '1b', '1c', '2a', '2b', '2c', '3a', '3b', '3c', '3d', '3e', '4', '5',
])

export function resolveVideoGenerationDispatch({
  formato,
  videoMotor,
  videoSubfamilia,
}: {
  formato?: unknown
  videoMotor?: unknown
  videoSubfamilia?: unknown
}): VideoDispatchResolution {
  if (formato !== 'video') {
    if (videoMotor !== undefined || videoSubfamilia !== undefined) {
      return { ok: false, error: 'videoMotor y videoSubfamilia sólo son válidos cuando formato es video' }
    }
    return { ok: true, mode: { kind: 'not-video' } }
  }

  const motor = videoMotor ?? 'legacy'
  if (motor !== 'legacy' && motor !== 'familias') {
    return { ok: false, error: 'videoMotor debe ser legacy o familias' }
  }
  if (motor === 'legacy') {
    if (videoSubfamilia !== undefined) {
      return { ok: false, error: 'videoSubfamilia requiere videoMotor familias' }
    }
    return { ok: true, mode: { kind: 'legacy' } }
  }
  if (typeof videoSubfamilia !== 'string' || !VIDEO_SUBFAMILIES.has(videoSubfamilia as VideoKnowledgeFormat)) {
    return { ok: false, error: 'videoSubfamilia inválida para el motor familias' }
  }
  return {
    ok: true,
    mode: { kind: 'familias', subfamilia: videoSubfamilia as VideoKnowledgeFormat },
  }
}

export function shouldDeleteExistingContent(
  isPromo: boolean,
  mode: VideoGenerationMode,
): boolean {
  return !isPromo && mode.kind !== 'familias'
}

export function shouldDispatchVideoToMati(mode: VideoGenerationMode): boolean {
  return mode.kind !== 'familias'
}
