export const CREATIVE_TEMPLATE_BRANDING_TOKENS = [
  '--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text',
  '--font-title', '--font-body',
] as const

export type CreativePieceType = 'banner' | 'flyer' | 'story' | 'carousel_slide'
export type CreativeTemplateStatus = 'experimental' | 'approved' | 'archived' | 'rejected'
export type CreativeSlotType = 'text' | 'image_url'

export interface CreativeTemplateSlot {
  type: CreativeSlotType
  required: boolean
  max_chars?: number
}

export interface CreativeTemplateContract {
  template_id: string
  version: string
  piece_type: CreativePieceType
  mold_type?: 1 | 2 | 3 | 4 | 5 | 6
  dimensions: { width: number; height: number }
  variant: 'light' | 'dark' | 'adaptive'
  slots: Record<string, CreativeTemplateSlot>
  branding_tokens: string[]
}

const TEMPLATE_ID = /^[a-z0-9]+(?:[a-z0-9_-]*[a-z0-9])?$/u
const SLOT_ID = /^[a-z][a-z0-9_]{0,63}$/u
const SEMVER = /^\d+\.\d+\.\d+$/u
const FORBIDDEN_HTML = [
  /<\s*script\b/iu, /<\s*(?:iframe|object|embed|base|link)\b/iu,
  /\son[a-z]+\s*=/iu, /javascript\s*:/iu, /@import\b/iu,
  /url\s*\(\s*['"]?\s*(?:https?:|\/\/)/iu,
  /\s(?:src|srcset|href|action|formaction|poster)\s*=\s*['"]?\s*(?:https?:|\/\/)/iu,
  /<\s*meta\b[^>]*http-equiv\s*=\s*['"]?refresh/iu,
]

export function validateCreativeTemplateContract(contract: CreativeTemplateContract): string[] {
  const errors: string[] = []
  if (!TEMPLATE_ID.test(contract.template_id)) errors.push('template_id inválido')
  if (!SEMVER.test(contract.version)) errors.push('version debe usar semver X.Y.Z')
  if (!['banner', 'flyer', 'story', 'carousel_slide'].includes(contract.piece_type)) errors.push('piece_type inválido')
  if (contract.mold_type !== undefined && (!Number.isInteger(contract.mold_type) || contract.mold_type < 1 || contract.mold_type > 6)) errors.push('mold_type inválido')
  for (const [key, value] of Object.entries(contract.dimensions)) {
    if (!Number.isInteger(value) || value < 320 || value > 4096) errors.push(`dimensions.${key} inválida`)
  }
  const entries = Object.entries(contract.slots)
  if (entries.length === 0) errors.push('slots no puede estar vacío')
  for (const [name, slot] of entries) {
    if (!SLOT_ID.test(name)) errors.push(`slot ${name} tiene nombre inválido`)
    if (slot.type !== 'text' && slot.type !== 'image_url') errors.push(`slot ${name} tiene type inválido`)
    if (slot.type === 'text' && (!Number.isInteger(slot.max_chars) || (slot.max_chars ?? 0) < 1 || (slot.max_chars ?? 0) > 2000)) {
      errors.push(`slot ${name} requiere max_chars válido`)
    }
    if (slot.type === 'image_url' && slot.max_chars !== undefined) errors.push(`slot ${name} no admite max_chars`)
  }
  const allowed = new Set<string>(CREATIVE_TEMPLATE_BRANDING_TOKENS)
  if (new Set(contract.branding_tokens).size !== contract.branding_tokens.length) errors.push('branding_tokens contiene duplicados')
  for (const token of contract.branding_tokens) if (!allowed.has(token)) errors.push(`branding token no permitido: ${token}`)
  for (const required of CREATIVE_TEMPLATE_BRANDING_TOKENS) {
    if (!contract.branding_tokens.includes(required)) errors.push(`falta branding token: ${required}`)
  }
  return errors
}

export function validateCreativeTemplateHtml(contract: CreativeTemplateContract, html: string): string[] {
  const errors = validateCreativeTemplateContract(contract)
  if (!html.trim()) return [...errors, 'html_template vacío']
  if (html.length > 250_000) errors.push('html_template supera 250000 caracteres')
  for (const pattern of FORBIDDEN_HTML) if (pattern.test(html)) errors.push(`html_template contiene contenido prohibido: ${pattern.source}`)
  if (!/class\s*=\s*['"][^'"]*\bslide\b/iu.test(html)) errors.push('falta contenedor raíz .slide')
  if ((html.match(/<style\s+data-template-css(?:=["'][^"']*["'])?\s*>/giu) ?? []).length !== 1) errors.push('debe existir exactamente un bloque style data-template-css')
  if ((html.match(/<style\b/giu) ?? []).length !== 1) errors.push('no se permiten bloques style adicionales')
  if (!/overflow\s*:\s*hidden/iu.test(html)) errors.push('.slide debe usar overflow: hidden')
  const declaredSlots = new Set(Object.keys(contract.slots))
  const usedSlots = [...html.matchAll(/data-slot\s*=\s*["']([^"']+)["']/giu)].map(match => match[1])
  for (const name of new Set(usedSlots)) {
    if (!declaredSlots.has(name)) errors.push(`slot no declarado en el contrato: ${name}`)
  }
  for (const token of contract.branding_tokens) {
    if (!html.includes(`var(${token})`)) errors.push(`HTML no usa ${token}`)
  }
  for (const [name, slot] of Object.entries(contract.slots)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    const matches = html.match(new RegExp(`data-slot\\s*=\\s*["']${escaped}["']`, 'giu')) ?? []
    if (slot.required && matches.length !== 1) errors.push(`slot requerido ${name} debe aparecer exactamente una vez`)
    if (!slot.required && matches.length > 1) errors.push(`slot opcional ${name} aparece más de una vez`)
    if (slot.type === 'image_url' && matches.length > 0) {
      const imageElement = new RegExp(`<img\\b[^>]*data-slot\\s*=\\s*["']${escaped}["'][^>]*>`, 'iu')
      if (!imageElement.test(html)) errors.push(`slot de imagen ${name} debe usar un elemento img`)
    }
  }
  return errors
}

export function replaceCreativeTemplateCss(html: string, css: string): string {
  if (!css.trim() || css.length > 120_000 || /<\/style|<script|@import\b|url\s*\(\s*['"]?\s*(?:https?:|\/\/)/iu.test(css)) {
    throw new Error('CSS corregido inválido o inseguro')
  }
  const pattern = /(<style\s+data-template-css(?:=["'][^"']*["'])?\s*>)[\s\S]*?(<\/style>)/iu
  if (!pattern.test(html)) throw new Error('El molde no tiene un bloque CSS corregible')
  return html.replace(pattern, `$1\n${css}\n$2`)
}

export function assertCreativeTemplate(contract: CreativeTemplateContract, html: string): void {
  const errors = validateCreativeTemplateHtml(contract, html)
  if (errors.length > 0) throw new Error(errors.join('; '))
}
