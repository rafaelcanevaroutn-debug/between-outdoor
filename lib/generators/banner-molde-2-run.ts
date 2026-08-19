import type { ClientOnboarding, Niche, Salida, VideoTypographyId } from '@/types'
import type { GenerateVideoFamilia5Params, GeneratedVideoFamilia5Result } from './video-familia-5.ts'
import type { GenerateBannerCtaSuaveParams, GenerateBannerCtaSuaveResult } from './banner-cta-suave.ts'
import { buildBannerMolde2, type BuildBannerMolde2Result } from './banner-molde-2.ts'

// Orquestador de Molde 2 — el más liviano de los 3, casi todo ya vivía en
// el compositor del PR #14. Solo agrega la generación real del CTA
// (generateBannerCtaSuave, inyectado) antes de llamar a buildBannerMolde2,
// que ya sabía componer ficha (generateVideoFamilia5, inyectado)/lugar/
// fecha — eso no cambió, se reusa tal cual.

export interface RunBannerMolde2Params {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
  canalesHabilitados: string[]
  publicationDate?: string
  lugarMaxCharacters: number
  fechaMaxCharacters: number
  ctaMaxCharacters: number
  /** En producción, pasar generateVideoFamilia5 tal cual. */
  generateFicha: (params: GenerateVideoFamilia5Params) => Promise<GeneratedVideoFamilia5Result>
  /** En producción, pasar generateBannerCtaSuave tal cual. */
  generateCta: (params: GenerateBannerCtaSuaveParams) => Promise<GenerateBannerCtaSuaveResult>
}

export type RunBannerMolde2Result = BuildBannerMolde2Result

export async function runBannerMolde2(p: RunBannerMolde2Params): Promise<RunBannerMolde2Result> {
  const ctaResult = await p.generateCta({
    clientName: p.clientName,
    clientOnboarding: p.clientOnboarding,
    maxCharacters: p.ctaMaxCharacters,
  })

  return buildBannerMolde2({
    salida: p.salida,
    niche: p.niche,
    clientName: p.clientName,
    clientOnboarding: p.clientOnboarding,
    vozSlug: p.vozSlug,
    clipDurationSeconds: p.clipDurationSeconds,
    tipografiasPermitidas: p.tipografiasPermitidas,
    carpeta: p.carpeta,
    canalesHabilitados: p.canalesHabilitados,
    publicationDate: p.publicationDate,
    cta: ctaResult.cta,
    lugarMaxCharacters: p.lugarMaxCharacters,
    fechaMaxCharacters: p.fechaMaxCharacters,
    ctaMaxCharacters: p.ctaMaxCharacters,
    generateFicha: p.generateFicha,
  })
}
