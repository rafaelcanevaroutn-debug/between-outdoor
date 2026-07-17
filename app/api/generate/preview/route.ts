import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { generateAdaptiveCarrusel, type HolidayInput } from '@/lib/generators/carrusel-formato'
import type { ClientOnboarding, Niche, ObjetivoInteraccion, Salida } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREVIEW_FORMATS = new Set([
  'organico',
  'itinerario',
  'ascenso',
  'calendario',
  'lugar',
  'conversacion',
] as const)

const PREVIEW_OBJECTIVES = new Set<ObjetivoInteraccion>([
  'comentar',
  'guardar',
  'compartir',
  'convertir',
])

type PreviewFormat = 'organico' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar' | 'conversacion'

interface PreviewRequestBody {
  salidaId?: unknown
  formato?: unknown
  formatoCarrusel?: unknown
  objetivo?: unknown
  sourcePastSalidaId?: unknown
  futureRelatedSalidaId?: unknown
  calendarSalidaIds?: unknown
  calendarHolidayDates?: unknown
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function safeTokenMatch(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function isLocalDevTokenAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  return safeTokenMatch(request.headers.get('x-preview-token'), process.env.PREVIEW_DEV_TOKEN?.trim())
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function uniqueStrings(value: unknown, limit?: number): string[] {
  if (!Array.isArray(value)) return []
  const strings = [...new Set(value.map(stringOrNull).filter((item): item is string => Boolean(item)))]
  return typeof limit === 'number' ? strings.slice(0, limit) : strings
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_COPY_PREVIEW !== 'true') {
    return json({ error: 'Preview de copy deshabilitado.' }, 404)
  }

  try {
    const devTokenAuthorized = isLocalDevTokenAuthorized(request)
    let authenticatedUserId: string | null = null

    if (!devTokenAuthorized) {
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return json({ error: 'No autorizado.' }, 401)
      authenticatedUserId = user.id
    }

    const body = await request.json() as PreviewRequestBody
    const salidaId = stringOrNull(body.salidaId)
    const formato = stringOrNull(body.formato)
    const formatoCarrusel = stringOrNull(body.formatoCarrusel)
    const objetivo = stringOrNull(body.objetivo)

    if (!salidaId) return json({ error: 'salidaId requerido.' }, 400)
    if (formato !== 'carrusel') return json({ error: 'Preview solo admite formato "carrusel".' }, 400)
    if (!formatoCarrusel || !PREVIEW_FORMATS.has(formatoCarrusel as PreviewFormat)) {
      return json({ error: 'formatoCarrusel inválido para preview.' }, 400)
    }
    if (!objetivo || !PREVIEW_OBJECTIVES.has(objetivo as ObjetivoInteraccion)) {
      return json({ error: 'objetivo debe ser comentar, guardar, compartir o convertir.' }, 400)
    }

    const admin = createAdminClient()
    const { data: salidaRow, error: salidaError } = await admin
      .from('salidas')
      .select('*')
      .eq('id', salidaId)
      .single()

    if (salidaError || !salidaRow) return json({ error: 'Salida no encontrada.' }, 404)
    const salida = salidaRow as Salida

    if (authenticatedUserId) {
      const { data: callerProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', authenticatedUserId)
        .single()
      if (callerProfile?.role !== 'admin' && salida.user_id !== authenticatedUserId) {
        return json({ error: 'No autorizado para previsualizar esta salida.' }, 403)
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    const [ownerProfileResult, onboardingResult, brandResult] = await Promise.all([
      admin.from('profiles').select('company_name, full_name, niche').eq('id', salida.user_id).single(),
      admin.from('client_onboarding').select('*').eq('user_id', salida.user_id).maybeSingle(),
      admin.from('brand_identity').select('mati_cliente_id').eq('user_id', salida.user_id).maybeSingle(),
    ])

    if (ownerProfileResult.error || !ownerProfileResult.data) {
      return json({ error: 'Perfil del cliente no encontrado.' }, 404)
    }

    let sourcePastSalida: Salida | null = null
    let futureRelatedSalida: Salida | null = null
    let futureSalidas: Salida[] = []
    let holidays: HolidayInput[] = []

    const sourcePastSalidaId = stringOrNull(body.sourcePastSalidaId)
    if (sourcePastSalidaId) {
      const { data: sourcePast } = await admin.from('salidas').select('*').eq('id', sourcePastSalidaId).single()
      if (!sourcePast || sourcePast.user_id !== salida.user_id || (sourcePast.fecha_inicio >= today && sourcePast.estado !== 'completada')) {
        return json({ error: 'La salida pasada seleccionada no es válida.' }, 400)
      }
      sourcePastSalida = sourcePast as Salida
    }

    const futureRelatedSalidaId = stringOrNull(body.futureRelatedSalidaId)
    if (futureRelatedSalidaId) {
      const { data: futureRelated } = await admin.from('salidas').select('*').eq('id', futureRelatedSalidaId).single()
      if (!futureRelated || futureRelated.user_id !== salida.user_id || futureRelated.fecha_inicio < today || futureRelated.estado === 'completada') {
        return json({ error: 'La salida futura seleccionada no es válida.' }, 400)
      }
      futureRelatedSalida = futureRelated as Salida
    }

    if (formatoCarrusel === 'calendario') {
      const [{ data: futureRows }, { data: holidayRows }] = await Promise.all([
        admin.from('salidas').select('*').eq('user_id', salida.user_id).eq('pais_codigo', salida.pais_codigo ?? 'AR').gte('fecha_inicio', today).order('fecha_inicio'),
        admin.from('feriados').select('fecha, nombre, tipo, fuente').eq('pais', salida.pais_codigo ?? 'AR').gte('fecha', today).order('fecha'),
      ])
      futureSalidas = (futureRows ?? []) as Salida[]
      holidays = (holidayRows ?? []) as HolidayInput[]

      const requestedSalidaIds = uniqueStrings(body.calendarSalidaIds, 3)
      if (requestedSalidaIds.length > 0) {
        const requested = new Set(requestedSalidaIds)
        futureSalidas = futureSalidas.filter(item => requested.has(item.id))
        if (futureSalidas.length !== requested.size) {
          return json({ error: 'La selección del calendario contiene salidas no válidas.' }, 400)
        }
      } else {
        futureSalidas = futureSalidas.slice(0, 3)
      }

      const requestedHolidayDates = new Set(uniqueStrings(body.calendarHolidayDates))
      holidays = requestedHolidayDates.size > 0
        ? holidays.filter(item => requestedHolidayDates.has(item.fecha))
        : []
    }

    const eligibility = evaluateCarruselEligibility(formatoCarrusel as PreviewFormat, salida, {
      // Preview evalúa únicamente copy: las fotos se consideran disponibles sin consultar Drive.
      hasPhotos: true,
      sourcePastSalidaId: sourcePastSalida?.id ?? null,
      sourcePastHasNarrativeData: Boolean(sourcePastSalida?.itinerario?.trim() || sourcePastSalida?.itinerario_dias?.length),
      futureRelatedSalidaId: futureRelatedSalida?.id ?? null,
      futureSalidasCount: futureSalidas.length,
      holidayCount: holidays.length,
    })

    if (!eligibility.eligible) {
      return json({ error: eligibility.errors.join(' '), eligibility, photosBypassed: true }, 400)
    }

    const ownerProfile = ownerProfileResult.data
    const vozSlugCandidate = brandResult.data?.mati_cliente_id?.trim()
    const vozSlug = vozSlugCandidate && /^[a-z0-9_-]+$/i.test(vozSlugCandidate)
      ? vozSlugCandidate
      : undefined
    const fechaInicio = new Date(`${salida.fecha_inicio}T12:00:00`)
    const mesAnio = fechaInicio.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

    const generated = await generateAdaptiveCarrusel({
      formato: formatoCarrusel as PreviewFormat,
      salida,
      niche: ownerProfile.niche as Niche,
      clientName: ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
      clientOnboarding: (onboardingResult.data as ClientOnboarding | null) ?? null,
      vozSlug,
      objetivo: objetivo as ObjetivoInteraccion,
      carpeta: 'PREVIEW_COPY_ONLY_SIN_FOTOS',
      mesAnio,
      sourcePastSalida,
      futureRelatedSalida,
      futureSalidas,
      holidays,
      imageFiles: [],
    })

    return json({
      preview: true,
      persisted: false,
      matiDispatched: false,
      photosBypassed: true,
      warnings: [
        ...eligibility.warnings,
        'Preview de copy: las indicaciones visuales usan placeholders y no se consultó Drive.',
      ],
      data: generated,
    })
  } catch (error) {
    console.error('[COPY/PREVIEW] Error:', error)
    return json({ error: error instanceof Error ? error.message : 'Error generando el preview.' }, 500)
  }
}
