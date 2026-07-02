import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react'
import ContenidoTable from '@/components/contenido/ContenidoTable'
import RegenerarButton from '@/components/contenido/RegenerarButton'
import type { ContenidoGenerado } from '@/types'
import { VERTICAL_LABELS } from '@/lib/verticals'

export default async function ContenidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: salida }, { data: contenido }, { data: profile }] = await Promise.all([
    supabase.from('salidas').select('*').eq('id', id).single(),
    supabase.from('contenido_generado').select('*').eq('salida_id', id).order('created_at'),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  const { data: branding } = await createAdminClient()
    .from('brand_identity')
    .select('fotos_folder_id')
    .eq('user_id', salida?.user_id ?? '')
    .single()
  const fotosFolderId = branding?.fotos_folder_id ?? null

  if (!salida) notFound()

  if (!contenido || contenido.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/salidas/${id}`}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F0FFF4' }}>Contenido generado</h1>
            <p className="text-sm" style={{ color: '#6B8F71' }}>{salida.nombre}</p>
          </div>
        </div>

        <div
          className="rounded-xl p-16 flex flex-col items-center justify-center text-center"
          style={{ backgroundColor: '#111A11', border: '1px dashed #1E2D1E' }}
        >
          <Sparkles className="w-12 h-12 mb-4" style={{ color: '#1E2D1E' }} />
          <p className="text-base font-semibold mb-2" style={{ color: '#F0FFF4' }}>Sin contenido todavía</p>
          <p className="text-sm mb-6" style={{ color: '#6B8F71' }}>Volvé a la salida y generá el contenido con IA</p>
          <Link
            href={`/salidas/${id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
          >
            <Sparkles className="w-4 h-4" />
            Ir a la salida
          </Link>
        </div>
      </div>
    )
  }

  const editedCount = contenido.filter(c => c.is_edited).length
  const clientName = profile?.company_name || profile?.full_name || 'Cliente'

  // Group by vertical for summary
  const verticalCounts = contenido.reduce((acc, c) => {
    acc[c.vertical] = (acc[c.vertical] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/salidas/${id}`}
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F0FFF4' }}>Contenido generado</h1>
            <p className="text-sm" style={{ color: '#6B8F71' }}>{salida.nombre} · {salida.destino}</p>
          </div>
        </div>
        <RegenerarButton salidaId={id} fotosFolderId={fotosFolderId} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <p className="text-xs mb-2" style={{ color: '#6B8F71' }}>Total piezas</p>
          <p className="text-2xl font-bold" style={{ color: '#F0FFF4' }}>{contenido.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <p className="text-xs mb-2" style={{ color: '#6B8F71' }}>Editadas</p>
          <p className="text-2xl font-bold" style={{ color: '#34D17E' }}>{editedCount}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <p className="text-xs mb-2" style={{ color: '#6B8F71' }}>Verticales</p>
          <p className="text-2xl font-bold" style={{ color: '#F0FFF4' }}>{Object.keys(verticalCounts).length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <p className="text-xs mb-2" style={{ color: '#6B8F71' }}>Mes</p>
          <p className="text-sm font-semibold capitalize" style={{ color: '#F0FFF4' }}>
            {contenido[0]?.mes || '—'}
          </p>
        </div>
      </div>

      {/* Vertical breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(verticalCounts).map(([vertical, count]) => (
          <span
            key={vertical}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
          >
            {VERTICAL_LABELS[vertical as keyof typeof VERTICAL_LABELS] || vertical} · {String(count)}
          </span>
        ))}
      </div>

      {/* Table */}
      <ContenidoTable
        contenido={contenido as ContenidoGenerado[]}
        salidaId={id}
        salidaNombre={salida.nombre}
        clientName={clientName}
        sheetsExportedAt={salida.sheets_exported_at ?? null}
      />
    </div>
  )
}
