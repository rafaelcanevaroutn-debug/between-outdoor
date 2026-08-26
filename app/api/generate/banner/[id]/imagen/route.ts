import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { downloadFileContent } from '@/lib/google-drive'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const admin = createAdminClient()
  const { data: row } = await admin.from('contenido_generado')
    .select('id,user_id,formato,render_status,render_folder_id').eq('id', id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 })
  if (callerProfile?.role !== 'admin' && row.user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (row.formato !== 'banner' || row.render_status !== 'rendered') {
    return NextResponse.json({ error: 'El banner todavía no está renderizado' }, { status: 409 })
  }
  if (!row.render_folder_id) {
    return NextResponse.json({ error: 'El banner no tiene un archivo de render asociado' }, { status: 409 })
  }

  try {
    const { buffer, contentType } = await downloadFileContent(row.render_folder_id)
    const download = request.nextUrl.searchParams.get('download') === '1'
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'image/png',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="banner-${row.id}.png"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    console.error('[BANNER/IMAGE]', error)
    return NextResponse.json({ error: 'No se pudo descargar el PNG desde Drive' }, { status: 502 })
  }
}
