import type {Salida} from '../types/index.ts'

export interface BannerCommercialFormValue {
  cupos_totales: string
  cupos_disponibles: string
  precio_desde: boolean
  precio_anterior: string
  descuento_porcentaje: string
  precio_efectivo: string
  promo_vigencia_hasta: string
  cuotas_maximas: string
  sin_interes: boolean
  cuota_desde: string
  descripcion_financiacion: string
  noches: string
  alojamiento: string
  regimen: string
  aereos_incluidos: boolean
  traslados_incluidos: boolean
  asistencia_viajero_incluida: boolean
}

export function bannerCommercialFormFromSalida(salida?: Partial<Salida>): BannerCommercialFormValue {
  return {
    cupos_totales: salida?.cupos_totales == null ? '' : String(salida.cupos_totales),
    cupos_disponibles: salida?.cupos_disponibles == null ? '' : String(salida.cupos_disponibles),
    precio_desde: salida?.precio_desde ?? false,
    precio_anterior: salida?.precio_anterior == null ? '' : String(salida.precio_anterior),
    descuento_porcentaje: salida?.descuento_porcentaje == null ? '' : String(salida.descuento_porcentaje),
    precio_efectivo: salida?.precio_efectivo == null ? '' : String(salida.precio_efectivo),
    promo_vigencia_hasta: salida?.promo_vigencia_hasta ?? '',
    cuotas_maximas: salida?.financiacion?.cuotas_maximas == null ? '' : String(salida.financiacion.cuotas_maximas),
    sin_interes: salida?.financiacion?.sin_interes ?? false,
    cuota_desde: salida?.financiacion?.cuota_desde == null ? '' : String(salida.financiacion.cuota_desde),
    descripcion_financiacion: salida?.financiacion?.descripcion_verificada ?? '',
    noches: salida?.detalles_agencia?.noches == null ? '' : String(salida.detalles_agencia.noches),
    alojamiento: salida?.detalles_agencia?.alojamiento ?? '',
    regimen: salida?.detalles_agencia?.regimen ?? '',
    aereos_incluidos: salida?.detalles_agencia?.aereos_incluidos ?? false,
    traslados_incluidos: salida?.detalles_agencia?.traslados_incluidos ?? false,
    asistencia_viajero_incluida: salida?.detalles_agencia?.asistencia_viajero_incluida ?? false,
  }
}

function optionalNumber(value: string, field: string, minimum: number): number | undefined {
  if (!value.trim()) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number < minimum || !Number.isInteger(number)) {
    throw new Error(`${field} debe ser un entero ${minimum === 0 ? 'no negativo' : 'positivo'}`)
  }
  return number
}

function optionalMoney(value: string): number | undefined {
  if (!value.trim()) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new Error('Cuota desde debe ser un importe positivo')
  return number
}

function optionalPositiveMoney(value: string, field: string): number | undefined {
  if (!value.trim()) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${field} debe ser un importe positivo`)
  return number
}

function optionalPercentage(value: string): number | undefined {
  if (!value.trim()) return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0 || number >= 100) {
    throw new Error('Descuento debe ser mayor que 0 y menor que 100')
  }
  return number
}

function optionalDate(value: string): string | undefined {
  const date = value.trim()
  if (!date) return undefined
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/u)
  const parsed = match ? new Date(`${date}T12:00:00Z`) : null
  if (!match || !parsed || Number.isNaN(parsed.getTime())
    || parsed.getUTCFullYear() !== Number(match[1])
    || parsed.getUTCMonth() + 1 !== Number(match[2])
    || parsed.getUTCDate() !== Number(match[3])) {
    throw new Error('Vigencia de promoción debe ser una fecha válida')
  }
  return date
}

export function bannerCommercialPayload(value: BannerCommercialFormValue, options: {precioActual?: number} = {}): Pick<Salida, 'cupos_totales' | 'cupos_disponibles' | 'precio_desde' | 'precio_anterior' | 'descuento_porcentaje' | 'precio_efectivo' | 'promo_vigencia_hasta' | 'financiacion' | 'detalles_agencia'> {
  const cuposTotales = optionalNumber(value.cupos_totales, 'Cupos totales', 1)
  const cuposDisponibles = optionalNumber(value.cupos_disponibles, 'Cupos disponibles', 0)
  if (cuposTotales !== undefined && cuposDisponibles !== undefined && cuposDisponibles > cuposTotales) {
    throw new Error('Cupos disponibles no puede superar cupos totales')
  }
  const cuotas = optionalNumber(value.cuotas_maximas, 'Cuotas máximas', 1)
  const cuotaDesde = optionalMoney(value.cuota_desde)
  const precioAnterior = optionalPositiveMoney(value.precio_anterior, 'Precio anterior')
  const descuentoPorcentaje = optionalPercentage(value.descuento_porcentaje)
  const precioEfectivo = optionalPositiveMoney(value.precio_efectivo, 'Precio efectivo')
  const promoVigenciaHasta = optionalDate(value.promo_vigencia_hasta)
  if (precioAnterior !== undefined && options.precioActual !== undefined && precioAnterior <= options.precioActual) {
    throw new Error('Precio anterior debe ser mayor que el precio vigente')
  }
  if (precioEfectivo !== undefined && options.precioActual !== undefined && precioEfectivo >= options.precioActual) {
    throw new Error('Precio efectivo debe ser menor que el precio vigente')
  }
  const descripcion = value.descripcion_financiacion.trim()
  const financingPresent = cuotas !== undefined || cuotaDesde !== undefined || Boolean(descripcion)
  const noches = optionalNumber(value.noches, 'Noches', 1)
  const alojamiento = value.alojamiento.trim()
  const regimen = value.regimen.trim()
  const agencyPresent = noches !== undefined || Boolean(alojamiento || regimen)
    || value.aereos_incluidos || value.traslados_incluidos || value.asistencia_viajero_incluida

  return {
    cupos_totales: cuposTotales ?? null,
    cupos_disponibles: cuposDisponibles ?? null,
    precio_desde: value.precio_desde,
    precio_anterior: precioAnterior ?? null,
    descuento_porcentaje: descuentoPorcentaje ?? null,
    precio_efectivo: precioEfectivo ?? null,
    promo_vigencia_hasta: promoVigenciaHasta ?? null,
    financiacion: financingPresent ? {
      ...(cuotas !== undefined ? {cuotas_maximas: cuotas} : {}),
      ...(value.sin_interes ? {sin_interes: true} : {}),
      ...(cuotaDesde !== undefined ? {cuota_desde: cuotaDesde} : {}),
      ...(descripcion ? {descripcion_verificada: descripcion} : {}),
    } : null,
    detalles_agencia: agencyPresent ? {
      ...(noches !== undefined ? {noches} : {}),
      ...(alojamiento ? {alojamiento} : {}),
      ...(regimen ? {regimen} : {}),
      ...(value.aereos_incluidos ? {aereos_incluidos: true} : {}),
      ...(value.traslados_incluidos ? {traslados_incluidos: true} : {}),
      ...(value.asistencia_viajero_incluida ? {asistencia_viajero_incluida: true} : {}),
    } : null,
  }
}
