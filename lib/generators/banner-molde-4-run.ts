import type {Salida, VideoTypographyId} from '@/types'
import type {Banner4ContentContract} from './banner-content.ts'
import {generateBannerMolde4Copy} from './banner-molde-4-copy.ts'

export type BannerMolde4RunResult =
  | {ok: true; content: Banner4ContentContract}
  | {ok: false; error: string}

export function runBannerMolde4(params: {
  salidas: Salida[]
  titulo?: string
  cta?: string
  typographyId: VideoTypographyId
}): BannerMolde4RunResult {
  try {
    return {ok: true, content: generateBannerMolde4Copy(params)}
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : 'No se pudo componer Molde 4'}
  }
}
