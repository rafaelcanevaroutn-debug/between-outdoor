import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFolderWithinRoot } from '@/lib/google-drive'
import { generateBannerMolde1Copy } from '@/lib/generators/banner-molde-1-copy'
import { generateBannerMolde1Items } from '@/lib/generators/banner-molde-1-items'
import { runBannerMolde1 } from '@/lib/generators/banner-molde-1-run'
import { mapBannerMolde1ToInsertRow } from '@/lib/banner-content-insert'
import { BANNER_MOLDE_1_CAPS } from '@/lib/banner-render-contract'
import type { ClientOnboarding, Niche, Salida, VideoTypographyId } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    const salidaId = typeof body.salidaId === 'string' ? body.salidaId.trim() : ''
    const backgroundDriveFileId = typeof body.backgroundDriveFileId === 'string'
      ? body.backgroundDriveFileId.trim() : ''
    const canalesHabilitados = Array.isArray(body.canalesHabilitados)
      ? body.canalesHabilitados.filter((value): value is string => typeof value === 'string').map(value => value.trim()).filter(Boolean)
      : []
    if (!salidaId || !backgroundDriveFileId) {
      return NextResponse.json({ error: 'salidaId y backgroundDriveFileId son requeridos' }, { status: 400 })
    }
    if (!/^[a-z0-9_-]+$/iu.test(backgroundDriveFileId)) {
      return NextResponse.json({ error: 'backgroundDriveFileId inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const admin = createAdminClient()
    const [{ data: callerProfile }, { data: salida }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      admin.from('salidas').select('*').eq('id', salidaId).maybeSingle(),
    ])
    if (!salida) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })
    if (callerProfile?.role !== 'admin' && salida.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para generar contenido de esta salida' }, { status: 403 })
    }

    const [{ data: ownerProfile }, { data: onboarding }, { data: brandIdentity }] = await Promise.all([
      admin.from('profiles').select('company_name,full_name,niche').eq('id', salida.user_id).maybeSingle(),
      admin.from('client_onboarding').select('*').eq('user_id', salida.user_id).maybeSingle(),
      admin.from('brand_identity').select('mati_cliente_id,fotos_folder_id,drive_folder_id').eq('user_id', salida.user_id).maybeSingle(),
    ])
    if (!ownerProfile) return NextResponse.json({ error: 'Perfil del cliente no encontrado' }, { status: 404 })
    if (!brandIdentity?.fotos_folder_id) {
      return NextResponse.json({ error: 'El cliente no tiene banco de fotos configurado' }, { status: 409 })
    }
    if (!brandIdentity.drive_folder_id) return NextResponse.json({ error: 'El cliente no tiene carpeta raíz de Drive' }, { status: 409 })
    const ownsImage = await isFolderWithinRoot(backgroundDriveFileId, brandIdentity.fotos_folder_id)
    if (!ownsImage) return NextResponse.json({ error: 'La foto no pertenece al banco del cliente' }, { status: 403 })

    const tipografiasPermitidas: VideoTypographyId[] = ['Inter', 'Playfair Display']
    const vozSlugCandidate = brandIdentity.mati_cliente_id?.trim()
    const vozSlug = vozSlugCandidate && /^[a-z0-9_-]+$/iu.test(vozSlugCandidate) ? vozSlugCandidate : undefined
    const result = await runBannerMolde1({
      salida: salida as Salida,
      niche: ownerProfile.niche as Niche,
      clientName: ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
      clientOnboarding: (onboarding as ClientOnboarding) ?? null,
      vozSlug,
      tipografiasPermitidas,
      canalesHabilitados,
      copyMaxCharacters: BANNER_MOLDE_1_CAPS.copy,
      lugarMaxCharacters: BANNER_MOLDE_1_CAPS.lugar,
      fechaMaxCharacters: BANNER_MOLDE_1_CAPS.fecha,
      itemMaxCharacters: BANNER_MOLDE_1_CAPS.item,
      generateCopy: generateBannerMolde1Copy,
      generateItems: generateBannerMolde1Items,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })

    const insertRow = mapBannerMolde1ToInsertRow({
      salidaId,
      userId: salida.user_id,
      content: result.content,
      backgroundDriveFileId,
    })
    const { data: inserted, error: insertError } = await admin
      .from('contenido_generado').insert(insertRow).select('*').single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    revalidatePath(`/salidas/${salidaId}/contenido`)
    return NextResponse.json({ success: true, banner: inserted }, { status: 201 })
  } catch (error) {
    console.error('[BANNER/GENERATE] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al generar el banner' }, { status: 500 })
  }
}
