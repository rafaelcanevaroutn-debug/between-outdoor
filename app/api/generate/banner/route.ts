import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFolderWithinRoot } from '@/lib/google-drive'
import { generateBannerMolde1Copy } from '@/lib/generators/banner-molde-1-copy'
import { generateBannerMolde1Items } from '@/lib/generators/banner-molde-1-items'
import { runBannerMolde1 } from '@/lib/generators/banner-molde-1-run'
import {mapBannerContentToInsertRow} from '@/lib/banner-content-insert'
import {runBannerMolde2} from '@/lib/generators/banner-molde-2-run'
import {runBannerMolde6} from '@/lib/generators/banner-molde-6-run'
import {generateBannerCtaSuave} from '@/lib/generators/banner-cta-suave'
import {generateBannerMolde6Convocatoria} from '@/lib/generators/banner-molde-6-convocatoria'
import {generateVideoFamilia3} from '@/lib/generators/video-familia-3'
import {generateVideoFamilia5} from '@/lib/generators/video-familia-5'
import {buildBannerMolde3, buildBannerMolde4, buildBannerMolde5} from '@/lib/generators/banner-moldes-commercial'
import type {BannerContentContract} from '@/lib/generators/banner-content'
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
    const moldType = typeof body.moldType === 'number' && Number.isInteger(body.moldType) ? body.moldType : 1
    if (moldType < 1 || moldType > 6) return NextResponse.json({error: 'moldType debe estar entre 1 y 6'}, {status: 400})
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
    const typedSalida = salida as Salida
    const common = {
      salida: typedSalida,
      niche: ownerProfile.niche as Niche,
      clientName: ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
      clientOnboarding: (onboarding as ClientOnboarding) ?? null,
      vozSlug,
      tipografiasPermitidas,
      canalesHabilitados,
    }
    let content: BannerContentContract
    if (moldType === 1) {
      const result = await runBannerMolde1({
      ...common,
      copyMaxCharacters: BANNER_MOLDE_1_CAPS.copy,
      lugarMaxCharacters: BANNER_MOLDE_1_CAPS.lugar,
      fechaMaxCharacters: BANNER_MOLDE_1_CAPS.fecha,
      itemMaxCharacters: BANNER_MOLDE_1_CAPS.item,
      generateCopy: generateBannerMolde1Copy,
      generateItems: generateBannerMolde1Items,
      })
      if (!result.ok) return NextResponse.json({error: result.error}, {status: 422})
      content = result.content
    } else if (moldType === 2) {
      const result = await runBannerMolde2({...common, lugarMaxCharacters: 40, fechaMaxCharacters: 28, ctaMaxCharacters: 40, generateFicha: generateVideoFamilia5, generateCta: generateBannerCtaSuave})
      if (!result.ok) return NextResponse.json({error: result.error}, {status: 422})
      content = result.content
    } else if (moldType === 3) {
      try {
        content = buildBannerMolde3({salida: typedSalida, cta: typeof body.cta === 'string' ? body.cta : 'Consultá tu lugar', typographyId: 'Inter'})
      } catch (error) {
        return NextResponse.json({error: error instanceof Error ? error.message : 'Los datos comerciales no son válidos'}, {status: 422})
      }
    } else if (moldType === 4) {
      const requestedIds = Array.isArray(body.salidaIds) ? body.salidaIds.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/iu.test(id)).slice(0, 4) : [salidaId]
      const ids = [...new Set(requestedIds.includes(salidaId) ? requestedIds : [salidaId, ...requestedIds])].slice(0, 4)
      const {data: scheduleRows, error: scheduleError} = await admin.from('salidas').select('*').in('id', ids).eq('user_id', typedSalida.user_id)
      if (scheduleError) return NextResponse.json({error: scheduleError.message}, {status: 500})
      const byId = new Map((scheduleRows ?? []).map(item => [item.id, item as Salida]))
      try {
        content = buildBannerMolde4({salidas: ids.flatMap(id => byId.get(id) ? [byId.get(id) as Salida] : []), cta: typeof body.cta === 'string' ? body.cta : 'Elegí tu próximo viaje', typographyId: 'Inter'})
      } catch (error) {
        return NextResponse.json({error: error instanceof Error ? error.message : 'Las salidas de agenda no son válidas'}, {status: 422})
      }
    } else if (moldType === 5) {
      try {
        content = buildBannerMolde5({salida: typedSalida, cta: typeof body.cta === 'string' ? body.cta : 'Pedí el itinerario', typographyId: 'Playfair Display'})
      } catch (error) {
        return NextResponse.json({error: error instanceof Error ? error.message : 'Los detalles de agencia no son válidos'}, {status: 422})
      }
    } else {
      const result = await runBannerMolde6({...common, mensajeMaxCharacters: 80, convocatoriaMaxCharacters: 60, generateMensaje: generateVideoFamilia3, generateConvocatoria: generateBannerMolde6Convocatoria})
      if (!result.ok) return NextResponse.json({error: result.error}, {status: 422})
      content = result.content
    }

    const insertRow = mapBannerContentToInsertRow({
      salidaId,
      userId: salida.user_id,
      content,
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
