import {Readable} from 'node:stream'
import {NextRequest, NextResponse} from 'next/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getDriveClient} from '@/lib/google-drive'
import {resolveMetricoolDriveFileIds, verifyMetricoolMediaSignature} from '@/lib/metricool-media'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{contentId: string; index: string}>},
) {
  const {contentId, index: rawIndex} = await params
  const index = Number(rawIndex)
  const signature = request.nextUrl.searchParams.get('signature') ?? ''
  try {
    if (!verifyMetricoolMediaSignature(contentId, index, signature)) {
      return NextResponse.json({error: 'Referencia inválida'}, {status: 403})
    }
  } catch {
    return NextResponse.json({error: 'Referencia inválida'}, {status: 403})
  }

  const admin = createAdminClient()
  const {data: piece, error} = await admin
    .from('contenido_generado')
    .select('id,formato,render_status,render_folder_id,generation_metadata')
    .eq('id', contentId)
    .maybeSingle()
  if (error || !piece) return NextResponse.json({error: 'Contenido no encontrado'}, {status: 404})

  try {
    const fileIds = await resolveMetricoolDriveFileIds(piece)
    const fileId = fileIds[index]
    if (!fileId) return NextResponse.json({error: 'Archivo no encontrado'}, {status: 404})

    const drive = getDriveClient()
    const metadata = await drive.files.get({
      fileId,
      fields: 'name,mimeType,size',
      supportsAllDrives: true,
    })
    const media = await drive.files.get(
      {fileId, alt: 'media', supportsAllDrives: true},
      {responseType: 'stream'},
    )
    const stream = Readable.toWeb(media.data as Readable)
    const headers: Record<string, string> = {
      'Content-Type': metadata.data.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="between-${contentId}-${index}"`,
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
    }
    if (metadata.data.size) headers['Content-Length'] = metadata.data.size
    return new NextResponse(stream as BodyInit, {status: 200, headers})
  } catch (mediaError) {
    console.error('[METRICOOL/MEDIA]', mediaError)
    return NextResponse.json({error: 'No se pudo entregar el archivo'}, {status: 502})
  }
}
