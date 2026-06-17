import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookOpen } from 'lucide-react'
import KnowledgeBaseForm from '@/components/admin/KnowledgeBaseForm'
import type { KnowledgeBase } from '@/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function KnowledgeBasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Allow access for clients too (to view), but show message
  const isAdmin = profile?.role === 'admin'

  const { data: kbItems } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <h1 className="text-xl font-bold" style={{ color: '#F0FFF4' }}>Base de conocimiento</h1>
          </div>
          <p className="text-sm" style={{ color: '#6B8F71' }}>
            Ejemplos de contenido que la IA usa como referencia para generar piezas de calidad
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <p className="text-xs mb-2" style={{ color: '#6B8F71' }}>Total ejemplos</p>
          <p className="text-2xl font-bold" style={{ color: '#F0FFF4' }}>{kbItems?.length || 0}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <p className="text-xs mb-2" style={{ color: '#6B8F71' }}>Activos</p>
          <p className="text-2xl font-bold" style={{ color: '#34D17E' }}>
            {kbItems?.filter(i => i.activo).length || 0}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <p className="text-xs mb-2" style={{ color: '#6B8F71' }}>Nichos cubiertos</p>
          <p className="text-2xl font-bold" style={{ color: '#F0FFF4' }}>
            {new Set(kbItems?.map(i => i.niche)).size || 0}
          </p>
        </div>
      </div>

      {/* Notice for non-admins */}
      {!isAdmin && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
          Solo los administradores pueden agregar o editar ejemplos. Podés ver los ejemplos existentes.
        </div>
      )}

      {/* Content */}
      {isAdmin ? (
        <KnowledgeBaseForm items={(kbItems || []) as KnowledgeBase[]} />
      ) : (
        <div className="flex flex-col gap-3">
          {(kbItems || []).map(item => (
            <div
              key={item.id}
              className="rounded-xl p-5"
              style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#162216', color: '#6B8F71' }}>
                  {item.niche}
                </span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E' }}>
                  {item.vertical}
                </span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#F0FFF4' }}>{item.titulo}</p>
              <p className="text-xs line-clamp-2" style={{ color: '#6B8F71' }}>{item.contenido}</p>
            </div>
          ))}
          {(!kbItems || kbItems.length === 0) && (
            <p className="text-center text-sm py-8" style={{ color: '#6B8F71' }}>Sin ejemplos todavía</p>
          )}
        </div>
      )}
    </div>
  )
}
