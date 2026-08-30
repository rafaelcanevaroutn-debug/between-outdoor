import { createAdminClient } from '@/lib/supabase/admin'
import {
  dispatchFamiliesVideoRender,
  type FamiliesVideoRenderSource,
} from '@/lib/mati-families-video-dispatch'
import type { VideoKnowledgeFormat } from '@/types'

const ids = process.argv.slice(2).map(value => value.trim()).filter(Boolean)
if (ids.length === 0) throw new Error('Indicá al menos un ID de video para reintentar')

const admin = createAdminClient()
const { data: rows, error } = await admin
  .from('contenido_generado')
  .select('id,salida_id,user_id,formato,video_crudo,mes,generation_metadata,render_status,render_folder_id')
  .in('id', ids)

if (error) throw error
if (!rows || rows.length !== ids.length) {
  throw new Error(`Se encontraron ${rows?.length ?? 0} de ${ids.length} piezas solicitadas`)
}

const matiVideoUrl = process.env.MATI_SKILL_VIDEOS_URL?.trim() || null
if (!matiVideoUrl) throw new Error('MATI_SKILL_VIDEOS_URL no está configurada')

const callbackUrl = process.env.MATI_VIDEO_RENDER_WEBHOOK_URL?.trim()
  || process.env.MATI_RENDER_WEBHOOK_URL?.trim().replace(/\/render\/?$/u, '/video')
  || null

await Promise.all(rows.map(async row => {
  if (row.formato !== 'video') throw new Error(`${row.id} no es un video`)
  if (row.render_folder_id || row.render_status === 'rendered') {
    console.log(`[RETRY/VIDEO] ${row.id} ya está renderizado; se omite`)
    return
  }
  if (row.render_status !== 'failed') {
    throw new Error(`${row.id} está en ${row.render_status ?? 'sin estado'}; no se reintenta para evitar duplicados`)
  }

  const metadata = (row.generation_metadata ?? {}) as Record<string, unknown>
  const subfamilia = metadata.video_subfamilia as VideoKnowledgeFormat | undefined
  const contract = metadata.approved_video_contract as Record<string, unknown> | undefined
  if (!subfamilia || !contract) throw new Error(`${row.id} no conserva su contrato aprobado`)

  const [{ data: salida, error: salidaError }, { data: profile, error: profileError }, { data: brand, error: brandError }] = await Promise.all([
    admin.from('salidas').select('fecha_inicio,carpeta_videos_nombre').eq('id', row.salida_id).maybeSingle(),
    admin.from('profiles').select('company_name,full_name').eq('id', row.user_id).maybeSingle(),
    admin.from('brand_identity').select('mati_cliente_id,color_primario,color_texto,font_body,videos_folder_id').eq('user_id', row.user_id).maybeSingle(),
  ])
  if (salidaError) throw salidaError
  if (profileError) throw profileError
  if (brandError) throw brandError
  if (!salida || !profile) throw new Error(`${row.id} no tiene salida o perfil asociado`)

  const source: FamiliesVideoRenderSource = {
    id: row.id,
    subfamilia,
    contract,
    generationMetadata: metadata,
    videoCrudo: salida.carpeta_videos_nombre?.trim() || row.video_crudo,
    mes: row.mes,
    fechaInicio: salida.fecha_inicio,
    ownerProfile: profile,
    brandIdentity: brand,
  }

  const { error: claimError } = await admin
    .from('contenido_generado')
    .update({
      render_status: 'dispatching',
      generation_metadata: {
        ...metadata,
        video_render_error: null,
        video_render_response: null,
        video_manual_retry_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('render_status', 'failed')
  if (claimError) throw claimError

  await dispatchFamiliesVideoRender(source, {
    admin,
    matiVideoUrl,
    matiToken: process.env.MATI_SKILL_TOKEN?.trim(),
    callbackUrl,
  })
}))

console.log(`[RETRY/VIDEO] ${rows.length} pieza(s) reenviadas sin crear duplicados`)
