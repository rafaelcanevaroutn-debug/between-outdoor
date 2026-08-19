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

const STATUS_LABELS: Record<CreativeTemplateStatus, string> = {
  experimental: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  archived: 'Archivado',
}

const STATUS_COLORS: Record<CreativeTemplateStatus, string> = {
  experimental: '#fbbf24',
  approved: '#34D17E',
  rejected: '#fb7185',
  archived: '#94a3b8',
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

function TemplatePreview({ previewUrl, width, height, title }: { previewUrl: string | null; width: number; height: number; title: string }) {
  const previewWidth = 280
  const previewHeight = Math.round(height * (previewWidth / width))
  return (
    <div style={{ width: previewWidth, height: previewHeight, overflow: 'hidden', borderRadius: 10, background: '#050805' }}>
      {previewUrl
        ? <img src={previewUrl} alt={title} width={previewWidth} height={previewHeight} style={{display: 'block', width: previewWidth, height: previewHeight, objectFit: 'cover'}} />
        : <div style={{display: 'grid', placeItems: 'center', width: previewWidth, height: previewHeight, color: '#607168', fontSize: 11}}>PNG pendiente</div>}
    </div>
  )
}

export default async function CreativeLabPage() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('template_library')
    .select('id, template_id, version, piece_type, mold_type, width, height, variant, status, preview_storage_path, source_model, critique_summary, stress_tested_at, stress_test_passed, stress_test_error, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const templates = (data ?? []) as TemplateRow[]
  const previewUrls = new Map<string, string>()
  await Promise.all(templates.map(async template => {
    if (!template.preview_storage_path) return
    const {data: signed} = await admin.storage.from('creative-template-previews').createSignedUrl(template.preview_storage_path, 60 * 15)
    if (signed?.signedUrl) previewUrls.set(template.id, signed.signedUrl)
  }))
  const counts = templates.reduce<Record<CreativeTemplateStatus, number>>(
    (result, template) => ({ ...result, [template.status]: result[template.status] + 1 }),
    { experimental: 0, approved: 0, rejected: 0, archived: 0 },
  )

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 1120 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#EAF2EC', letterSpacing: '-.02em', margin: 0 }}>
          Laboratorio creativo
        </h2>
        <p style={{ fontSize: 13, color: '#7E9286', margin: '3px 0 0' }}>
          Revisá los moldes experimentales antes de habilitarlos para producción.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
        {(Object.keys(STATUS_LABELS) as CreativeTemplateStatus[]).map(status => (
          <div key={status} style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ color: STATUS_COLORS[status], fontSize: 22, fontWeight: 750 }}>{counts[status]}</div>
            <div style={{ color: '#7E9286', fontSize: 11, marginTop: 2 }}>{STATUS_LABELS[status]}</div>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ border: '1px solid rgba(251,191,36,.25)', background: 'rgba(251,191,36,.07)', color: '#fbbf24', borderRadius: 12, padding: 14, fontSize: 13 }}>
          La biblioteca todavía no está disponible en la base de datos. Aplicá la migración 023 para habilitarla. Detalle: {error.message}
        </div>
      )}

      {!error && templates.length === 0 && (
        <div style={{ border: '1px dashed rgba(255,255,255,.1)', borderRadius: 16, padding: '54px 24px', textAlign: 'center' }}>
          <p style={{ color: '#EAF2EC', fontSize: 14, fontWeight: 650, margin: 0 }}>Todavía no hay candidatos</p>
          <p style={{ color: '#7E9286', fontSize: 12, margin: '6px 0 0' }}>La primera tanda del laboratorio aparecerá acá para su curaduría.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(480px,1fr))', gap: 14 }}>
        {templates.map(template => {
          const critique = parseCritique(template.critique_summary)
          const color = STATUS_COLORS[template.status]
          return (
            <article key={template.id} style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 16, background: '#0D130E', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: 14 }}>
              <TemplatePreview previewUrl={previewUrls.get(template.id) ?? null} width={template.width} height={template.height} title={`Vista previa de ${template.template_id}`} />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <span style={{ display: 'inline-flex', color, background: `${color}14`, border: `1px solid ${color}38`, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 700 }}>
                    {STATUS_LABELS[template.status]}
                  </span>
                  <h3 style={{ color: '#EAF2EC', fontSize: 14, margin: '9px 0 2px', overflowWrap: 'anywhere' }}>{template.template_id}</h3>
                  <p style={{ color: '#607168', fontSize: 10, margin: 0 }}>v{template.version} · Molde {template.mold_type ?? '—'} · {template.width}×{template.height}</p>
                </div>

                {critique.rationale && <p style={{ color: '#A7B5AC', fontSize: 11, lineHeight: 1.45, margin: 0 }}>{critique.rationale}</p>}
                {critique.issues && critique.issues.length > 0 && (
                  <div style={{ color: '#C5D0C8', fontSize: 10, lineHeight: 1.45 }}>
                    {critique.issues.slice(0, 3).map(issue => <div key={issue}>• {issue}</div>)}
                  </div>
                )}

                <div style={{ color: template.stress_test_passed ? '#34D17E' : template.stress_tested_at ? '#fb7185' : '#fbbf24', fontSize: 10, lineHeight: 1.4 }}>
                  {template.stress_test_passed
                    ? '✓ Resiste textos extremos'
                    : template.stress_tested_at
                      ? `✕ Prueba extrema fallida${template.stress_test_error ? `: ${template.stress_test_error}` : ''}`
                      : '○ Prueba extrema pendiente'}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <p style={{ color: '#526159', fontSize: 10, margin: '0 0 9px' }}>
                    {template.source_model ?? 'Origen manual'} · {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(template.created_at))}
                  </p>
                  <CreativeTemplateActions id={template.id} currentStatus={template.status} approvalEnabled={template.stress_test_passed} />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
