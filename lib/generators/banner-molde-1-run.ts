import type { ClientOnboarding, Niche, Salida, VideoTypographyId } from '@/types'
import type { GenerateBannerMolde1CopyParams, GenerateBannerMolde1CopyResult } from './banner-molde-1-copy.ts'
import type { GenerateBannerMolde1ItemsParams, GenerateBannerMolde1ItemsResult } from './banner-molde-1-items.ts'
import { buildBannerMolde1, type BuildBannerMolde1Result } from './banner-molde-1.ts'

// Orquestador de Molde 1 — engancha generateBannerMolde1Copy (real,
// inyectado) para convocatoria + identidad sin dato_duro, y
// generateBannerMolde1Items (real, inyectado)
// para los 2-3 ítems, y llama al compositor del PR #14 (banner-molde-1.ts)
// tal cual, sin tocarlo.
//
// No llama generateVideoFamilia4: esa función exige dato_duro aunque Molde 1
// no lo muestra. El generador específico reutiliza la guía y disciplina de
// Familia 4 sin heredar esa precondición comercial.
//
// Ambas llamadas son independientes entre sí — corren en paralelo.
//
// Tipos importados de video-familia-4.ts y banner-molde-1-items.ts (ambos
// con imports @/ reales) son solo `import type`, se borran en runtime. Los
// generadores en sí son parámetros obligatorios, no se importan acá — ver
// la misma nota en banner-molde-2.ts del PR #14.

export interface RunBannerMolde1Params {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  tipografiasPermitidas: VideoTypographyId[]
  canalesHabilitados: string[]
  publicationDate?: string
  copyMaxCharacters: number
  lugarMaxCharacters: number
  fechaMaxCharacters: number
  itemMaxCharacters: number
  /** En producción, pasar generateBannerMolde1Copy tal cual. */
  generateCopy: (params: GenerateBannerMolde1CopyParams) => Promise<GenerateBannerMolde1CopyResult>
  /** En producción, pasar generateBannerMolde1Items tal cual. */
  generateItems: (params: GenerateBannerMolde1ItemsParams) => Promise<GenerateBannerMolde1ItemsResult>
}

export type RunBannerMolde1Result = BuildBannerMolde1Result

export async function runBannerMolde1(p: RunBannerMolde1Params): Promise<RunBannerMolde1Result> {
  const [copyResult, itemsResult] = await Promise.all([
    p.generateCopy({
      salida: p.salida,
      niche: p.niche,
      clientName: p.clientName,
      clientOnboarding: p.clientOnboarding,
      vozSlug: p.vozSlug,
      canalesHabilitados: p.canalesHabilitados,
      tipografiasPermitidas: p.tipografiasPermitidas,
      copyMaxCharacters: p.copyMaxCharacters,
    }),
    p.generateItems({
      salida: p.salida,
      niche: p.niche,
      clientName: p.clientName,
      clientOnboarding: p.clientOnboarding,
      vozSlug: p.vozSlug,
      itemMaxCharacters: p.itemMaxCharacters,
    }),
  ])

  return buildBannerMolde1({
    salida: p.salida,
    publicationDate: p.publicationDate,
    typographyId: copyResult.typographyId,
    copy: copyResult.copy,
    items: itemsResult.items,
    copyMaxCharacters: p.copyMaxCharacters,
    lugarMaxCharacters: p.lugarMaxCharacters,
    fechaMaxCharacters: p.fechaMaxCharacters,
    itemMaxCharacters: p.itemMaxCharacters,
  })
}
