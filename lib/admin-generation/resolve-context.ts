import { createAdminClient } from '@/lib/supabase/admin'
import type { ClientOnboarding, Niche, Salida } from '@/types'

export interface AdminGenerationContext {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug: string | undefined
}

export type ResolveContextResult =
  | { ok: true; context: AdminGenerationContext }
  | { ok: false; error: string; status: number }

// Completa los campos de Salida que ningún generador de copy lee (ids de
// carpeta de Drive, timestamps) para que el admin no tenga que tipear los
// ~35 campos de la interfaz — solo los que la salida MOCK necesita para
// ser veraz (destino, fechas, precio, cupos).
function buildMockSalida(input: Partial<Salida>, clienteId: string): { ok: true; salida: Salida } | { ok: false; error: string } {
  if (!input.destino?.trim()) return { ok: false, error: 'La salida MOCK requiere destino' }
  if (!input.fecha_inicio) return { ok: false, error: 'La salida MOCK requiere fecha_inicio' }
  if (typeof input.precio_usd !== 'number') return { ok: false, error: 'La salida MOCK requiere precio_usd' }
  const now = new Date().toISOString()
  const salida: Salida = {
    id: `mock-${Date.now()}`,
    user_id: clienteId,
    nombre: input.nombre?.trim() || input.destino,
    destino: input.destino,
    pais_codigo: input.pais_codigo ?? 'AR',
    fecha_inicio: input.fecha_inicio,
    fecha_fin: input.fecha_fin ?? input.fecha_inicio,
    precio_usd: input.precio_usd,
    sena_usd: input.sena_usd ?? null,
    nivel: input.nivel ?? 'media',
    cupos: input.cupos ?? 10,
    cupos_totales: input.cupos_totales ?? null,
    cupos_disponibles: input.cupos_disponibles ?? null,
    precio_desde: input.precio_desde ?? false,
    precio_anterior: input.precio_anterior ?? null,
    descuento_porcentaje: input.descuento_porcentaje ?? null,
    precio_efectivo: input.precio_efectivo ?? null,
    promo_vigencia_hasta: input.promo_vigencia_hasta ?? null,
    financiacion: input.financiacion ?? null,
    detalles_agencia: input.detalles_agencia ?? null,
    link_inscripcion: input.link_inscripcion ?? null,
    tipo_viaje: input.tipo_viaje ?? 'expedicion_premium',
    itinerario: input.itinerario ?? null,
    itinerario_dias: input.itinerario_dias ?? [],
    puntos_interes: input.puntos_interes ?? [],
    que_incluye: input.que_incluye ?? null,
    que_no_incluye: input.que_no_incluye ?? null,
    estado: input.estado ?? 'activa',
    moneda: input.moneda ?? 'USD',
    dias_semana: input.dias_semana ?? null,
    hora_encuentro: input.hora_encuentro ?? null,
    punto_encuentro: input.punto_encuentro ?? null,
    frecuencia: input.frecuencia ?? null,
    lugares_recurrentes: input.lugares_recurrentes ?? null,
    grupo_info: input.grupo_info ?? null,
    zona_geografica: input.zona_geografica ?? null,
    context_tags: input.context_tags ?? null,
    carpeta_fotos_id: null,
    carpeta_fotos_nombre: null,
    carpeta_videos_id: null,
    carpeta_videos_nombre: null,
    sheets_exported_at: null,
    created_at: now,
    updated_at: now,
  }
  return { ok: true, salida }
}

// Resuelve el contexto de generación (niche/onboarding/branding de un
// cliente real) + la salida (MOCK a mano o REAL de ese cliente), igual que
// hace app/api/generate/route.ts, pero sin insertar nada — el modo admin
// solo necesita estos datos para invocar el mismo generador.
export async function resolveAdminGenerationContext(params: {
  clienteId: string
  salidaId?: string
  mockSalida?: Partial<Salida>
}): Promise<ResolveContextResult> {
  if (!params.clienteId) return { ok: false, error: 'clienteId es requerido', status: 400 }
  const admin = createAdminClient()
  const [{ data: ownerProfile }, { data: onboarding }, { data: brandIdentity }] = await Promise.all([
    admin.from('profiles').select('company_name, full_name, niche').eq('id', params.clienteId).eq('role', 'client').maybeSingle(),
    admin.from('client_onboarding').select('*').eq('user_id', params.clienteId).maybeSingle(),
    admin.from('brand_identity').select('mati_cliente_id').eq('user_id', params.clienteId).maybeSingle(),
  ])
  if (!ownerProfile) return { ok: false, error: 'Cliente no encontrado', status: 404 }

  let salida: Salida
  if (params.salidaId) {
    const { data: realSalida } = await admin
      .from('salidas')
      .select('*')
      .eq('id', params.salidaId)
      .eq('user_id', params.clienteId)
      .maybeSingle()
    if (!realSalida) return { ok: false, error: 'Salida no encontrada para ese cliente', status: 404 }
    salida = realSalida as Salida
  } else if (params.mockSalida) {
    const built = buildMockSalida(params.mockSalida, params.clienteId)
    if (!built.ok) return { ok: false, error: built.error, status: 400 }
    salida = built.salida
  } else {
    return { ok: false, error: 'Se requiere salidaId o una salida MOCK', status: 400 }
  }

  const vozSlugCandidate = brandIdentity?.mati_cliente_id?.trim()
  const vozSlug = vozSlugCandidate && /^[a-z0-9_-]+$/iu.test(vozSlugCandidate) ? vozSlugCandidate : undefined

  return {
    ok: true,
    context: {
      salida,
      niche: ownerProfile.niche as Niche,
      clientName: ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
      clientOnboarding: (onboarding as ClientOnboarding) ?? null,
      vozSlug,
    },
  }
}
