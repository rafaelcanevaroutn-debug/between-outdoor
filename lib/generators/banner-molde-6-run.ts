import type { ClientOnboarding, GeneratedVideoFamilia3, Niche, Salida, VideoTypographyId } from '@/types'
import type { GenerateVideoFamilia3Params } from './video-familia-3.ts'
import type {
  GenerateBannerMolde6ConvocatoriaParams,
  GenerateBannerMolde6ConvocatoriaResult,
} from './banner-molde-6-convocatoria.ts'
import { buildBannerMolde6, type BuildBannerMolde6Result } from './banner-molde-6.ts'

// Orquestador de Molde 6 — engancha generateVideoFamilia3({subfamilia:'3a'})
// (real, inyectado, INTACTO — no se toca ni se importa el archivo real
// acá, solo su tipo) para el mensaje aspiracional, y
// generateBannerMolde6Convocatoria (real, inyectado — el único generador
// genuinamente nuevo de los 3 moldes) para la convocatoria. Ambas
// llamadas son independientes — corren en paralelo. El compositor del
// PR #14 (banner-molde-6.ts) no cambió: sigue haciendo el re-envuelto vía
// createReflexiveVideoContent y la validación final.

export interface RunBannerMolde6Params {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
  mensajeMaxCharacters: number
  convocatoriaMaxCharacters: number
  /** En producción, pasar generateVideoFamilia3 tal cual (subfamilia fija en '3a' acá). */
  generateMensaje: (params: GenerateVideoFamilia3Params) => Promise<GeneratedVideoFamilia3>
  /** En producción, pasar generateBannerMolde6Convocatoria tal cual. */
  generateConvocatoria: (params: GenerateBannerMolde6ConvocatoriaParams) => Promise<GenerateBannerMolde6ConvocatoriaResult>
}

export type RunBannerMolde6Result = BuildBannerMolde6Result

export async function runBannerMolde6(p: RunBannerMolde6Params): Promise<RunBannerMolde6Result> {
  const [mensajeResult, convocatoriaResult] = await Promise.all([
    p.generateMensaje({
      subfamilia: '3a',
      salida: p.salida,
      niche: p.niche,
      clientName: p.clientName,
      clientOnboarding: p.clientOnboarding,
      vozSlug: p.vozSlug,
      clipDurationSeconds: p.clipDurationSeconds,
      tipografiasPermitidas: p.tipografiasPermitidas,
      carpeta: p.carpeta,
    }),
    p.generateConvocatoria({
      clientName: p.clientName,
      clientOnboarding: p.clientOnboarding,
      maxCharacters: p.convocatoriaMaxCharacters,
    }),
  ])

  return buildBannerMolde6({
    mensaje: mensajeResult.copy,
    convocatoria: convocatoriaResult.convocatoria,
    typographyId: mensajeResult.tipografia_id,
    mensajeMaxCharacters: p.mensajeMaxCharacters,
    convocatoriaMaxCharacters: p.convocatoriaMaxCharacters,
  })
}
