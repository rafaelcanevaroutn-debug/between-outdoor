import type { Salida } from '@/types'
import { createBanner1Content, type Banner1ContentContract } from './banner-content.ts'
import { validateBannerField, validateBannerFieldList } from './banner-text-limits.ts'
import { formatVerifiedFecha, RELATIVE_DATE_PATTERN, resolveVerifiedLugar } from './banner-salida-fields.ts'

// Molde 1 (salida mínima) — Familia 4 SIN dato_duro, más 2-3 ítems que no
// tienen análogo en Familia 4 (que no tiene lista). Mezcla deliberada de dos
// familias, no es "Familia 4 tal cual":
// - copy: validado contra el mismo patrón de identidad de destino + verbo de
//   convocatoria que usa Familia 4 (video-family-4-contract.ts:
//   validateVideoFamily4Copy) — duplicado acá porque ese archivo no exporta
//   sus regex y no se toca.
// - items: validados contra el mismo patrón de higiene de lista que ya usan
//   2a/2c (video-family-2-contract.ts: sin duplicados, sin dato comercial) —
//   no vienen de una lista cerrada de lugares verificados como en 2a
//   específicamente, porque el spec de Molde 1 no los define como nombres de
//   lugar.
//
// Igual que Molde 2: este motor no genera texto. copy e items entran como
// parámetros y se validan acá; de dónde sale ese texto es una decisión de
// producto no definida en el spec y no se inventa acá.

const CONVOCATION_PATTERN = /\b(?:busco|buscamos|invito|invitamos|te sumás|se suman|vamos|venite|acompañanos|armamos grupo|quién se apunta)\b/iu
const WHATSAPP_PATTERN = /\bwhatsapp\b/iu
const PRIVATE_MESSAGE_PATTERN = /\b(?:por mp|mensaje privado)\b/iu

// OJO: esto NO es el patrón "comercial" de 2a/2c (ese banea "escribinos",
// "reservá", etc. como lenguaje de venta — inaplicable acá, el copy de
// Familia 4 real SIEMPRE incluye un canal de contacto tipo "Escribinos por
// WhatsApp" y eso está bien). Es el patrón de DATO DURO de Familia 4
// (video-family-4-contract.ts: ANY_HARD_DATUM_PATTERN) — precio, fecha,
// cupos. Molde 1 no tiene dato_duro donde vivir ese dato, así que se
// prohíbe directamente en vez de exigir que viva en otro campo.
export const HARD_DATUM_PATTERN = /(?:\b(?:USD|ARS|precio|seña)\b|\$\s*\d|\b\d+\s+(?:cupos?|lugares?|personas?|amigos?)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b20\d{2}\b|\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b)/iu

// Esto sí es del mismo espíritu que 2a/2c: los items son bullets factuales,
// no mini-CTAs de venta. A diferencia de copy (que puede decir "Escribinos
// por WhatsApp" como canal de contacto legítimo), un item nunca debería
// sonar a "Reservá tu lugar".
//
// Sin \b de cierre a propósito (mismo motivo que video-family-2-contract.ts
// documenta para su propio patrón de CTA): el \b de ASCII no reconoce
// vocales acentuadas ni pronombres pegados como parte de la palabra, así
// que "reserv\b" matchea "reservá" pero "reserv(?:á|a|ar)\b" no matchea
// nada, y "inscrib\b" no matchea "inscribite". Abrir el prefijo cubre
// cualquier conjugación sin enumerarlas.
const SALES_LANGUAGE_PATTERN = /\b(?:reserv|inscrib|whatsapp)/iu

function comparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/\s+/gu, ' ')
    .trim()
}

const MIN_ITEMS = 2
const MAX_ITEMS = 3

export interface BuildBannerMolde1Params {
  salida: Salida
  publicationDate?: string
  typographyId: string
  copy: string
  items: string[]
  copyMaxCharacters: number
  lugarMaxCharacters: number
  fechaMaxCharacters: number
  itemMaxCharacters: number
}

export type BuildBannerMolde1Result =
  | { ok: true; content: Banner1ContentContract }
  | { ok: false; error: string }

export function validateBannerMolde1Copy({
  copy,
  salida,
  maxCharacters,
  canalesHabilitados,
}: {
  copy: string
  salida: Salida
  maxCharacters: number
  canalesHabilitados?: string[]
}): string[] {
  const errors: string[] = []
  const normalized = copy.trim()
  const copyValidation = validateBannerField(normalized, maxCharacters)
  if (copyValidation.violations.length > 0) {
    errors.push(`copy no pasa el cap de banner: ${copyValidation.violations.join(', ')}`)
  }
  const normalizedCopy = comparable(normalized)
  const verifiedIdentity = [salida.destino, salida.nombre].filter(Boolean).map(comparable)
  if (!verifiedIdentity.some(value => value.length >= 3 && normalizedCopy.includes(value))) {
    errors.push('copy no identifica el destino o nombre real de la salida')
  }
  if (!CONVOCATION_PATTERN.test(normalized)) {
    errors.push('copy no contiene un verbo o pregunta de convocatoria')
  }
  if (HARD_DATUM_PATTERN.test(normalized)) {
    errors.push('copy contiene un dato comercial — eso vive en Familia 4, no en Molde 1')
  }
  if (canalesHabilitados) {
    if (WHATSAPP_PATTERN.test(normalized) && !canalesHabilitados.some(channel => WHATSAPP_PATTERN.test(channel))) {
      errors.push('copy usa WhatsApp pero el canal no está habilitado')
    }
    if (PRIVATE_MESSAGE_PATTERN.test(normalized) && !canalesHabilitados.some(channel => /(?:mp|instagram|mensaje privado)/iu.test(channel))) {
      errors.push('copy usa MP pero el canal no está habilitado')
    }
  }
  return errors
}

export function buildBannerMolde1(p: BuildBannerMolde1Params): BuildBannerMolde1Result {
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

  const copy = p.copy.trim()
  const copyErrors = validateBannerMolde1Copy({
    copy,
    salida: p.salida,
    maxCharacters: p.copyMaxCharacters,
  })
  if (copyErrors.length > 0) return { ok: false, error: copyErrors[0] }

  const items = p.items.map(item => item.trim()).filter(Boolean)
  if (items.length < MIN_ITEMS || items.length > MAX_ITEMS) {
    return { ok: false, error: `items debe tener entre ${MIN_ITEMS} y ${MAX_ITEMS} elementos; se recibieron ${items.length}` }
  }
  if (new Set(items.map(comparable)).size !== items.length) {
    return { ok: false, error: 'items contiene duplicados' }
  }
  const itemValidations = validateBannerFieldList(items, p.itemMaxCharacters)
  const invalidItem = itemValidations.find(validation => validation.violations.length > 0)
  if (invalidItem) {
    return { ok: false, error: `un ítem no pasa el cap de banner: ${invalidItem.violations.join(', ')}` }
  }
  if (items.some(item => HARD_DATUM_PATTERN.test(item) || SALES_LANGUAGE_PATTERN.test(item))) {
    return { ok: false, error: 'un ítem contiene un dato comercial o lenguaje de venta' }
  }

  const content = createBanner1Content({
    lugar,
    fecha,
    copy,
    items,
    typographyId: p.typographyId,
  })

  return { ok: true, content }
}
