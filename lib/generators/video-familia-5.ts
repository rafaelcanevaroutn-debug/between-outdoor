import type {
  ClientOnboarding,
  Niche,
  Salida,
  VideoTypographyId,
} from '@/types'

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

export async function generateVideoFamilia5(
  _p: GenerateVideoFamilia5Params,
): Promise<never> {
  throw new Error('Familia 5 todavía no genera copy')
}
