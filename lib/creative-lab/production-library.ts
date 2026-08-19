import type {SupabaseClient} from '@supabase/supabase-js'

import type {BannerMolde1RenderPayload} from '../banner-render-contract.ts'
import type {Banner1ContentContract, Banner2ContentContract, Banner3ContentContract, Banner4ContentContract, Banner5ContentContract, Banner6ContentContract} from '../generators/banner-content.ts'
import {validateCreativeTemplateHtml, type CreativeTemplateContract} from './template-contract.ts'

export interface ApprovedCreativeTemplate {
  id: string
  contract: CreativeTemplateContract
  html: string
}

export function isCreativeLibraryProductionEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.CREATIVE_TEMPLATE_LIBRARY_PRODUCTION === 'true'
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

/**
 * Convierte únicamente logos del bucket público legado de este Supabase a un
 * data URL acotado. Así el futuro renderer no necesita abrir acceso a red ni
 * recibir una URL arbitraria. No persiste ni transmite el resultado.
 */
export async function fetchTrustedLogoDataUrl(params: {
  logoUrl: string
  supabaseUrl: string
  fetchImpl?: typeof fetch
}): Promise<string> {
  const logo = new URL(params.logoUrl)
  const supabase = new URL(params.supabaseUrl)
  if (logo.protocol !== 'https:' || logo.origin !== supabase.origin || !logo.pathname.startsWith('/storage/v1/object/public/logos/')) {
    throw new Error('El logo no pertenece al bucket autorizado')
  }
  const response = await (params.fetchImpl ?? fetch)(logo, {redirect: 'error', signal: AbortSignal.timeout(10_000)})
  if (!response.ok) throw new Error(`No se pudo obtener el logo autorizado (HTTP ${response.status})`)
  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].toLowerCase()
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw new Error('El logo autorizado no es PNG, JPEG o WebP')
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > 2_000_000) throw new Error('El logo supera 2 MB')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length < 8 || bytes.length > 2_000_000) throw new Error('El logo tiene un tamaño inválido')
  return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`
}

export interface Molde1LibraryProductionDraft {
  enabled: true
  templateRecordId: string
  contract: CreativeTemplateContract
  html: string
  mockData: Record<string, string>
  backgroundDriveFileId: string
  logoDataUrl: string
  blockedBy: 'renderer_library_contract_pending'
}

export interface Molde1ApprovedLibraryPreviewPayload extends BannerMolde1RenderPayload {
  templateRecordId: string
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
  if (!params.currentPayload.brand.logoUrl) throw new Error('El cliente no tiene logo autorizado para la biblioteca')
  return {...params.currentPayload, templateRecordId: params.template.id}
}

/**
 * Contrato seguro hacia Mati: no transmite HTML. El renderer recibe el UUID y
 * vuelve a buscar una fila `approved` en Supabase antes de renderizarla.
 */
export function buildMolde1ApprovedLibraryPreviewPayload(params: {
  template: ApprovedCreativeTemplate
  currentPayload: BannerMolde1RenderPayload
}): Molde1ApprovedLibraryPreviewPayload {
  return buildApprovedLibraryPreviewPayload({template: params.template, currentPayload: params.currentPayload}) as Molde1ApprovedLibraryPreviewPayload
}

export async function renderApprovedLibraryPreview(params: {
  endpoint: string
  token: string
  payload: ApprovedLibraryPreviewPayload
  fetchImpl?: typeof fetch
}): Promise<Uint8Array> {
  if (!params.endpoint.startsWith('https://') && !params.endpoint.startsWith('http://localhost:')) throw new Error('Endpoint de biblioteca inválido')
  if (!params.token.trim()) throw new Error('MATI_SKILL_TOKEN es obligatorio para la biblioteca')
  const response = await (params.fetchImpl ?? fetch)(params.endpoint, {method: 'POST', headers: {Authorization: `Bearer ${params.token}`, 'Content-Type': 'application/json'}, body: JSON.stringify(params.payload), signal: AbortSignal.timeout(120_000)})
  if (!response.ok) throw new Error(`El renderer de biblioteca respondió HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`)
  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].toLowerCase()
  if (contentType !== 'image/png') throw new Error('El renderer de biblioteca no devolvió PNG')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length < 8 || bytes.length > 15_000_000) throw new Error('El PNG de biblioteca tiene un tamaño inválido')
  return bytes
}

export async function renderMolde1ApprovedLibraryPreview(params: {
  endpoint: string
  token: string
  payload: Molde1ApprovedLibraryPreviewPayload
  fetchImpl?: typeof fetch
}): Promise<Uint8Array> {
  return renderApprovedLibraryPreview(params)
}

export function buildMolde1LibraryProductionDraft(params: {
  template: ApprovedCreativeTemplate
  currentPayload: BannerMolde1RenderPayload
  logoDataUrl: string
}): Molde1LibraryProductionDraft {
  if (params.template.contract.mold_type !== 1) throw new Error('El molde aprobado no corresponde a Molde 1')
  const {content, brand} = params.currentPayload
  const mockData: Record<string, string> = {
    marca: brand.name,
    lugar: content.lugar,
    fecha: content.fecha,
    copy: content.copy,
    item_1: content.items[0],
    item_2: content.items[1],
    ...(content.items[2] ? {item_3: content.items[2]} : {}),
  }
  for (const [name, slot] of Object.entries(params.template.contract.slots)) {
    if (slot.type !== 'text') continue
    const value = mockData[name] ?? ''
    if (slot.required && !value) throw new Error(`Falta el slot textual requerido ${name}`)
    if (value.length > (slot.max_chars ?? 0)) throw new Error(`${name} supera el cap del molde aprobado`)
  }
  return {
    enabled: true,
    templateRecordId: params.template.id,
    contract: params.template.contract,
    html: params.template.html,
    mockData,
    backgroundDriveFileId: params.currentPayload.backgroundDriveFileId,
    logoDataUrl: params.logoDataUrl,
    blockedBy: 'renderer_library_contract_pending',
  }
}
