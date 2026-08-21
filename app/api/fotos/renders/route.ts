import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listRenderSlides } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('folderId')

  if (!folderId) {
    return NextResponse.json({ error: 'Falta folderId' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const slides = await listRenderSlides(folderId)
    const urls = slides.map(s => `/api/fotos/thumbnail/${s.fileId}`)
    return NextResponse.json({ urls })
  } catch (error) {
    console.error('[API fotos renders] Error:', error)
    return NextResponse.json({ error: 'Error fetching renders' }, { status: 500 })
  }
}
