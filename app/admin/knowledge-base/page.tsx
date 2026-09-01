import { createAdminClient } from '@/lib/supabase/admin'
import { BookOpen, ArrowLeft, Sparkles, Video, CheckCircle2, Bookmark } from 'lucide-react'
import KnowledgeBaseForm from '@/components/admin/KnowledgeBaseForm'
import TikTokScraperSection from '@/components/admin/TikTokScraperSection'
import type { KnowledgeBase, TikTokIntelligence } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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

  const manualCount = kbItems?.length || 0
  const manualActiveCount = kbItems?.filter((i: { activo: boolean }) => i.activo).length || 0
  const tiktokCount = tiktokItems?.length || 0
  const tiktokRefCount = tiktokItems?.filter((i: { es_referencia: boolean }) => i.es_referencia).length || 0

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-xl bg-white border border-[var(--linea)] flex items-center justify-center text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] transition-all shadow-xs shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--cardon)]" />
            <h1 className="font-display font-bold text-xl sm:text-2xl text-[var(--tinta)] tracking-[-0.02em] m-0">
              Base de conocimiento
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--piedra)] mt-0.5">
            Ejemplos de contenido que la IA usa como referencia para generar piezas de calidad.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Ejemplos manuales
            </span>
            <Bookmark className="w-4 h-4 text-[var(--piedra)]" />
          </div>
          <p className="text-3xl font-bold font-display tracking-tight text-[var(--tinta)] mt-2">
            {manualCount}
          </p>
        </div>

        <div className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Activos
            </span>
            <CheckCircle2 className="w-4 h-4 text-[var(--cardon)]" />
          </div>
          <p className="text-3xl font-bold font-display tracking-tight text-[var(--cardon)] mt-2">
            {manualActiveCount}
          </p>
        </div>

        <div className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              Videos TikTok
            </span>
            <Video className="w-4 h-4 text-[var(--piedra)]" />
          </div>
          <p className="text-3xl font-bold font-display tracking-tight text-[var(--tinta)] mt-2">
            {tiktokCount}
          </p>
        </div>

        <div className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
              En referencia motor
            </span>
            <Sparkles className="w-4 h-4 text-[var(--cardon)]" />
          </div>
          <p className="text-3xl font-bold font-display tracking-tight text-[var(--cardon)] mt-2">
            {tiktokRefCount}
          </p>
        </div>
      </div>

      {/* Notice for non-admins */}
      {!isAdmin && (
        <div className="px-4 py-3 rounded-xl text-xs sm:text-sm bg-[var(--blanco-piedra)] border border-[var(--linea)] text-[var(--piedra)]">
          Solo los administradores pueden agregar o editar ejemplos. Podés ver los ejemplos existentes.
        </div>
      )}

      {/* TikTok Intelligence Section */}
      {isAdmin && (
        <TikTokScraperSection initialItems={(tiktokItems || []) as TikTokIntelligence[]} />
      )}

      {/* Divider */}
      {isAdmin && (
        <div className="border-t border-[var(--linea)]" />
      )}

      {/* Manual knowledge base examples */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[var(--cardon)]" />
          <h2 className="font-display font-bold text-lg text-[var(--tinta)] tracking-[-0.02em] m-0">
            Ejemplos manuales de contenido
          </h2>
        </div>
        {isAdmin ? (
          <KnowledgeBaseForm items={(kbItems || []) as KnowledgeBase[]} />
        ) : null}
      </div>

      {/* Non-admin view */}
      {!isAdmin && (
        <div className="flex flex-col gap-3">
          {(kbItems || []).map((item) => (
            <div
              key={item.id}
              className="surface-card bg-white border border-[var(--linea)] rounded-2xl p-5 shadow-[var(--sombra-reposo)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-[var(--blanco-piedra)] text-[var(--piedra)] border border-[var(--linea)]">
                  {item.niche}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase bg-[var(--cardon-tenue)] text-[var(--cardon)] border border-[var(--cardon)]/40">
                  {item.vertical}
                </span>
              </div>
              <p className="text-sm font-semibold mb-1 text-[var(--tinta)] font-display">{item.titulo}</p>
              <p className="text-xs line-clamp-2 text-[var(--piedra)] leading-relaxed">{item.contenido}</p>
            </div>
          ))}
          {(!kbItems || kbItems.length === 0) && (
            <p className="text-center text-sm py-8 text-[var(--piedra)]">Sin ejemplos todavía</p>
          )}
        </div>
      )}
    </div>
  )
}

