import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import { resolveCarruselPreviewFormat } from '@/lib/content-templates-generator-keys'
import type { ClientOnboarding, Niche, ObjetivoInteraccion, Salida } from '@/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

// Preview real solo está resuelto para carrusel hoy — video y banner tienen
// cada generador con requisitos propios (tipografías, canales, carpeta) que
// todavía no están mapeados genéricamente desde generator_key. En vez de
// simular datos y arriesgar un preview engañoso, se devuelve explícito que
// no está soportado.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id } = await context.params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const admin = createAdminClient()
    const { data: template, error: templateError } = await admin
      .from('content_templates')
      .select('id, type, generator_key')
      .eq('id', id)
      .maybeSingle()

    if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 })
    if (!template) return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })

    if (template.type !== 'carrusel') {
      return NextResponse.json({
        preview: true,
        persisted: false,
        supported: false,
        reason: `Preview todavía no soportado para type="${template.type}" — solo carrusel está wireado en esta fase.`,
      })
    }

    const formatoCarrusel = resolveCarruselPreviewFormat(template.generator_key)
    if (!formatoCarrusel) {
      return NextResponse.json({
        preview: true,
        persisted: false,
        supported: false,
        reason: `generator_key "${template.generator_key}" no mapea a un formato de carrusel de preview conocido.`,
      })
    }

    const body = await request.json() as { salidaId?: unknown; objetivo?: unknown }
    const salidaId = stringOrNull(body.salidaId)
    const objetivo = (stringOrNull(body.objetivo) ?? 'convertir') as ObjetivoInteraccion
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido para previsualizar carrusel' }, { status: 400 })

    const { data: salidaRow, error: salidaError } = await admin.from('salidas').select('*').eq('id', salidaId).single()
    if (salidaError || !salidaRow) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })
    const salida = salidaRow as Salida

    const [ownerProfileResult, onboardingResult] = await Promise.all([
      admin.from('profiles').select('company_name, full_name, niche').eq('id', salida.user_id).single(),
      admin.from('client_onboarding').select('*').eq('user_id', salida.user_id).maybeSingle(),
    ])
    if (ownerProfileResult.error || !ownerProfileResult.data) {
      return NextResponse.json({ error: 'Perfil del cliente no encontrado' }, { status: 404 })
    }

    const eligibility = evaluateCarruselEligibility(formatoCarrusel, salida, {
      hasPhotos: true,
      sourcePastSalidaId: null,
      sourcePastHasNarrativeData: false,
      futureRelatedSalidaId: null,
      futureSalidasCount: 0,
      holidayCount: 0,
    })
    if (!eligibility.eligible) {
      return NextResponse.json({ preview: true, persisted: false, supported: true, error: eligibility.errors.join(' '), eligibility, photosBypassed: true }, { status: 400 })
    }

    const ownerProfile = ownerProfileResult.data
    const fechaInicio = new Date(`${salida.fecha_inicio}T12:00:00`)
    const mesAnio = Number.isNaN(fechaInicio.getTime())
      ? 'grupo semanal'
      : fechaInicio.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

    const generated = await generateAdaptiveCarrusel({
      formato: formatoCarrusel,
      salida,
      niche: ownerProfile.niche as Niche,
      clientName: ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
      clientOnboarding: (onboardingResult.data as ClientOnboarding | null) ?? null,
      objetivo,
      carpeta: 'PREVIEW_COPY_ONLY_SIN_FOTOS',
      mesAnio,
      imageFiles: [],
    })

    return NextResponse.json({
      preview: true,
      persisted: false,
      supported: true,
      matiDispatched: false,
      photosBypassed: true,
      warnings: [...eligibility.warnings, 'Preview de copy: sin fotos reales, no se consultó Drive.'],
      data: generated,
    })
  } catch (error) {
    console.error('[CONTENT-TEMPLATES/PREVIEW] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error generando el preview' }, { status: 500 })
  }
}
