import { CheckCircle2, XCircle, Clock, ExternalLink, Image as ImageIcon, Sparkles, AlertTriangle } from 'lucide-react'
import CreativeTemplateActions from '@/components/admin/CreativeTemplateActions'
import type { CreativeTemplateStatus } from '@/lib/creative-lab/template-contract'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface TemplateRow {
  id: string
  template_id: string
  version: string
  piece_type: string
  mold_type: number | null
  width: number
  height: number
  variant: string
  status: CreativeTemplateStatus
  preview_storage_path: string | null
  source_model: string | null
  critique_summary: string | null
  stress_tested_at: string | null
  stress_test_passed: boolean
  stress_test_error: string | null
  created_at: string
}

const STATUS_CONFIG: Record<
  CreativeTemplateStatus,
  { label: string; badgeClass: string; dotClass: string; statColor: string }
> = {
  experimental: {
    label: 'En revisión',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    statColor: 'text-amber-700',
  },
  approved: {
    label: 'Aprobado',
    badgeClass: 'bg-[var(--cardon-tenue)] text-[var(--cardon)] border-[var(--cardon)]/40',
    dotClass: 'bg-[var(--cardon)]',
    statColor: 'text-[var(--cardon)]',
  },
  rejected: {
    label: 'Rechazado',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    statColor: 'text-rose-600',
  },
  archived: {
    label: 'Archivado',
    badgeClass: 'bg-[var(--blanco-piedra)] text-[var(--piedra)] border-[var(--linea)]',
    dotClass: 'bg-[var(--piedra)]',
    statColor: 'text-[var(--piedra)]',
  },
}

function parseCritique(value: string | null): { rationale?: string; verdict?: string; issues?: string[] } {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : { rationale: value }
  } catch {
    return { rationale: value }
  }
}

