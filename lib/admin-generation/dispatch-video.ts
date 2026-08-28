import type { generateVideoFamilia1a } from '@/lib/generators/video-familia-1a'
import type { generateVideoFamilia1b } from '@/lib/generators/video-familia-1b'
import type { generateVideoFamilia1c } from '@/lib/generators/video-familia-1c'
import type { generateVideoFamilia2 } from '@/lib/generators/video-familia-2'
import type { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import type { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import type { generateVideoFamilia5 } from '@/lib/generators/video-familia-5'
import type {
  ClientOnboarding, Niche, Salida,
  VideoFamilia3Subfamilia, VideoKnowledgeFormat, VideoTypographyId,
} from '@/types'

export interface VideoDispatchCommonParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  tipografiasPermitidas: VideoTypographyId[]
  clipDurationSeconds?: number
}

export interface VideoDispatchGenerators {
  generateVideoFamilia1a: typeof generateVideoFamilia1a
  generateVideoFamilia1b: typeof generateVideoFamilia1b
  generateVideoFamilia1c: typeof generateVideoFamilia1c
  generateVideoFamilia2: typeof generateVideoFamilia2
  generateVideoFamilia3: typeof generateVideoFamilia3
  generateVideoFamilia4: typeof generateVideoFamilia4
  generateVideoFamilia5: typeof generateVideoFamilia5
}

// Ruteo puro subfamilia → generador, extraído de app/api/admin/generate/
// video/route.ts para poder probarlo con generadores inyectados (fakes),
// sin depender de la resolución de imports @/ en tiempo de ejecución que
// rompe `node --test`.
export async function dispatchAdminVideoGeneration(
  subfamilia: VideoKnowledgeFormat,
  common: VideoDispatchCommonParams,
  extra: { publicationDate?: string; canalesHabilitados: string[] },
  generators: VideoDispatchGenerators,
): Promise<{ piece: unknown; stubUnknownOrigin: boolean }> {
  if (subfamilia === '1a') {
    return { piece: await generators.generateVideoFamilia1a(common), stubUnknownOrigin: false }
  }
  if (subfamilia === '1b') {
    return { piece: await generators.generateVideoFamilia1b({ ...common, subfamilia: '1b' }), stubUnknownOrigin: false }
  }
  if (subfamilia === '1c') {
    // Stub deliberado (nunca llama Gemini) agregado en b19d18f sin
    // explicación — ver el plan de esta feature para la hipótesis de origen.
    return { piece: await generators.generateVideoFamilia1c({ ...common, subfamilia: '1c' }), stubUnknownOrigin: true }
  }
  if (subfamilia === '2a') {
    return { piece: await generators.generateVideoFamilia2({ ...common, subfamilia: '2a' }), stubUnknownOrigin: false }
  }
  if (subfamilia === '2b') {
    return { piece: await generators.generateVideoFamilia2({ ...common, subfamilia: '2b' }), stubUnknownOrigin: false }
  }
  if (subfamilia === '2c') {
    return { piece: await generators.generateVideoFamilia2({ ...common, subfamilia: '2c' }), stubUnknownOrigin: false }
  }
  if (subfamilia === '4') {
    return {
      piece: await generators.generateVideoFamilia4({ ...common, publicationDate: extra.publicationDate, canalesHabilitados: extra.canalesHabilitados }),
      stubUnknownOrigin: false,
    }
  }
  if (subfamilia === '5') {
    return {
      piece: await generators.generateVideoFamilia5({ ...common, publicationDate: extra.publicationDate, canalesHabilitados: extra.canalesHabilitados }),
      stubUnknownOrigin: false,
    }
  }
  return {
    piece: await generators.generateVideoFamilia3({ ...common, subfamilia: subfamilia as VideoFamilia3Subfamilia }),
    stubUnknownOrigin: false,
  }
}
