import type { BrandIdentity, Profile } from '@/types'
import { createBanner1Content, type Banner1ContentContract } from './generators/banner-content.ts'

export const BANNER_MOLDE_1_TEMPLATE_ID = 'banner/molde-1@1' as const
export const BANNER_MOLDE_1_CAPS = {
  lugar: 32,
  fecha: 28,
  copy: 96,
  item: 36,
  minItems: 2,
  maxItems: 3,
} as const

export interface BannerMolde1RenderPayload {
  templateId: typeof BANNER_MOLDE_1_TEMPLATE_ID
  requestId: string
  content: Banner1ContentContract & { typographyId: 'Inter' | 'PlayfairDisplay' }
  backgroundDriveFileId: string
  brand: {
    clientId: string
    clientDriveFolderId: string
    name: string
    logoUrl?: string
    accentColor: string
  }
}

export interface PersistedBannerMolde1Row {
  id: string
  titulo: string | null
  subtitulo: string | null
  bullets: string[] | null
  cta: string | null
  generation_metadata: Record<string, unknown> | null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function validHex(value: unknown): string | null {
  const normalized = stringValue(value)
  return normalized && /^#[0-9a-f]{6}$/iu.test(normalized) ? normalized.toUpperCase() : null
}

function validUrl(value: unknown): string | null {
  const normalized = stringValue(value)
  if (!normalized) return null
  try {
    const url = new URL(normalized)
    return url.protocol === 'https:' || url.protocol === 'http:' ? normalized : null
  } catch {
    return null
  }
}

function rendererTypography(value: string): 'Inter' | 'PlayfairDisplay' | null {
  if (value === 'Inter') return 'Inter'
  if (value === 'Playfair Display' || value === 'PlayfairDisplay') return 'PlayfairDisplay'
  return null
}

function slugify(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-AR')
    .replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '')
}

export function validateBannerMolde1RendererContent(content: Banner1ContentContract): string[] {
  const errors: string[] = []
  if (content.lugar.length > BANNER_MOLDE_1_CAPS.lugar) errors.push('lugar supera el cap del renderer')
  if (content.fecha.length > BANNER_MOLDE_1_CAPS.fecha) errors.push('fecha supera el cap del renderer')
  if (content.copy.length > BANNER_MOLDE_1_CAPS.copy) errors.push('copy supera el cap del renderer')
  if (content.items.length < BANNER_MOLDE_1_CAPS.minItems || content.items.length > BANNER_MOLDE_1_CAPS.maxItems) {
    errors.push('items no respeta la cantidad del renderer')
  }
  if (content.items.some(item => item.length > BANNER_MOLDE_1_CAPS.item)) errors.push('un ítem supera el cap del renderer')
  if (!rendererTypography(content.typographyId)) errors.push('tipografía no soportada por el renderer')
  return errors
}

export function rebuildBannerMolde1Content(row: PersistedBannerMolde1Row): Banner1ContentContract {
  const metadata = row.generation_metadata ?? {}
  const persisted = metadata.banner_content_contract
  const typographyId = persisted && typeof persisted === 'object' && !Array.isArray(persisted)
    ? stringValue((persisted as Record<string, unknown>).typographyId)
    : null
  const content = createBanner1Content({
    lugar: row.titulo ?? '',
    fecha: row.subtitulo ?? '',
    copy: row.cta ?? '',
    items: row.bullets ?? [],
    typographyId: typographyId ?? '',
  })
  const errors = validateBannerMolde1RendererContent(content)
  if (errors.length > 0) throw new Error(errors.join('; '))
  return content
}

export function buildBannerMolde1RenderPayload(params: {
  rowId: string
  content: Banner1ContentContract
  backgroundDriveFileId: string
  ownerProfile: Pick<Profile, 'company_name' | 'full_name'>
  brandIdentity: Pick<BrandIdentity, 'drive_folder_id' | 'logo_url' | 'color_acento' | 'color_primario'> | null
}): BannerMolde1RenderPayload {
  const errors = validateBannerMolde1RendererContent(params.content)
  if (errors.length > 0) throw new Error(errors.join('; '))
  const typographyId = rendererTypography(params.content.typographyId)
  if (!typographyId) throw new Error('tipografía no soportada por el renderer')
  const imageId = stringValue(params.backgroundDriveFileId)
  if (!imageId || !/^[a-z0-9_-]+$/iu.test(imageId)) throw new Error('El banner no tiene una foto de Drive válida')
  const brandName = stringValue(params.ownerProfile.company_name) ?? stringValue(params.ownerProfile.full_name)
  if (!brandName) throw new Error('El cliente no tiene nombre de marca para banners')
  const clientId = slugify(brandName)
  const clientDriveFolderId = stringValue(params.brandIdentity?.drive_folder_id)
  if (!clientId || !clientDriveFolderId || !/^[a-z0-9_-]+$/iu.test(clientDriveFolderId)) {
    throw new Error('El cliente no tiene una carpeta raíz de Drive válida para banners')
  }
  const logoUrl = validUrl(params.brandIdentity?.logo_url)
  return {
    templateId: BANNER_MOLDE_1_TEMPLATE_ID,
    requestId: params.rowId,
    content: {...params.content, typographyId},
    backgroundDriveFileId: imageId,
    brand: {
      clientId,
      clientDriveFolderId,
      name: brandName,
      ...(logoUrl ? {logoUrl} : {}),
      accentColor: validHex(params.brandIdentity?.color_acento)
        ?? validHex(params.brandIdentity?.color_primario)
        ?? '#F4C95D',
    },
  }
}