function TemplatePreview({
  previewUrl,
  width,
  height,
  title,
}: {
  previewUrl: string | null
  width: number
  height: number
  title: string
}) {
  const previewWidth = 280
  const previewHeight = Math.round(height * (previewWidth / width))
  const preview = (
    <div
      className="relative rounded-xl overflow-hidden border border-[var(--linea)] bg-[var(--blanco-piedra)] flex items-center justify-center transition-all group-hover:border-[var(--piedra-clara)]"
      style={{ width: previewWidth, height: previewHeight }}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={title}
          width={previewWidth}
          height={previewHeight}
          className="w-full h-full object-cover block"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1.5 text-[var(--piedra)] text-xs font-medium p-4 text-center">
          <ImageIcon className="w-6 h-6 stroke-1 text-[var(--piedra)]" />
          <span>PNG pendiente</span>
        </div>
      )}
    </div>
  )

  if (!previewUrl) return preview

  return (
    <div className="flex flex-col gap-2">
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir ${title} en tamaño completo`}
        className="block group"
      >
        {preview}
      </a>
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--piedra)] hover:text-[var(--cardon)] transition-colors"
      >
        <span>Abrir PNG en tamaño completo</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}

export default async function CreativeLabPage() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('template_library')
    .select(
      'id, template_id, version, piece_type, mold_type, width, height, variant, status, preview_storage_path, source_model, critique_summary, stress_tested_at, stress_test_passed, stress_test_error, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  const templates = (data ?? []) as TemplateRow[]
  const previewUrls = new Map<string, string>()
  await Promise.all(
    templates.map(async (template) => {
      if (!template.preview_storage_path) return
      const { data: signed } = await admin.storage
        .from('creative-template-previews')
        .createSignedUrl(template.preview_storage_path, 60 * 15)
      if (signed?.signedUrl) previewUrls.set(template.id, signed.signedUrl)
    })
  )

  const counts = templates.reduce<Record<CreativeTemplateStatus, number>>(
    (result, template) => ({ ...result, [template.status]: result[template.status] + 1 }),
    { experimental: 0, approved: 0, rejected: 0, archived: 0 }
  )

  return (
    <div className="flex flex-col gap-8 max-w-[1200px]">
      {/* Stat Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.keys(STATUS_CONFIG) as CreativeTemplateStatus[]).map((status) => {
          const config = STATUS_CONFIG[status]
          return (
            <div
              key={status}
              className="surface-card bg-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--piedra)]">
                  {config.label}
                </span>
                <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
              </div>
              <div className={`text-3xl font-bold font-display tracking-tight mt-2 ${config.statColor}`}>
                {counts[status]}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">La biblioteca todavía no está disponible en la base de datos.</p>
            <p className="text-xs text-amber-700 mt-1">
              Aplicá la migración 023 para habilitarla. Detalle: {error.message}
            </p>
          </div>
        </div>
      )}

      {!error && templates.length === 0 && (
        <div className="surface-card bg-white rounded-2xl border-dashed border-2 border-[var(--piedra-clara)] p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--blanco-piedra)] flex items-center justify-center text-[var(--piedra)] mb-3">
            <Sparkles className="w-6 h-6 stroke-1 text-[var(--cardon)]" />
          </div>
          <p className="text-base font-bold font-display text-[var(--tinta)]">Todavía no hay candidatos</p>
          <p className="text-sm text-[var(--piedra)] mt-1 max-w-md">
            La primera tanda del laboratorio aparecerá acá para su curaduría y revisión antes de habilitarse para producción.
          </p>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {templates.map((template) => {
          const critique = parseCritique(template.critique_summary)
          const statusConfig = STATUS_CONFIG[template.status]

          return (
            <article
              key={template.id}
              className="surface-card bg-white p-5 rounded-2xl flex flex-col md:grid md:grid-cols-[280px_minmax(0,1fr)] gap-5 transition-all hover:shadow-[var(--sombra-alta)]"
            >
              <TemplatePreview
                previewUrl={previewUrls.get(template.id) ?? null}
                width={template.width}
                height={template.height}
                title={`Vista previa de ${template.template_id}`}
              />

              <div className="min-w-0 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusConfig.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                      {statusConfig.label}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--piedra)]">
                      {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(
                        new Date(template.created_at)
                      )}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-[15px] leading-snug text-[var(--tinta)] tracking-[-0.02em] break-all">
                      {template.template_id}
                    </h3>
                    <p className="text-[11px] font-medium text-[var(--piedra)] mt-1">
                      v{template.version} · Molde {template.mold_type ?? '—'} · {template.width}×{template.height} px
                    </p>
                  </div>

                  {critique.rationale && (
                    <div className="bg-[var(--blanco-piedra)]/70 border border-[var(--linea)] rounded-xl p-3 text-xs leading-relaxed text-[var(--tinta)]">
                      <p className="font-normal text-[var(--tinta)]">{critique.rationale}</p>
                      {critique.issues && critique.issues.length > 0 && (
                        <ul className="mt-2 space-y-1 text-[11px] text-[var(--piedra)] list-disc pl-4">
                          {critique.issues.slice(0, 3).map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Stress test status */}
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {template.stress_test_passed ? (
                      <div className="inline-flex items-center gap-1.5 text-[var(--cardon)] bg-[var(--cardon-tenue)] px-2.5 py-1 rounded-lg border border-[var(--cardon)]/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resiste textos extremos</span>
                      </div>
                    ) : template.stress_tested_at ? (
                      <div className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Prueba extrema fallida
                          {template.stress_test_error ? `: ${template.stress_test_error}` : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Prueba extrema pendiente</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--linea)] flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[11px] text-[var(--piedra)]">
                    <span>
                      Modelo:{' '}
                      <strong className="text-[var(--tinta)] font-medium">
                        {template.source_model ?? 'Origen manual'}
                      </strong>
                    </span>
                    <span>
                      Variante:{' '}
                      <strong className="text-[var(--tinta)] font-medium">
                        {template.variant || 'Default'}
                      </strong>
                    </span>
                  </div>
                  <CreativeTemplateActions
                    id={template.id}
                    currentStatus={template.status}
                    approvalEnabled={template.stress_test_passed}
                  />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

