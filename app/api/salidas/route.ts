import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PREDEFINED_SLOTS } from '@/lib/verticals'
import { createSalidaFolderStructure } from '@/lib/drive-folders'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const admin = createAdminClient()

    // Insert salida
    const { data: salida, error } = await admin
      .from('salidas')
      .insert({ ...body, user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Crear estructura de carpetas en Drive
    let driveResult: Awaited<ReturnType<typeof createSalidaFolderStructure>> | null = null
    try {
      driveResult = await createSalidaFolderStructure(
        salida.nombre,
        salida.destino,
        salida.fecha_inicio,
      )
      console.log(`[SALIDAS] Drive: ${driveResult.subfolders.length} carpetas creadas para "${salida.nombre}"`)
    } catch (driveErr) {
      // Drive falla silenciosamente — la salida se crea igual
      console.error('[SALIDAS] Drive folder creation failed:', driveErr instanceof Error ? driveErr.message : driveErr)
    }

    // Crear material_slots con drive_folder_id si están disponibles
    const folderMap = new Map(driveResult?.subfolders.map(f => [f.slotKey, f]) ?? [])

    const slots = PREDEFINED_SLOTS.map(s => {
      const driveFolder = folderMap.get(s.key)
      return {
        salida_id: salida.id,
        slot_key: s.key,
        slot_label: s.label,
        slot_description: s.description,
        sort_order: s.order,
        ...(driveFolder && {
          drive_folder_id: driveFolder.folderId,
          drive_folder_url: driveFolder.folderUrl,
        }),
      }
    })

    const { error: slotsError } = await admin.from('material_slots').insert(slots)

    if (slotsError) {
      console.warn('[SALIDAS] Slots insert falló con Drive fields, reintentando sin ellos:', slotsError.message)
      const slotsBasic = PREDEFINED_SLOTS.map(s => ({
        salida_id: salida.id,
        slot_key: s.key,
        slot_label: s.label,
        slot_description: s.description,
        sort_order: s.order,
      }))
      await admin.from('material_slots').insert(slotsBasic)
    }

    return NextResponse.json({
      data: salida,
      drive: driveResult
        ? {
            rootFolderId: driveResult.rootFolderId,
            rootFolderUrl: driveResult.rootFolderUrl,
            subfolders: driveResult.subfolders.length,
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear salida' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // RLS filtra automáticamente: cliente ve solo las suyas, admin ve todas
    const { data, error } = await supabase
      .from('salidas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener salidas' }, { status: 500 })
  }
}
