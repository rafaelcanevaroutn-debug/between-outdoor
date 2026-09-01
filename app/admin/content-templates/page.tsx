import Link from 'next/link'
import { Download, AlertTriangle, Sparkles, MessageSquare, Layers } from 'lucide-react'
import ContentTemplateActions from '@/components/admin/ContentTemplateActions'
import ContentTemplateForm from '@/components/admin/ContentTemplateForm'
import FeedbackActions from '@/components/admin/FeedbackActions'
import FeedbackForm from '@/components/admin/FeedbackForm'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  ContentFeedback,
  ContentTemplate,
  ContentTemplateStatus,
  ContentTemplateType,
  FeedbackScope,
  FeedbackSeverity,
  FeedbackStatus,
} from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<
  ContentTemplateStatus,
  { label: string; badgeClass: string; dotClass: string; statColor: string }
> = {
  borrador: {
    label: 'Borrador',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    statColor: 'text-amber-700',
  },
  aprobada: {
    label: 'Aprobada',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
    statColor: 'text-blue-700',
  },
  productiva: {
    label: 'En producción',
    badgeClass: 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40',
    dotClass: 'bg-[var(--cardon)]',
    statColor: 'text-[var(--cardon)]',
  },
}

const TYPE_LABELS: Record<ContentTemplateType, string> = {
  video: 'Video',
  carrusel: 'Carrusel',
  banner: 'Banner',
  flyer: 'Flyer',
}

const SCOPE_LABELS: Record<FeedbackScope, string> = {
  pieza: 'Pieza',
  familia: 'Familia',
  motor: 'Motor',
  run: 'Corrida',
}

