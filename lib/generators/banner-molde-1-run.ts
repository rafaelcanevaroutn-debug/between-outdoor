import type { ClientOnboarding, GeneratedVideoFamilia4, Niche, Salida, VideoTypographyId } from '@/types'
import type { GenerateVideoFamilia4Params } from './video-familia-4.ts'
import type { GenerateBannerMolde1ItemsParams, GenerateBannerMolde1ItemsResult } from './banner-molde-1-items.ts'
import { buildBannerMolde1, type BuildBannerMolde1Result } from './banner-molde-1.ts'

// Orquestador de Molde 1 — engancha generateVideoFamilia4 (real, inyectado)
// para convocatoria + identidad, generateBannerMolde1Items (real, inyectado)
// para los 2-3 ítems, y llama al compositor del PR #14 (banner-molde-1.ts)
// tal cual, sin tocarlo.
//
// OJO, efecto secundario real de reusar generateVideoFamilia4 completo:
// esa función SIEMPRE exige y produce dato_duro (precio/fecha/cupos
// verificados) — lo tira, pero la salida tiene que tener ese dato
// disponible o generateVideoFamilia4 tira error igual, aunque Molde 1
// nunca lo muestre. Es una restricción heredada de reusar la función
// entera, no algo que este archivo decida.
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
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
  canalesHabilitados: string[]
  publicationDate?: string
  copyMaxCharacters: number
  lugarMaxCharacters: number
  fechaMaxCharacters: number
  itemMaxCharacters: number
  /** En producción, pasar generateVideoFamilia4 tal cual. */
  generateConvocatoria: (params: GenerateVideoFamilia4Params) => Promise<GeneratedVideoFamilia4>
  /** En producción, pasar generateBannerMolde1Items tal cual. */
  generateItems: (params: GenerateBannerMolde1ItemsParams) => Promise<GenerateBannerMolde1ItemsResult>
}

export type RunBannerMolde1Result = BuildBannerMolde1Result

export async function runBannerMolde1(p: RunBannerMolde1Params): Promise<RunBannerMolde1Result> {
  const [convocatoria, itemsResult] = await Promise.all([
    p.generateConvocatoria({
      salida: p.salida,
      niche: p.niche,
      clientName: p.clientName,
      clientOnboarding: p.clientOnboarding,
      vozSlug: p.vozSlug,
      clipDurationSeconds: p.clipDurationSeconds,
      publicationDate: p.publicationDate,
      canalesHabilitados: p.canalesHabilitados,
      tipografiasPermitidas: p.tipografiasPermitidas,
      carpeta: p.carpeta,
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
    typographyId: convocatoria.tipografia_id,
    copy: convocatoria.copy,
    items: itemsResult.items,
    copyMaxCharacters: p.copyMaxCharacters,
    lugarMaxCharacters: p.lugarMaxCharacters,
    fechaMaxCharacters: p.fechaMaxCharacters,
    itemMaxCharacters: p.itemMaxCharacters,
  })
}
