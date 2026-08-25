import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listRenderSlides } from '@/lib/google-drive'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { folderId } = await params
    const slides = await listRenderSlides(folderId)
    return NextResponse.json({ slides }, {
      headers: {'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'},
    })
  } catch (err) {
    console.error('[RENDERS/SLIDES]', err)
    return NextResponse.json({ error: 'Error al listar slides' }, { status: 500 })
  }
}
