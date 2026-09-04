import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {cancelZernioPost, ZernioApiError, zernioConfigFromEnv} from '@/lib/zernio'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function DELETE(request: NextRequest, props: {params: Promise<{id: string}>}) {
  const params = await props.params
  const id = params.id
  if (!id) return NextResponse.json({error: 'ID requerido'}, {status: 400})

  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const admin = createAdminClient()
  
  const {data: pub, error: getError} = await admin.from('content_publications')
    .select('id,contenido_id,external_post_id,status,user_id')
    .eq('id', id)
    .single()
    
  if (getError || !pub) {
    return NextResponse.json({error: 'Publicación no encontrada'}, {status: 404})
  }

  if (pub.user_id !== user.id) {
    return NextResponse.json({error: 'No autorizado para cancelar esta publicación'}, {status: 403})
  }

  if (pub.status === 'published' || pub.status === 'cancelled') {
    return NextResponse.json({error: `La publicación ya se encuentra ${pub.status === 'published' ? 'publicada' : 'cancelada'}`}, {status: 400})
  }

  try {
    if (pub.external_post_id) {
      await cancelZernioPost({
        config: zernioConfigFromEnv(),
        postId: pub.external_post_id
      })
    }

    const now = new Date().toISOString()
    await admin.from('content_publications')
      .update({
        status: 'cancelled',
        updated_at: now
      })
      .eq('id', pub.id)
      
    await admin.from('contenido_generado')
      .update({
        scheduled_at: null,
        updated_at: now
      })
      .eq('id', pub.contenido_id)

    return NextResponse.json({success: true})
  } catch (error) {
    console.error('[ZERNIO/PUBLICATIONS/DELETE]', error)
    return NextResponse.json({
      error: error instanceof ZernioApiError ? error.message : 'No se pudo cancelar la publicación'
    }, {status: 502})
  }
}
