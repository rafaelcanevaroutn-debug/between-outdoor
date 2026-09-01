import type { Salida, VideoTypographyId } from '@/types'
import {
  createBanner3Content,
  createBanner5Content,
  type Banner3ContentContract,
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

export function verifiedLugarFecha(salida: Salida): { lugar: string; fecha: string } {
  const lugar = resolveVerifiedLugar(salida)
  const fecha = formatVerifiedFecha(salida.fecha_inicio)
  if (!lugar) throw new Error('La salida no tiene destino ni nombre verificado')
  if (!fecha) throw new Error('La salida no tiene fecha de inicio válida')
  return { lugar, fecha }
}

export function verifiedScheduleDeparture(salida: Salida): {lugar: string; fecha: string; precio: string} {
  return {
    ...verifiedLugarFecha(salida),
    precio: `${salida.precio_desde ? 'Desde ' : ''}${currency(salida, salida.precio_usd)}`,
  }
}

function joinOptionalParts(parts: Array<string | undefined>, maxCharacters: number, field: string): string | undefined {
  const value = parts.filter((part): part is string => Boolean(part)).join(' · ')
  if (!value) return undefined
  if (value.length > maxCharacters) {
    throw new Error(`${field} supera ${maxCharacters} caracteres con los datos promocionales cargados`)
  }
  return value
}

function formatPromoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u)
  if (!match) throw new Error('promo_vigencia_hasta debe ser una fecha válida')
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== Number(match[1])
    || date.getUTCMonth() + 1 !== Number(match[2]) || date.getUTCDate() !== Number(match[3])) {
    throw new Error('promo_vigencia_hasta debe ser una fecha válida')
  }
  return `Promo hasta ${new Intl.DateTimeFormat('es-AR', {day: 'numeric', month: 'short', timeZone: 'UTC'}).format(date).replace('.', '')}`
}

function formatVerifiedPromotion(salida: Salida): {
  precio: string
  reserva?: string
  financiacion?: string
  disponibilidad?: string
} {
  const currentPrice = currency(salida, salida.precio_usd)
  if (salida.precio_anterior !== null && salida.precio_anterior !== undefined && salida.precio_anterior <= salida.precio_usd) {
    throw new Error('precio_anterior debe ser mayor que el precio vigente')
  }
  if (salida.precio_efectivo !== null && salida.precio_efectivo !== undefined && salida.precio_efectivo >= salida.precio_usd) {
    throw new Error('precio_efectivo debe ser menor que el precio vigente')
  }
  if (salida.descuento_porcentaje !== null && salida.descuento_porcentaje !== undefined
    && (!Number.isFinite(salida.descuento_porcentaje) || salida.descuento_porcentaje <= 0 || salida.descuento_porcentaje >= 100)) {
    throw new Error('descuento_porcentaje debe ser mayor que 0 y menor que 100')
  }

  const descuento = salida.descuento_porcentaje === null || salida.descuento_porcentaje === undefined
    ? undefined
    : `${new Intl.NumberFormat('es-AR', {maximumFractionDigits: 2}).format(salida.descuento_porcentaje)}% OFF`
  const precio = joinOptionalParts([
    `${salida.precio_desde ? 'Desde ' : ''}${currentPrice}`,
    descuento,
  ], 28, 'precio')!
  const hasPreviousPrice = salida.precio_anterior !== null && salida.precio_anterior !== undefined
  const reserva = joinOptionalParts([
    salida.precio_anterior ? `Antes ${currency(salida, salida.precio_anterior)}` : undefined,
    salida.sena_usd ? `${hasPreviousPrice ? 'Seña' : 'Reserva con'} ${currency(salida, salida.sena_usd)}` : undefined,
  ], 32, 'reserva')
  const financiacion = joinOptionalParts([
    formatVerifiedFinancing(salida),
    salida.precio_efectivo ? `Efectivo ${currency(salida, salida.precio_efectivo)}` : undefined,
  ], 48, 'financiación')
  const availability = formatVerifiedAvailability(salida)
  const promoDate = formatPromoDate(salida.promo_vigencia_hasta)
  const disponibilidad = joinOptionalParts([
    promoDate ? availability?.replace(' disponibles', '') : availability,
    availability ? promoDate?.replace('Promo hasta ', 'Promo ') : promoDate,
  ], 32, 'disponibilidad')
  return {precio, reserva, financiacion, disponibilidad}
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
  const promotion = formatVerifiedPromotion(params.salida)
  return createBanner3Content({
    lugar,
    fecha,
    ...promotion,
    cta: params.cta.trim().slice(0, 32),
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
    alojamiento: details.alojamiento.trim().slice(0, 40),
    regimen: details.regimen.trim().slice(0, 32),
    incluye: agencyIncludes(params.salida),
    precio: params.salida.precio_usd > 0
      ? `${params.salida.precio_desde ? 'Desde ' : ''}${currency(params.salida, params.salida.precio_usd)}`
      : undefined,
    cta: params.cta.trim().slice(0, 32),
    typographyId: params.typographyId,
  })
}
