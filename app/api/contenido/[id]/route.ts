import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContenidoGenerado } from '@/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id) {
    return NextResponse.json({ error: 'Falta el ID del contenido' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { descripcion_post, titulo, subtitulo, bullets, cta } = body

    const updatePayload: Partial<ContenidoGenerado> = {}
    if (descripcion_post !== undefined) updatePayload.descripcion_post = descripcion_post
    if (titulo !== undefined) updatePayload.titulo = titulo
    if (subtitulo !== undefined) updatePayload.subtitulo = subtitulo
    if (bullets !== undefined) updatePayload.bullets = bullets
    if (cta !== undefined) updatePayload.cta = cta

    const { data, error } = await supabase
      .from('contenido_generado')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error actualizando contenido:', error)
      return NextResponse.json({ error: 'Error actualizando contenido' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Excepción actualizando contenido:', err)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id) {
    return NextResponse.json({ error: 'Falta el ID del contenido' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('contenido_generado')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando contenido:', error)
      return NextResponse.json({ error: 'Error eliminando contenido' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Excepción eliminando contenido:', err)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
