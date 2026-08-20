import { createReflexiveVideoContent } from '../video-render-container.ts'
import { createBanner6Content, type Banner6ContentContract } from './banner-content.ts'
import { validateBannerField } from './banner-text-limits.ts'
import { HARD_DATUM_PATTERN } from './banner-molde-1.ts'
import { COMMERCIAL_CTA_PATTERN } from './banner-molde-2.ts'

// Molde 6 (comunidad/reclutamiento) — el de más trabajo nuevo de los 3.
//
// Mitad aspiracional: NO se genera acá. "mensaje" entra ya producido por
// generateVideoFamilia3({ subfamilia: '3a', ... }) en la capa de
// integración — este archivo solo lo re-envuelve con
// createReflexiveVideoContent (video-render-container.ts, mismo patrón de
// contrato neutral que ya usa el contenedor still_image_with_music).
// video-familia-3.ts queda completamente intacto; no se lo importa ni se
// lo llama desde acá.
//
// Convocatoria abierta: es contenido genuinamente nuevo — no hay generador
// existente para un CTA de captación de marca sin salida específica (los
// CTA de 2a/2c/4 están atados a una salida real; 3a prohíbe CTA por
// completo). Este motor tampoco la genera (mismo criterio que copy/cta en
// Moldes 1 y 2: NO Gemini en esta fase) — entra como parámetro y se valida
// acá contra las dos reglas explícitas del spec:
// - no urgencia inventada: mismo patrón que ya usa Familia 4
//   (video-family-4-contract.ts), duplicado porque ese archivo no lo
//   exporta y no se toca.
// - no promesas falsas / de transformación: mismo vocabulario prohibido
//   que ya comparten los docs de 3a y 3c (video_reflexivo.md/video_meme.md:
//   "no prometer sanación o transformación") — nunca antes existió como
//   regex en código, es la única pieza de todo este trabajo sin un
//   precedente literal fuera de prosa de knowledge doc.
//
// No aplica anclaje duro de identidad (destino/nombre) porque, a
// diferencia de los otros dos moldes, este no nombra ninguna salida.

export const INVENTED_URGENCY_PATTERN = /(?:últimos cupos|últimos lugares|se agota|sólo hoy|solo hoy)\b/iu
export const FALSE_PROMISE_PATTERN = /\b(?:cura|sana|arregla|transforma|garantiza)\w*/iu
export const COMMUNITY_INVITATION_PATTERN = /(?:\bsum|\bunite\b|\buní|\bforma parte\b|\bformá parte\b|\bvení\b|\bveni\b|\bacompañ|\bparticip)/iu

export interface BuildBannerMolde6Params {
  mensaje: string
  convocatoria: string
  typographyId: string
  mensajeMaxCharacters: number
  convocatoriaMaxCharacters: number
}

export type BuildBannerMolde6Result =
  | { ok: true; content: Banner6ContentContract }
  | { ok: false; error: string }

export function buildBannerMolde6(p: BuildBannerMolde6Params): BuildBannerMolde6Result {
  let reflexiveContent
  try {
    reflexiveContent = createReflexiveVideoContent(p.mensaje, p.typographyId)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'mensaje inválido' }
  }
  const mensajeValidation = validateBannerField(reflexiveContent.copy, p.mensajeMaxCharacters)
  if (mensajeValidation.violations.length > 0) {
    return { ok: false, error: `mensaje no pasa el cap de banner: ${mensajeValidation.violations.join(', ')}` }
  }

  const convocatoria = p.convocatoria.trim()
  const convocatoriaValidation = validateBannerField(convocatoria, p.convocatoriaMaxCharacters)
  if (convocatoriaValidation.violations.length > 0) {
    return { ok: false, error: `convocatoria no pasa el cap de banner: ${convocatoriaValidation.violations.join(', ')}` }
  }
  if (INVENTED_URGENCY_PATTERN.test(convocatoria)) {
    return { ok: false, error: 'convocatoria inventa urgencia o disponibilidad' }
  }
  if (FALSE_PROMISE_PATTERN.test(convocatoria)) {
    return { ok: false, error: 'convocatoria promete sanar, curar, arreglar, transformar o garantizar algo' }
  }
  if (HARD_DATUM_PATTERN.test(convocatoria) || COMMERCIAL_CTA_PATTERN.test(convocatoria)) {
    return { ok: false, error: 'convocatoria contiene datos o lenguaje comercial de una salida específica' }
  }
  if (!COMMUNITY_INVITATION_PATTERN.test(convocatoria)) {
    return { ok: false, error: 'convocatoria debe invitar explícitamente a sumarse o participar de la comunidad' }
  }

  const content = createBanner6Content({
    mensaje: reflexiveContent.copy,
    convocatoria,
    typographyId: reflexiveContent.typographyId,
  })

  return { ok: true, content }
}
