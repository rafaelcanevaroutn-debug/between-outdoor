import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listImagesWithCategories } from '@/lib/google-drive'
import { mapBannerContentToInsertRow } from '@/lib/banner-content-insert'
import { generateWeeklyBannerContent } from '@/lib/orchestrators/weekly-batch'
import type { BrandIdentity, ClientOnboarding, Niche, Profile, Salida } from '@/types'

export const maxDuration = 300

const VALID_MOLDES = new Set([1, 2, 3, 6])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const salidaId = typeof body.salidaId === 'string' ? body.salidaId : ''
    const requestedMolde = Number(body.bannerMolde ?? 1)
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })
    if (!VALID_MOLDES.has(requestedMolde)) {
      return NextResponse.json({ error: 'Estilo de banner inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const [{ data: callerProfile }, { data: salidaRow }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('salidas').select('*').eq('id', salidaId).maybeSingle(),
    ])
    if (!salidaRow) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })
    const salida = salidaRow as Salida
    if (callerProfile?.role !== 'admin' && salida.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para generar contenido de esta salida' }, { status: 403 })
    }
    if (!salida.carpeta_fotos_id) {
      return NextResponse.json({ error: 'Esta salida necesita una carpeta con fotos para crear el banner.' }, { status: 409 })
    }

    const [{ data: profileRow }, { data: onboardingRow }, { data: brandRow }, driveFiles] = await Promise.all([
      admin.from('profiles').select('*').eq('id', salida.user_id).maybeSingle(),
      admin.from('client_onboarding').select('*').eq('user_id', salida.user_id).maybeSingle(),
      admin.from('brand_identity').select('*').eq('user_id', salida.user_id).maybeSingle(),
      listImagesWithCategories(salida.carpeta_fotos_id),
    ])
    if (!profileRow) return NextResponse.json({ error: 'Perfil del cliente no encontrado' }, { status: 404 })
    const background = driveFiles.find(file => file.mimeType.startsWith('image/'))
    if (!background) {
      return NextResponse.json({ error: 'No encontramos una foto utilizable en la carpeta de esta salida.' }, { status: 409 })
    }

    const profile = profileRow as Profile
    const brandIdentity = brandRow as BrandIdentity | null
    const vozCandidate = brandIdentity?.mati_cliente_id?.trim()
    const vozSlug = vozCandidate && /^[a-z0-9_-]+$/iu.test(vozCandidate) ? vozCandidate : undefined
    const bannerMolde = requestedMolde as 1 | 2 | 3 | 6
    const content = await generateWeeklyBannerContent({
      bannerMolde,
      salida,
      niche: profile.niche as Niche,
      clientName: profile.company_name || profile.full_name || 'Cliente',
      clientOnboarding: (onboardingRow as ClientOnboarding | null) ?? null,
      vozSlug,
      carpeta: salida.carpeta_fotos_nombre ?? '',
    })
    const row = mapBannerContentToInsertRow({
      salidaId,
      userId: salida.user_id,
      content,
      backgroundDriveFileId: background.id,
      metadata: { manual_extra: true, requested_banner_molde: bannerMolde },
    })
    const { data: inserted, error } = await admin
      .from('contenido_generado')
      .insert(row)
      .select('id')
      .single()
    if (error || !inserted) throw new Error(error?.message ?? 'No se pudo guardar el banner')

    return NextResponse.json({ success: true, count: 1, ids: [inserted.id] })
  } catch (error) {
    console.error('[BANNER/EXTRA] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo generar el banner' },
      { status: 500 },
    )
  }
}
