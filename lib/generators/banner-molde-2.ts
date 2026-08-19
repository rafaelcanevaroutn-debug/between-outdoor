import type { ClientOnboarding, Niche, Salida, VideoTypographyId } from '@/types'
import type { GenerateVideoFamilia5Params, GeneratedVideoFamilia5Result } from './video-familia-5.ts'
import { createBanner2Content, type Banner2ContentContract } from './banner-content.ts'
import { validateBannerField } from './banner-text-limits.ts'
import { formatVerifiedFecha, RELATIVE_DATE_PATTERN, resolveVerifiedLugar } from './banner-salida-fields.ts'

// Molde 2 (salida con ficha) — composición de piezas ya validadas, sin
// generador propio para lugar/fecha/CTA. La única llamada real a Gemini que
// hace este molde es la que ya hace generateVideoFamilia5 por dentro; el
// resto es lookup verificado (lugar, fecha) y validación (CTA).
//
// generateFicha es OBLIGATORIO, sin default: video-familia-5.ts importa
// varios módulos vía alias @/ (gemini-core, knowledge/loader, etc.) que no
// resuelven bajo el runner de tests (node --test), mismo problema que ya
// tuvimos con video-familia-1b.ts. Solo se importa el TIPO de
// generateVideoFamilia5 acá (se borra en runtime, no rompe nada) — la
// función real se inyecta desde la capa de integración que sí corre bajo
// Next.js/tsx con resolución de alias, no desde este archivo.
//
// DECISIÓN EXPLÍCITA, no estaba resuelta en el spec: este motor NO genera el
// texto del CTA. Reusa el patrón "CTA suave" de 2a/2c (video-family-2-
// contract.ts: mismo par de regex, duplicado acá porque esos archivos no
// exportan las suyas y no se tocan) para VALIDAR un texto de CTA que entra
// como parámetro. Cómo se produce ese texto —llamar a 2a/2c completo y
// descartar título/items, escribir un prompt nuevo, o elegir de un banco de
// frases variadas para no repetir siempre la misma— es una decisión de
// producto que no estaba definida y no se inventa acá.

export const SUAVE_CTA_PATTERN = /\b(?:mand|compart|guard|eleg|sum|etiquet|descubr|cont|cuál|cual)/iu
// "últimos lugares" se dejó fuera a propósito: el \b de ASCII no reconoce
// la "ú" inicial como parte de la palabra, así que \búltimos\b nunca
// matchea nada (bug latente que ya existe en el mismo patrón dentro de
// video-family-2-contract.ts) — "cupos" ya cubre la señal de escasez sin
// depender de esa frase específica.
export const COMMERCIAL_CTA_PATTERN = /(?:\breserv|\bcupos?\b|\bprecio\b|\bwhatsapp\b|\bmp\b)/iu

export interface BuildBannerMolde2Params {
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
  cta: string
  lugarMaxCharacters: number
  fechaMaxCharacters: number
  ctaMaxCharacters: number
  /** Obligatorio — ver nota arriba. En producción, pasar generateVideoFamilia5 tal cual. */
  generateFicha: (params: GenerateVideoFamilia5Params) => Promise<GeneratedVideoFamilia5Result>
}

export type BuildBannerMolde2Result =
  | {
      ok: true
      content: Banner2ContentContract
      metadata: { inputTokens: number; outputTokens: number; knowledgeFile: string }
    }
  | { ok: false; error: string }

export async function buildBannerMolde2(
  p: BuildBannerMolde2Params,
): Promise<BuildBannerMolde2Result> {
  const fichaResult = await p.generateFicha({
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
  })
  if (!fichaResult || !('familia' in fichaResult) || fichaResult.familia !== '5') {
    return {
      ok: false,
      error: 'Familia 5 no encontró una ficha elegible para esta salida (cayó a fallback o se descartó) — Molde 2 no aplica para esta salida, evaluar Molde 1',
    }
  }

  const lugar = resolveVerifiedLugar(p.salida)
  if (!lugar) return { ok: false, error: 'La salida no tiene destino ni nombre verificado' }
  const lugarValidation = validateBannerField(lugar, p.lugarMaxCharacters)
  if (lugarValidation.violations.length > 0) {
    return { ok: false, error: `lugar no pasa el cap de banner: ${lugarValidation.violations.join(', ')}` }
  }

  const fecha = formatVerifiedFecha(p.salida.fecha_inicio)
  if (!fecha) return { ok: false, error: 'La salida no tiene fecha_inicio válida' }
  if (RELATIVE_DATE_PATTERN.test(fecha) && !p.publicationDate) {
    return { ok: false, error: 'fecha usa una referencia relativa sin fecha de publicación contra la cual validarla' }
  }
  const fechaValidation = validateBannerField(fecha, p.fechaMaxCharacters)
  if (fechaValidation.violations.length > 0) {
    return { ok: false, error: `fecha no pasa el cap de banner: ${fechaValidation.violations.join(', ')}` }
  }

  const cta = p.cta.trim()
  const ctaValidation = validateBannerField(cta, p.ctaMaxCharacters)
  if (ctaValidation.violations.length > 0) {
    return { ok: false, error: `cta no pasa el cap de banner: ${ctaValidation.violations.join(', ')}` }
  }
  if (COMMERCIAL_CTA_PATTERN.test(cta)) {
    return { ok: false, error: 'cta debe ser editorial y no comercial, mismo patrón que 2a/2c' }
  }
  if (!SUAVE_CTA_PATTERN.test(cta)) {
    return { ok: false, error: 'cta debe invitar de forma suave a compartir, guardar o elegir, mismo patrón que 2a/2c' }
  }

  const content = createBanner2Content({
    lugar,
    fecha,
    ficha: fichaResult.datos,
    cta,
    typographyId: fichaResult.tipografia_id,
  })

  return {
    ok: true,
    content,
    metadata: {
      inputTokens: fichaResult.metadata.inputTokens,
      outputTokens: fichaResult.metadata.outputTokens,
      knowledgeFile: fichaResult.metadata.knowledgeFile,
    },
  }
}
