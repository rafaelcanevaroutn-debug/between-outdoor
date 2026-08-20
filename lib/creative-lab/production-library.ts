import type {SupabaseClient} from '@supabase/supabase-js'

import type {BannerMolde1RenderPayload} from '../banner-render-contract.ts'
import type {Banner1ContentContract, Banner2ContentContract, Banner3ContentContract, Banner4ContentContract, Banner5ContentContract, Banner6ContentContract} from '../generators/banner-content.ts'
import {validateCreativeTemplateHtml, type CreativeTemplateContract} from './template-contract.ts'

export interface ApprovedCreativeTemplate {
  id: string
  contract: CreativeTemplateContract
  html: string
}

export function stableCreativeTemplateIndex(selectionKey: string, templateCount: number): number {
  const key = selectionKey.trim()
  if (!key) throw new Error('selectionKey no puede estar vacío')
  if (!Number.isSafeInteger(templateCount) || templateCount < 1) throw new Error('templateCount inválido')
  let hash = 2166136261
  for (const character of key) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % templateCount
}

export async function selectApprovedCreativeTemplate(params: {
  client: SupabaseClient
  moldType: 1 | 2 | 3 | 4 | 5 | 6
  selectionKey?: string
  pieceType?: 'banner' | 'flyer' | 'story'
  dimensions?: {width: number; height: number}
}): Promise<ApprovedCreativeTemplate | null> {
  const pieceType = params.pieceType ?? 'banner'
  const dimensions = params.dimensions ?? {width: 1080, height: 1350}
  const {data, error} = await params.client.from('template_library')
    .select('id,template_id,version,piece_type,mold_type,width,height,variant,slots_schema,branding_tokens,html_template')
    .eq('status', 'approved')
    .eq('stress_test_passed', true)
    .eq('mold_type', params.moldType)
    .eq('piece_type', pieceType)
    .eq('width', dimensions.width)
    .eq('height', dimensions.height)
    .order('approved_at', {ascending: false})
    .limit(100)
  if (error) throw new Error(`No se pudo consultar la biblioteca aprobada: ${error.message}`)
  if (!data?.length) return null
  const dataIndex = params.selectionKey ? stableCreativeTemplateIndex(params.selectionKey, data.length) : 0
  const selected = data[dataIndex]
  const contract: CreativeTemplateContract = {
    template_id: selected.template_id,
    version: selected.version,
    piece_type: selected.piece_type,
    mold_type: selected.mold_type,
    dimensions: {width: selected.width, height: selected.height},
    variant: selected.variant,
    slots: selected.slots_schema,
    branding_tokens: selected.branding_tokens,
  }
  const errors = validateCreativeTemplateHtml(contract, selected.html_template)
  if (errors.length > 0) throw new Error(`El molde aprobado quedó inválido: ${errors.join('; ')}`)
  return {id: selected.id, contract, html: selected.html_template}
}

type LibraryTypography = 'Inter' | 'PlayfairDisplay'
export type BannerLibraryContent =
  | (Banner1ContentContract & {typographyId: LibraryTypography})
  | (Banner2ContentContract & {typographyId: LibraryTypography})
  | (Banner3ContentContract & {typographyId: LibraryTypography})
  | (Banner4ContentContract & {typographyId: LibraryTypography})
  | (Banner5ContentContract & {typographyId: LibraryTypography})
  | (Banner6ContentContract & {typographyId: LibraryTypography})

export interface ApprovedLibraryPreviewPayload {
  templateRecordId: string
  templateId: 'banner/molde-1@1' | 'banner/molde-2@1' | 'banner/molde-3@1' | 'banner/molde-4@1' | 'banner/molde-5@1' | 'banner/molde-6@1'
  requestId: string
  content: BannerLibraryContent
  backgroundDriveFileId: string
  brand: BannerMolde1RenderPayload['brand']
}

const CONTENT_MOLD = {'banner/molde-1': 1, 'banner/molde-2': 2, 'banner/molde-3': 3, 'banner/molde-4': 4, 'banner/molde-5': 5, 'banner/molde-6': 6} as const

export function buildApprovedLibraryPreviewPayload(params: {
  template: ApprovedCreativeTemplate
  currentPayload: Omit<ApprovedLibraryPreviewPayload, 'templateRecordId'>
}): ApprovedLibraryPreviewPayload {
  const expectedMold = CONTENT_MOLD[params.currentPayload.content.contentKind]
  if (params.template.contract.mold_type !== expectedMold) throw new Error(`El molde aprobado no corresponde a Molde ${expectedMold}`)
  if (params.currentPayload.content.contentKind === 'banner/molde-4') {
    const missingPriceSlots = params.currentPayload.content.salidas
      .map((_, index) => `salida_${index + 1}_precio`)
      .filter(slot => !params.template.contract.slots[slot])
    if (missingPriceSlots.length > 0) {
      throw new Error(`El Molde 4 aprobado no soporta precio por salida: faltan ${missingPriceSlots.join(', ')}`)
    }
  }
  if (!params.currentPayload.brand.logoUrl) throw new Error('El cliente no tiene logo autorizado para la biblioteca')
  return {...params.currentPayload, templateRecordId: params.template.id}
}
