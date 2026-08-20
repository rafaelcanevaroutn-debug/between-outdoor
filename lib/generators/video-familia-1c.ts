import type {
  GeneratedVideoFamilia1c,
  VideoTypographyId,
} from '@/types'
import {
  uniqueVideoTypographyIds,
} from '@/lib/generators/video-generation-shared'

export interface GenerateVideoFamilia1cParams {
  subfamilia: '1c'
  tipografiasPermitidas: VideoTypographyId[]
  clipDurationSeconds?: number
}

export async function generateVideoFamilia1c(
  p: GenerateVideoFamilia1cParams,
): Promise<GeneratedVideoFamilia1c> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) {
    throw new Error('Familia 1c requiere al menos una tipografía habilitada')
  }

  // Familia 1c no genera texto con IA, solo devuelve el objeto con campos vacíos
  return {
    formato: 'video',
    subfamilia: '1c',
    titulo: '',
    subtitulo: '',
    bullets: [],
    cta: '',
    tipografia_id: typographyIds[0],
    duracion_estimada_segundos: 15,
    metadata: {
      clipDurationSeconds: p.clipDurationSeconds ?? 15,
    },
  }
}
