import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listRenderSlides, downloadFileContent } from '@/lib/google-drive'
import { ZipArchive } from 'archiver'
import { PassThrough } from 'node:stream'

export const maxDuration = 60

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('No autorizado', { status: 401 })

    const { folderId } = await params
    const slides = await listRenderSlides(folderId)

    if (slides.length === 0) {
      return new NextResponse('Sin slides', { status: 404 })
    }

    // Descargar todos los slides en paralelo
    const files = await Promise.all(
      slides.map(async s => {
        const { buffer, contentType } = await downloadFileContent(s.fileId)
        return { name: s.name, buffer, contentType }
      }),
    )

    // Construir ZIP usando ZipArchive (archiver v8 — la clase concreta, no la base)
    const pass    = new PassThrough()
    const archive = new ZipArchive({ zlib: { level: 6 } })
    archive.pipe(pass)

    for (const f of files) {
      archive.append(f.buffer, { name: f.name })
    }

    archive.finalize()

    // Colectar chunks en un Buffer
    const chunks: Buffer[] = []
    for await (const chunk of pass) {
      chunks.push(chunk as Buffer)
    }
    const zipBuffer = Buffer.concat(chunks)

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="carrusel_${folderId}.zip"`,
      },
    })
  } catch (err) {
    console.error('[RENDERS/ZIP]', err)
    return new NextResponse('Error al generar zip', { status: 500 })
  }
}
