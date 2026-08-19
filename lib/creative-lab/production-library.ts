import type {SupabaseClient} from '@supabase/supabase-js'

import type {BannerMolde1RenderPayload} from '../banner-render-contract.ts'
import {validateCreativeTemplateHtml, type CreativeTemplateContract} from './template-contract.ts'

export interface ApprovedCreativeTemplate {
  id: string
  contract: CreativeTemplateContract
  html: string
}

export function isCreativeLibraryProductionEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.CREATIVE_TEMPLATE_LIBRARY_PRODUCTION === 'true'
}

export async function selectApprovedCreativeTemplate(params: {
  client: SupabaseClient
  moldType: 1 | 2 | 6
}): Promise<ApprovedCreativeTemplate | null> {
  const {data, error} = await params.client.from('template_library')
    .select('id,template_id,version,piece_type,mold_type,width,height,variant,slots_schema,branding_tokens,html_template')
    .eq('status', 'approved')
    .eq('mold_type', params.moldType)
    .order('approved_at', {ascending: false})
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`No se pudo consultar la biblioteca aprobada: ${error.message}`)
  if (!data) return null
  const contract: CreativeTemplateContract = {
    template_id: data.template_id,
    version: data.version,
    piece_type: data.piece_type,
    mold_type: data.mold_type,
    dimensions: {width: data.width, height: data.height},
    variant: data.variant,
    slots: data.slots_schema,
    branding_tokens: data.branding_tokens,
  }
  const errors = validateCreativeTemplateHtml(contract, data.html_template)
  if (errors.length > 0) throw new Error(`El molde aprobado quedó inválido: ${errors.join('; ')}`)
  return {id: data.id, contract, html: data.html_template}
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
