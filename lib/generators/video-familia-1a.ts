import type {
  ClientOnboarding,
  GeneratedVideoFamilia1a,
  Niche,
  Salida,
  VideoTypographyId,
} from '@/types'

export interface GenerateVideoFamilia1aParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
}

export async function generateVideoFamilia1a(
  _p: GenerateVideoFamilia1aParams,
): Promise<GeneratedVideoFamilia1a> {
  throw new Error('Familia 1a todavía no genera discurso')
}
