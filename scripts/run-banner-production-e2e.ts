import {createAdminClient} from '../lib/supabase/admin.ts'
import {isFolderWithinRoot} from '../lib/google-drive.ts'
import {buildBannerMolde3} from '../lib/generators/banner-moldes-commercial.ts'
import {mapBannerContentToInsertRow} from '../lib/banner-content-insert.ts'
import {buildBannerBrand} from '../lib/banner-render-contract.ts'
import {
  buildApprovedLibraryPreviewPayload,
  selectApprovedCreativeTemplate,
  type ApprovedLibraryPreviewPayload,
} from '../lib/creative-lab/production-library.ts'
import {dispatchBannerRender} from '../lib/banner-render-dispatch.ts'
import type {Salida} from '../types/index.ts'

function argument(name: string): string {
  const prefix = `--${name}=`
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

const execute = process.argv.includes('--execute')
const salidaId = argument('salida-id') || process.env.BANNER_E2E_SALIDA_ID?.trim() || ''
const backgroundDriveFileId = argument('background-file-id') || process.env.BANNER_E2E_BACKGROUND_DRIVE_FILE_ID?.trim() || ''

async function prepareCase() {
  if (!/^[0-9a-f-]{36}$/iu.test(salidaId)) throw new Error('Falta --salida-id=<uuid> o BANNER_E2E_SALIDA_ID')
  if (!/^[a-z0-9_-]+$/iu.test(backgroundDriveFileId)) {
    throw new Error('Falta --background-file-id=<id> o BANNER_E2E_BACKGROUND_DRIVE_FILE_ID')
  }
  const admin = createAdminClient()
  const {data: salidaRow, error: salidaError} = await admin.from('salidas').select('*').eq('id', salidaId).maybeSingle()
  if (salidaError) throw new Error(salidaError.message)
  if (!salidaRow) throw new Error('La salida E2E no existe')
  const salida = salidaRow as Salida
  const [{data: ownerProfile}, {data: brandIdentity}] = await Promise.all([
    admin.from('profiles').select('company_name,full_name').eq('id', salida.user_id).maybeSingle(),
    admin.from('brand_identity').select('drive_folder_id,fotos_folder_id,logo_url,color_acento,color_primario').eq('user_id', salida.user_id).maybeSingle(),
  ])
  if (!ownerProfile || !brandIdentity?.drive_folder_id || !brandIdentity.fotos_folder_id) {
    throw new Error('La salida E2E no tiene perfil, raíz de Drive o banco de fotos configurado')
  }
  if (!await isFolderWithinRoot(backgroundDriveFileId, brandIdentity.fotos_folder_id)) {
    throw new Error('La foto E2E no pertenece al banco privado de la salida')
  }
  const content = buildBannerMolde3({salida, cta: 'Consultá tu lugar', typographyId: 'Inter'})
  const template = await selectApprovedCreativeTemplate({client: admin, moldType: 3, selectionKey: salida.id})
  if (!template) throw new Error('No existe un Molde 3 aprobado y probado al extremo')
  const brand = buildBannerBrand({ownerProfile, brandIdentity})
  if (!brand.logoUrl) throw new Error('La marca E2E no tiene logo autorizado')

  const configuredBannerUrl = process.env.MATI_SKILL_BANNER_LIBRARY_URL?.trim()
  const configuredBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+\/?$/u, '')
  const matiBannerUrl = configuredBannerUrl || (configuredBase ? `${configuredBase}/api/generar-banner-library` : '')
  const matiBase = matiBannerUrl.replace(/\/api\/generar-banner(?:-library)?\/?$/u, '') || configuredBase
  const matiToken = process.env.MATI_SKILL_TOKEN?.trim()
  if (!matiBannerUrl || !matiBase || !matiToken) {
    throw new Error('Falta configurar endpoint y MATI_SKILL_TOKEN para la prueba productiva')
  }
  return {admin, salida, content, template, brand, matiBannerUrl, matiBase, matiToken}
}

async function main(): Promise<void> {
  const prepared = await prepareCase()
  if (!execute) {
    console.log(JSON.stringify({
      mode: 'dry-run', ready: true, mutatesState: false, openAiCostUsd: 0,
      salidaId: prepared.salida.id, moldType: 3, templateRecordId: prepared.template.id,
      backgroundDriveFileId, content: prepared.content,
      next: 'Esperar el push/deploy de Mati y ejecutar el mismo comando con --execute.',
    }, null, 2))
    return
  }

  const insertRow = mapBannerContentToInsertRow({
    salidaId: prepared.salida.id,
    userId: prepared.salida.user_id,
    content: prepared.content,
    backgroundDriveFileId,
    metadata: {banner_e2e: true, banner_e2e_started_at: new Date().toISOString()},
  })
  const {data: inserted, error: insertError} = await prepared.admin.from('contenido_generado')
    .insert(insertRow).select('id').single()
  if (insertError || !inserted?.id) throw new Error(insertError?.message ?? 'No se pudo crear la pieza E2E')

  const payload = buildApprovedLibraryPreviewPayload({
    template: prepared.template,
    currentPayload: {
      templateId: 'banner/molde-3@1', requestId: inserted.id,
      content: prepared.content as ApprovedLibraryPreviewPayload['content'],
      backgroundDriveFileId, brand: prepared.brand,
    },
  })
  await dispatchBannerRender(
    {id: inserted.id, payload},
    {
      admin: prepared.admin, matiBase: prepared.matiBase, matiBannerUrl: prepared.matiBannerUrl,
      matiToken: prepared.matiToken,
    },
  )
  const {data: result, error: resultError} = await prepared.admin.from('contenido_generado')
    .select('id,render_status,render_folder_id,generation_metadata').eq('id', inserted.id).single()
  if (resultError) throw new Error(resultError.message)
  if (result.render_status !== 'rendered' || !result.render_folder_id) {
    throw new Error(`La prueba E2E terminó en ${result.render_status ?? 'estado desconocido'} sin PNG en Drive`)
  }
  console.log(JSON.stringify({
    mode: 'executed', openAiCostUsd: 0, contentId: result.id,
    renderStatus: result.render_status, driveFileId: result.render_folder_id,
  }, null, 2))
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
