import type {
  ClientOnboarding,
  Niche,
  Salida,
  VideoTypographyId,
} from '@/types'
import {
  extractVideoFamily5SourceCandidates,
  type VideoFamily5SourceCandidate,
} from '@/lib/generators/video-family-5-contract'

export interface GenerateVideoFamilia5Params {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
}

export function resolveVideoFamilia5SourceData(
  salida: Salida,
): VideoFamily5SourceCandidate[] {
  return extractVideoFamily5SourceCandidates(salida)
}

export async function generateVideoFamilia5(
  _p: GenerateVideoFamilia5Params,
): Promise<never> {
  throw new Error('Familia 5 todavía no genera copy')
}
