import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateLogoUpload } from '@/lib/logo-upload'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('logo') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let validated: ReturnType<typeof validateLogoUpload>
    try {
      validated = validateLogoUpload(buffer, file.type)
    } catch (error) {
      return NextResponse.json({error: error instanceof Error ? error.message : 'Logo inválido'}, {status: 422})
    }
    const admin = createAdminClient()
    const path = `${user.id}/logo.${validated.extension}`

    const { error: uploadError } = await admin.storage
      .from('logos')
      .upload(path, buffer, { contentType: validated.contentType, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('logos').getPublicUrl(path)

    // Cache-bust: append timestamp so browser always shows the latest logo
    const logoUrl = `${publicUrl}?t=${Date.now()}`

    const { error: dbError } = await admin
      .from('brand_identity')
      .upsert(
        { user_id: user.id, logo_url: logoUrl, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ logo_url: logoUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
