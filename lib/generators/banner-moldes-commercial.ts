import type { Salida, VideoTypographyId } from '@/types'
import {
  createBanner3Content,
  createBanner4Content,
  createBanner5Content,
  type Banner3ContentContract,
  type Banner4ContentContract,
  type Banner5ContentContract,
  type BannerIncludedItem,
} from './banner-content.ts'
import { formatVerifiedFecha, resolveVerifiedLugar } from './banner-salida-fields.ts'

function currency(salida: Salida, amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('La salida requiere un importe positivo y verificado')
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: salida.moneda,
    maximumFractionDigits: 0,
  }).format(amount)
}

function verifiedLugarFecha(salida: Salida): { lugar: string; fecha: string } {
  const lugar = resolveVerifiedLugar(salida)
  const fecha = formatVerifiedFecha(salida.fecha_inicio)
  if (!lugar) throw new Error('La salida no tiene destino ni nombre verificado')
  if (!fecha) throw new Error('La salida no tiene fecha de inicio válida')
  return { lugar, fecha }
}

export function formatVerifiedAvailability(salida: Salida): string | undefined {
  const available = salida.cupos_disponibles ?? salida.cupos
  const total = salida.cupos_totales
  if (!Number.isInteger(available) || available < 0) return undefined
  if (total !== null && total !== undefined) {
    if (!Number.isInteger(total) || total < 1 || available > total) {
      throw new Error('La disponibilidad verificada es inconsistente')
    }
  }
  if (available === 0) return 'Sin cupos disponibles'
  return available === 1 ? '1 cupo disponible' : `${available} cupos disponibles`
}

export function formatVerifiedFinancing(salida: Salida): string | undefined {
  const financing = salida.financiacion
  if (!financing) return undefined
  const description = financing.descripcion_verificada?.trim()
  if (description) return description
  if (financing.cuotas_maximas) {
    if (!Number.isInteger(financing.cuotas_maximas) || financing.cuotas_maximas < 1) {
      throw new Error('cuotas_maximas debe ser un entero positivo')
    }
    return `Hasta ${financing.cuotas_maximas} cuotas${financing.sin_interes ? ' sin interés' : ''}`
  }
  if (financing.cuota_desde) return `Cuotas desde ${currency(salida, financing.cuota_desde)}`
  return undefined
}

export function buildBannerMolde3(params: {
  salida: Salida
  cta: string
  typographyId: VideoTypographyId
}): Banner3ContentContract {
  const { lugar, fecha } = verifiedLugarFecha(params.salida)
  return createBanner3Content({
    lugar,
    fecha,
    precio: `${params.salida.precio_desde ? 'Desde ' : ''}${currency(params.salida, params.salida.precio_usd)}`,
    reserva: params.salida.sena_usd ? `Reserva con ${currency(params.salida, params.salida.sena_usd)}` : undefined,
    financiacion: formatVerifiedFinancing(params.salida),
    disponibilidad: formatVerifiedAvailability(params.salida),
    cta: params.cta,
    typographyId: params.typographyId,
  })
}

export function buildBannerMolde4(params: {
  salidas: Salida[]
  titulo?: string
  cta: string
  typographyId: VideoTypographyId
}): Banner4ContentContract {
  if (params.salidas.length < 2 || params.salidas.length > 4) {
    throw new Error('Molde 4 requiere entre dos y cuatro salidas verificadas')
  }
  return createBanner4Content({
    titulo: params.titulo ?? 'Próximas salidas',
    salidas: params.salidas.map(verifiedLugarFecha),
    cta: params.cta,
    typographyId: params.typographyId,
  })
}

function agencyIncludes(salida: Salida): BannerIncludedItem[] {
  const details = salida.detalles_agencia
  if (!details) return []
  const items: BannerIncludedItem[] = []
  if (details.aereos_incluidos) items.push({icon: 'aereos', label: 'Aéreos'})
  if (details.traslados_incluidos) items.push({icon: 'traslados', label: 'Traslados'})
  if (details.asistencia_viajero_incluida) items.push({icon: 'asistencia', label: 'Asistencia'})
  if (details.alojamiento?.trim()) items.push({icon: 'alojamiento', label: 'Alojamiento'})
  return items
}

export function buildBannerMolde5(params: {
  salida: Salida
  cta: string
  typographyId: VideoTypographyId
}): Banner5ContentContract {
  const { lugar, fecha } = verifiedLugarFecha(params.salida)
  const details = params.salida.detalles_agencia
  if (!details?.noches || !details.alojamiento?.trim() || !details.regimen?.trim()) {
    throw new Error('Molde 5 requiere noches, alojamiento y régimen verificados')
  }
  return createBanner5Content({
    lugar,
    fecha,
    noches: `${details.noches} ${details.noches === 1 ? 'noche' : 'noches'}`,
    alojamiento: details.alojamiento,
    regimen: details.regimen,
    incluye: agencyIncludes(params.salida),
    precio: params.salida.precio_usd > 0
      ? `${params.salida.precio_desde ? 'Desde ' : ''}${currency(params.salida, params.salida.precio_usd)}`
      : undefined,
    cta: params.cta,
    typographyId: params.typographyId,
  })
}
