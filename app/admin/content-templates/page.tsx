import Link from 'next/link'
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

const STATUS_LABELS: Record<ContentTemplateStatus, string> = {
  borrador: 'Borrador',
  aprobada: 'Aprobada',
  productiva: 'En producción',
}
const STATUS_COLORS: Record<ContentTemplateStatus, string> = {
  borrador: '#fbbf24',
  aprobada: '#60a5fa',
  productiva: '#34D17E',
}
const TYPE_LABELS: Record<ContentTemplateType, string> = {
  video: 'Video',
  carrusel: 'Carrusel',
  banner: 'Banner',
  flyer: 'Flyer',
}
const SCOPE_LABELS: Record<FeedbackScope, string> = { pieza: 'Pieza', familia: 'Familia', motor: 'Motor', run: 'Corrida' }
const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = { open: 'Abierta', in_progress: 'En curso', done: 'Resuelta' }
const SEVERITY_COLORS: Record<FeedbackSeverity, string> = { low: '#7E9286', medium: '#60a5fa', high: '#fbbf24', block: '#fb7185' }

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
  const params = new URLSearchParams({ tab, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) as Record<string, string> })
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
    { borrador: 0, aprobada: 0, productiva: 0 },
  )
  const openFeedback = feedback.filter(item => item.status !== 'done').length
  const blockFeedback = feedback.filter(item => item.status !== 'done' && item.severity === 'block').length

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 1120 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#EAF2EC', letterSpacing: '-.02em', margin: 0 }}>
          Biblioteca de piezas
        </h2>
        <p style={{ fontSize: 13, color: '#7E9286', margin: '3px 0 0' }}>
          Organizá qué diseño y motor puede usar cada pieza. Solo los templates en producción participan de la generación semanal.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <Link
          href={tabHref('piezas')}
          style={{
            fontSize: 13, fontWeight: 700, padding: '10px 4px', textDecoration: 'none',
            color: tab === 'piezas' ? '#EAF2EC' : '#7E9286',
            borderBottom: tab === 'piezas' ? '2px solid #34D17E' : '2px solid transparent',
            marginRight: 20,
          }}
        >
          Piezas
        </Link>
        <Link
          href={tabHref('feedback')}
          style={{
            fontSize: 13, fontWeight: 700, padding: '10px 4px', textDecoration: 'none',
            color: tab === 'feedback' ? '#EAF2EC' : '#7E9286',
            borderBottom: tab === 'feedback' ? '2px solid #34D17E' : '2px solid transparent',
          }}
        >
          Feedback
        </Link>
      </div>

      {tab === 'piezas' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
            {(Object.keys(STATUS_LABELS) as ContentTemplateStatus[]).map(s => (
              <div key={s} style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '13px 15px' }}>
                <div style={{ color: STATUS_COLORS[s], fontSize: 22, fontWeight: 750 }}>{templateCounts[s]}</div>
                <div style={{ color: '#7E9286', fontSize: 11, marginTop: 2 }}>{STATUS_LABELS[s]}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {(['video', 'carrusel', 'banner', 'flyer'] as ContentTemplateType[]).map(t => (
              <Link
                key={t}
                href={tabHref('piezas', { type: type === t ? undefined : t, status })}
                style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '6px 10px', textDecoration: 'none',
                  border: `1px solid ${type === t ? 'rgba(52,209,126,.4)' : 'rgba(255,255,255,.1)'}`,
                  background: type === t ? 'rgba(52,209,126,.12)' : 'transparent',
                  color: type === t ? '#34D17E' : '#A7B5AC',
                }}
              >
                {TYPE_LABELS[t]}
              </Link>
            ))}
          </div>

          {templatesError && (
            <div role="alert" style={{ border: '1px solid rgba(251,191,36,.25)', background: 'rgba(251,191,36,.07)', color: '#fbbf24', borderRadius: 12, padding: 14, fontSize: 13 }}>
              No se pudo leer content_templates. Detalle: {templatesError}
            </div>
          )}

          <ContentTemplateForm />

          {!templatesError && templates.length === 0 && (
            <div style={{ border: '1px dashed rgba(255,255,255,.1)', borderRadius: 16, padding: '54px 24px', textAlign: 'center' }}>
              <p style={{ color: '#EAF2EC', fontSize: 14, fontWeight: 650, margin: 0 }}>Todavía no hay templates</p>
              <p style={{ color: '#7E9286', fontSize: 12, margin: '6px 0 0' }}>Creá el primero arriba.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {templates.map(template => {
              const color = STATUS_COLORS[template.status]
              const verticals = template.content_template_verticals.map(v => v.vertical_key)
              const families = template.content_template_families.map(f => f.family_key)
              return (
                <article key={template.id} style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: 16, display: 'grid', gap: 10 }}>
                  <div>
                    <span style={{ display: 'inline-flex', color, background: `${color}14`, border: `1px solid ${color}38`, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>
                      {STATUS_LABELS[template.status]}
                    </span>
                    <span style={{ display: 'inline-flex', marginLeft: 6, color: '#A7B5AC', background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>
                      {TYPE_LABELS[template.type]}
                    </span>
                    {template.is_main_default && (
                      <span style={{ display: 'inline-flex', marginLeft: 6, color: '#c084fc', background: 'rgba(192,132,252,.1)', borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>
                        MAIN DEFAULT
                      </span>
                    )}
                    <h3 style={{ color: '#EAF2EC', fontSize: 15, margin: '8px 0 2px' }}>{template.name}</h3>
                    <p style={{ color: '#607168', fontSize: 10, margin: 0, fontFamily: 'monospace' }}>{template.generator_key}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#A7B5AC', flexWrap: 'wrap' }}>
                    <span>Peso rotación: {template.rotation_weight}</span>
                    <span>Repeat guard: {template.repeat_guard_window} sem.</span>
                    {verticals.length > 0 && <span>Verticales: {verticals.join(', ')}</span>}
                    {families.length > 0 && <span>Familias: {families.join(', ')}</span>}
                  </div>

                  <ContentTemplateActions id={template.id} currentStatus={template.status} />
                </article>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
            <div style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '13px 15px' }}>
              <div style={{ color: '#fbbf24', fontSize: 22, fontWeight: 750 }}>{openFeedback}</div>
              <div style={{ color: '#7E9286', fontSize: 11, marginTop: 2 }}>Abiertas</div>
            </div>
            <div style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '13px 15px' }}>
              <div style={{ color: '#fb7185', fontSize: 22, fontWeight: 750 }}>{blockFeedback}</div>
              <div style={{ color: '#7E9286', fontSize: 11, marginTop: 2 }}>Bloqueantes abiertas</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {(['pieza', 'familia', 'motor', 'run'] as FeedbackScope[]).map(s => (
                <Link
                  key={s}
                  href={tabHref('feedback', { scope: scope === s ? undefined : s, status })}
                  style={{
                    fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '6px 10px', textDecoration: 'none',
                    border: `1px solid ${scope === s ? 'rgba(52,209,126,.4)' : 'rgba(255,255,255,.1)'}`,
                    background: scope === s ? 'rgba(52,209,126,.12)' : 'transparent',
                    color: scope === s ? '#34D17E' : '#A7B5AC',
                  }}
                >
                  {SCOPE_LABELS[s]}
                </Link>
              ))}
            </div>
            <a
              href="/api/admin/feedback/export"
              target="_blank"
              rel="noreferrer"
              style={{ border: '1px solid rgba(255,255,255,.1)', color: '#A7B5AC', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
            >
              Exportar (markdown)
            </a>
          </div>

          {feedbackError && (
            <div role="alert" style={{ border: '1px solid rgba(251,191,36,.25)', background: 'rgba(251,191,36,.07)', color: '#fbbf24', borderRadius: 12, padding: 14, fontSize: 13 }}>
              No se pudo leer content_feedback. Detalle: {feedbackError}
            </div>
          )}

          <FeedbackForm />

          {!feedbackError && feedback.length === 0 && (
            <div style={{ border: '1px dashed rgba(255,255,255,.1)', borderRadius: 16, padding: '54px 24px', textAlign: 'center' }}>
              <p style={{ color: '#EAF2EC', fontSize: 14, fontWeight: 650, margin: 0 }}>Sin notas todavía</p>
              <p style={{ color: '#7E9286', fontSize: 12, margin: '6px 0 0' }}>Dejá la primera arriba.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {feedback.map(item => (
              <article key={item.id} style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: 14, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: SEVERITY_COLORS[item.severity], background: `${SEVERITY_COLORS[item.severity]}14`, border: `1px solid ${SEVERITY_COLORS[item.severity]}38`, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>
                    {item.severity}
                  </span>
                  <span style={{ color: '#A7B5AC', background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>
                    {FEEDBACK_STATUS_LABELS[item.status]}
                  </span>
                  <span style={{ color: '#607168', fontSize: 10, fontFamily: 'monospace', alignSelf: 'center' }}>{referenceLabel(item)}</span>
                </div>
                <p style={{ color: '#C5D0C8', fontSize: 12, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{item.note}</p>
                <FeedbackActions id={item.id} currentStatus={item.status} />
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