const FEEDBACK_STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; badgeClass: string }
> = {
  open: { label: 'Abierta', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  in_progress: { label: 'En curso', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  done: { label: 'Resuelta', badgeClass: 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40' },
}

const SEVERITY_CONFIG: Record<
  FeedbackSeverity,
  { label: string; badgeClass: string }
> = {
  low: { label: 'Low', badgeClass: 'bg-[var(--blanco-piedra)] text-[var(--piedra)] border-[var(--linea)]' },
  medium: { label: 'Medium', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  high: { label: 'High', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  block: { label: 'Block', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
}

interface TemplateRow extends ContentTemplate {
  content_template_verticals: { vertical_key: string }[]
  content_template_families: { family_key: string }[]
}

function referenceLabel(item: ContentFeedback): string {
  if (item.scope === 'pieza') return `pieza ${item.piece_id}`
  if (item.scope === 'familia') return `familia ${item.family_key}`
  if (item.scope === 'motor') return `motor ${item.generator_key}`
  return `corrida ${item.run_id}`
}

function tabHref(tab: 'piezas' | 'feedback', extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({
    tab,
    ...(Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) as Record<string, string>),
  })
  return `/admin/content-templates?${params.toString()}`
}

export default async function ContentTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string; status?: string; scope?: string }>
}) {
  const { tab: tabParam, type, status, scope } = await searchParams
  const tab = tabParam === 'feedback' ? 'feedback' : 'piezas'
  const admin = createAdminClient()

  let templates: TemplateRow[] = []
  let templatesError: string | null = null
  let feedback: ContentFeedback[] = []
  let feedbackError: string | null = null

  if (tab === 'piezas') {
    let query = admin
      .from('content_templates')
      .select('*, content_template_verticals(vertical_key), content_template_families(family_key)')
      .order('created_at', { ascending: false })
    if (type) query = query.eq('type', type)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    templates = (data ?? []) as TemplateRow[]
    templatesError = error?.message ?? null
  } else {
    let query = admin.from('content_feedback').select('*').order('created_at', { ascending: false })
    if (scope) query = query.eq('scope', scope)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    feedback = (data ?? []) as ContentFeedback[]
    feedbackError = error?.message ?? null
  }

  const templateCounts = templates.reduce<Record<ContentTemplateStatus, number>>(
    (result, template) => ({ ...result, [template.status]: result[template.status] + 1 }),
    { borrador: 0, aprobada: 0, productiva: 0 }
  )
  const openFeedback = feedback.filter((item) => item.status !== 'done').length
  const blockFeedback = feedback.filter(
    (item) => item.status !== 'done' && item.severity === 'block'
  ).length

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-[var(--linea)] pb-px">
        <Link
          href={tabHref('piezas')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all relative ${
            tab === 'piezas'
              ? 'text-[var(--cardon)] font-bold'
              : 'text-[var(--piedra)] hover:text-[var(--tinta)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Piezas</span>
          {tab === 'piezas' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--cardon)] rounded-full" />
          )}
        </Link>

        <Link
          href={tabHref('feedback')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all relative ${
            tab === 'feedback'
              ? 'text-[var(--cardon)] font-bold'
              : 'text-[var(--piedra)] hover:text-[var(--tinta)]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Feedback</span>
          {tab === 'feedback' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--cardon)] rounded-full" />
          )}
        </Link>
      </div>

      {tab === 'piezas' ? (
        <div className="flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.keys(STATUS_CONFIG) as ContentTemplateStatus[]).map((s) => {
              const config = STATUS_CONFIG[s]
              return (
                <div
                  key={s}
                  className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                      {config.label}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                  </div>
                  <div
                    className={`text-3xl font-bold font-display tracking-tight mt-2 ${config.statColor}`}
                  >
                    {templateCounts[s]}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Type Filters & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['video', 'carrusel', 'banner', 'flyer'] as ContentTemplateType[]).map((t) => {
                const isActive = type === t
                return (
                  <Link
                    key={t}
                    href={tabHref('piezas', { type: isActive ? undefined : t, status })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs ${
                      isActive
                        ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40'
                        : 'bg-white text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] border-[var(--linea)]'
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </Link>
                )
              })}
            </div>

            <ContentTemplateForm />
          </div>

          {templatesError && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No se pudo leer content_templates.</p>
                <p className="text-xs text-amber-700 mt-1">Detalle: {templatesError}</p>
              </div>
            </div>
          )}

          {!templatesError && templates.length === 0 && (
            <div className="surface-card bg-white rounded-2xl border-dashed border-2 border-[var(--piedra-clara)] p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[var(--blanco-piedra)] flex items-center justify-center text-[var(--piedra)] mb-3">
                <Sparkles className="w-6 h-6 stroke-1 text-[var(--cardon)]" />
              </div>
              <p className="text-base font-bold font-display text-[var(--tinta)]">Todavía no hay templates</p>
              <p className="text-sm text-[var(--piedra)] mt-1 max-w-md">
                Creá el primero usando el botón superior para empezar a configurar las piezas del generador.
              </p>
            </div>
          )}

          {/* Templates Grid */}
          <div className="grid grid-cols-1 gap-4">
            {templates.map((template) => {
              const statusConfig = STATUS_CONFIG[template.status]
              const verticals = template.content_template_verticals.map((v) => v.vertical_key)
              const families = template.content_template_families.map((f) => f.family_key)

              return (
                <article
                  key={template.id}
                  className="surface-card bg-white p-5 rounded-2xl border border-[var(--linea)] shadow-[var(--sombra-reposo)] transition-all hover:shadow-[var(--sombra-alta)] flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusConfig.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                        {statusConfig.label}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--blanco-piedra)] text-[var(--piedra)] border border-[var(--linea)]">
                        {TYPE_LABELS[template.type]}
                      </span>
                      {template.is_main_default && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          MAIN DEFAULT
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-[16px] leading-snug text-[var(--tinta)] tracking-[-0.02em] m-0">
                        {template.name}
                      </h3>
                      <div className="mt-1">
                        <span className="font-mono text-xs text-[var(--piedra)] bg-[var(--blanco-piedra)] px-2 py-0.5 rounded border border-[var(--linea)]">
                          {template.generator_key}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--piedra)] pt-1">
                      <span className="bg-[var(--blanco-piedra)]/60 px-2.5 py-1 rounded-lg border border-[var(--linea)]">
                        Peso rotación: <strong className="text-[var(--tinta)] font-semibold">{template.rotation_weight}</strong>
                      </span>
                      <span className="bg-[var(--blanco-piedra)]/60 px-2.5 py-1 rounded-lg border border-[var(--linea)]">
                        Repeat guard: <strong className="text-[var(--tinta)] font-semibold">{template.repeat_guard_window} sem.</strong>
                      </span>
                      {verticals.length > 0 && (
                        <span className="bg-[var(--blanco-piedra)]/60 px-2.5 py-1 rounded-lg border border-[var(--linea)]">
                          Verticales: <strong className="text-[var(--tinta)] font-semibold">{verticals.join(', ')}</strong>
                        </span>
                      )}
                      {families.length > 0 && (
                        <span className="bg-[var(--blanco-piedra)]/60 px-2.5 py-1 rounded-lg border border-[var(--linea)]">
                          Familias: <strong className="text-[var(--tinta)] font-semibold">{families.join(', ')}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--linea)]">
                    <ContentTemplateActions id={template.id} currentStatus={template.status} />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Feedback Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  Notas Abiertas
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-3xl font-bold font-display tracking-tight text-amber-700 mt-2">
                {openFeedback}
              </div>
            </div>

            <div className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  Bloqueantes abiertas
                </span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <div className="text-3xl font-bold font-display tracking-tight text-rose-700 mt-2">
                {blockFeedback}
              </div>
            </div>
          </div>

          {/* Scope Filters & Export Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['pieza', 'familia', 'motor', 'run'] as FeedbackScope[]).map((s) => {
                const isActive = scope === s
                return (
                  <Link
                    key={s}
                    href={tabHref('feedback', { scope: isActive ? undefined : s, status })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs ${
                      isActive
                        ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40'
                        : 'bg-white text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] border-[var(--linea)]'
                    }`}
                  >
                    {SCOPE_LABELS[s]}
                  </Link>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/api/admin/feedback/export"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[var(--linea)] text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[var(--piedra)]" />
                <span>Exportar (markdown)</span>
              </a>

              <FeedbackForm />
            </div>
          </div>

          {feedbackError && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No se pudo leer content_feedback.</p>
                <p className="text-xs text-amber-700 mt-1">Detalle: {feedbackError}</p>
              </div>
            </div>
          )}

          {!feedbackError && feedback.length === 0 && (
            <div className="surface-card bg-white rounded-2xl border-dashed border-2 border-[var(--piedra-clara)] p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[var(--blanco-piedra)] flex items-center justify-center text-[var(--piedra)] mb-3">
                <MessageSquare className="w-6 h-6 stroke-1 text-[var(--cardon)]" />
              </div>
              <p className="text-base font-bold font-display text-[var(--tinta)]">Sin notas todavía</p>
              <p className="text-sm text-[var(--piedra)] mt-1 max-w-md">
                Dejá la primera nota de feedback arriba para registrar ajustes o bloqueos.
              </p>
            </div>
          )}

          {/* Feedback List */}
          <div className="grid grid-cols-1 gap-4">
            {feedback.map((item) => {
              const statusCfg = FEEDBACK_STATUS_CONFIG[item.status]
              const severityCfg = SEVERITY_CONFIG[item.severity]

              return (
                <article
                  key={item.id}
                  className="surface-card bg-white p-5 rounded-2xl border border-[var(--linea)] shadow-[var(--sombra-reposo)] transition-all hover:shadow-[var(--sombra-alta)] flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${severityCfg.badgeClass}`}
                      >
                        {severityCfg.label}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <span className="font-mono text-xs text-[var(--piedra)] bg-[var(--blanco-piedra)] px-2 py-0.5 rounded border border-[var(--linea)]">
                      {referenceLabel(item)}
                    </span>
                  </div>

                  <div className="bg-[var(--blanco-piedra)]/60 border border-[var(--linea)] rounded-xl p-3.5 text-xs text-[var(--tinta)] leading-relaxed whitespace-pre-wrap">
                    {item.note}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <FeedbackActions id={item.id} currentStatus={item.status} />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

