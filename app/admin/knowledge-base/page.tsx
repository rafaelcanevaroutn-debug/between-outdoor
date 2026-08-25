import { createAdminClient } from '@/lib/supabase/admin'
import { BookOpen } from 'lucide-react'
import KnowledgeBaseForm from '@/components/admin/KnowledgeBaseForm'
import TikTokScraperSection from '@/components/admin/TikTokScraperSection'
import type { KnowledgeBase, TikTokIntelligence } from '@/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function KnowledgeBasePage() {
  const supabase = createAdminClient()
  const isAdmin = true

  const { data: kbItems } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: tiktokItems } = await supabase
    .from('tiktok_intelligence')
    .select('*')
    .order('scrapeado_en', { ascending: false })
    .limit(200)

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)', color: 'var(--piedra)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--tinta)' }}>Base de conocimiento</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--piedra)' }}>
            Ejemplos de contenido que la IA usa como referencia para generar piezas de calidad
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--piedra)' }}>Ejemplos manuales</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--tinta)' }}>{kbItems?.length || 0}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--piedra)' }}>Activos</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--cardon)' }}>
            {kbItems?.filter((i: { activo: boolean }) => i.activo).length || 0}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--piedra)' }}>Videos TikTok</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--tinta)' }}>{tiktokItems?.length || 0}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid rgba(20,184,166,0.3)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--piedra)' }}>En referencia motor</p>
          <p className="text-2xl font-bold" style={{ color: '#14B8A6' }}>
            {tiktokItems?.filter((i: { es_referencia: boolean }) => i.es_referencia).length || 0}
          </p>
        </div>
      </div>

      {/* Notice for non-admins */}
      {!isAdmin && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
          Solo los administradores pueden agregar o editar ejemplos. PodÃ©s ver los ejemplos existentes.
        </div>
      )}

      {/* TikTok Intelligence Section (admin only) */}
      {isAdmin && (
        <TikTokScraperSection initialItems={(tiktokItems || []) as TikTokIntelligence[]} />
      )}

      {/* Divider */}
      {isAdmin && (
        <div style={{ borderTop: '1px solid var(--linea)' }} />
      )}

      {/* Manual knowledge base examples */}
      <div>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--tinta)' }}>Ejemplos manuales de contenido</p>
        {isAdmin ? (
          <KnowledgeBaseForm items={(kbItems || []) as KnowledgeBase[]} />
        ) : null}
      </div>

      {/* Non-admin view */}
      {!isAdmin && (
        <div className="flex flex-col gap-3">
          {(kbItems || []).map(item => (
            <div
              key={item.id}
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--piedra-clara)', color: 'var(--piedra)' }}>
                  {item.niche}
                </span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(62, 92, 72, 0.1)', color: 'var(--cardon)' }}>
                  {item.vertical}
                </span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--tinta)' }}>{item.titulo}</p>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--piedra)' }}>{item.contenido}</p>
            </div>
          ))}
          {(!kbItems || kbItems.length === 0) && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--piedra)' }}>Sin ejemplos todavÃ­a</p>
          )}
        </div>
      )}
    </div>
  )
}
