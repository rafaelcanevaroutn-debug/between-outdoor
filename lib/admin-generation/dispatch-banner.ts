import type { runBannerMolde1 } from '@/lib/generators/banner-molde-1-run'
import type { generateBannerMolde1Copy } from '@/lib/generators/banner-molde-1-copy'
import type { generateBannerMolde1Items } from '@/lib/generators/banner-molde-1-items'
import type { runBannerMolde2 } from '@/lib/generators/banner-molde-2-run'
import type { generateVideoFamilia5 } from '@/lib/generators/video-familia-5'
import type { generateBannerCtaSuave } from '@/lib/generators/banner-cta-suave'
import type { buildBannerMolde3, buildBannerMolde5 } from '@/lib/generators/banner-moldes-commercial'
import type { runBannerMolde6 } from '@/lib/generators/banner-molde-6-run'
import type { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import type { generateBannerMolde6Convocatoria } from '@/lib/generators/banner-molde-6-convocatoria'
import type { ClientOnboarding, Niche, Salida, VideoTypographyId } from '@/types'

export interface BannerDispatchCommonParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  tipografiasPermitidas: VideoTypographyId[]
  canalesHabilitados: string[]
}

export interface BannerDispatchGenerators {
  runBannerMolde1: typeof runBannerMolde1
  generateBannerMolde1Copy: typeof generateBannerMolde1Copy
  generateBannerMolde1Items: typeof generateBannerMolde1Items
  runBannerMolde2: typeof runBannerMolde2
  generateVideoFamilia5: typeof generateVideoFamilia5
  generateBannerCtaSuave: typeof generateBannerCtaSuave
  buildBannerMolde3: typeof buildBannerMolde3
  buildBannerMolde5: typeof buildBannerMolde5
  runBannerMolde6: typeof runBannerMolde6
  generateVideoFamilia3: typeof generateVideoFamilia3
  generateBannerMolde6Convocatoria: typeof generateBannerMolde6Convocatoria
}

export interface BannerDispatchCaps {
  copyMaxCharacters: number
  lugarMaxCharacters: number
  fechaMaxCharacters: number
  itemMaxCharacters: number
}

// Ruteo puro molde → generador para los moldes 1, 2, 3, 5 y 6 (el 4 se
// resuelve aparte en la ruta: compone una agenda de salidas reales, no una
// salida sola). Extraído para poder probarlo con generadores inyectados.
export async function dispatchAdminBannerGeneration(
  moldType: 1 | 2 | 3 | 5 | 6,
  common: BannerDispatchCommonParams,
  extra: { cta?: string; caps: BannerDispatchCaps },
  generators: BannerDispatchGenerators,
): Promise<{ ok: true; content: unknown } | { ok: false; error: string }> {
  if (moldType === 1) {
    const result = await generators.runBannerMolde1({
      ...common,
      copyMaxCharacters: extra.caps.copyMaxCharacters,
      lugarMaxCharacters: extra.caps.lugarMaxCharacters,
      fechaMaxCharacters: extra.caps.fechaMaxCharacters,
      itemMaxCharacters: extra.caps.itemMaxCharacters,
      generateCopy: generators.generateBannerMolde1Copy,
      generateItems: generators.generateBannerMolde1Items,
    })
    return result.ok ? { ok: true, content: result.content } : { ok: false, error: result.error }
  }
  if (moldType === 2) {
    const result = await generators.runBannerMolde2({
      ...common,
      lugarMaxCharacters: 40,
      fechaMaxCharacters: 28,
      ctaMaxCharacters: 40,
      generateFicha: generators.generateVideoFamilia5,
      generateCta: generators.generateBannerCtaSuave,
    })
    return result.ok ? { ok: true, content: result.content } : { ok: false, error: result.error }
  }
  if (moldType === 3) {
    try {
      return { ok: true, content: generators.buildBannerMolde3({ salida: common.salida, cta: extra.cta ?? 'Consultá tu lugar', typographyId: 'Inter' }) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Los datos comerciales no son válidos' }
    }
  }
  if (moldType === 5) {
    try {
      return { ok: true, content: generators.buildBannerMolde5({ salida: common.salida, cta: extra.cta ?? 'Pedí el itinerario', typographyId: 'Playfair Display' }) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Los detalles de agencia no son válidos' }
    }
  }
  const result = await generators.runBannerMolde6({
    ...common,
    mensajeMaxCharacters: 80,
    convocatoriaMaxCharacters: 60,
    generateMensaje: generators.generateVideoFamilia3,
    generateConvocatoria: generators.generateBannerMolde6Convocatoria,
  })
  return result.ok ? { ok: true, content: result.content } : { ok: false, error: result.error }
}
