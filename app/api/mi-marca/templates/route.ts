import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listTemplatesForClient } from '@/lib/google-drive'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: branding } = await admin
      .from('brand_identity')
      .select('drive_folder_id')
      .eq('user_id', user.id)
      .single()

    const recursosFolderId = process.env.DRIVE_RECURSOS_FOLDER_ID
    if (!recursosFolderId) {
      return NextResponse.json({ error: 'DRIVE_RECURSOS_FOLDER_ID no configurado' }, { status: 500 })
    }

    const files = await listTemplatesForClient(recursosFolderId)
    return NextResponse.json({ templates: files })
  } catch (err) {
    console.error('[TEMPLATES] Error listando Drive:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al listar templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { templates_elegidos } = await request.json()

    if (!Array.isArray(templates_elegidos)) {
      return NextResponse.json({ error: 'templates_elegidos debe ser un array' }, { status: 400 })
    }
    if (templates_elegidos.length > 5) {
      return NextResponse.json({ error: 'Máximo 5 templates' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('brand_identity')
      .update({ templates_elegidos, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
