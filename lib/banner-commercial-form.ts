import type {Salida} from '../types/index.ts'

export interface BannerCommercialFormValue {
  cupos_totales: string
  cupos_disponibles: string
  precio_desde: boolean
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

export function bannerCommercialPayload(value: BannerCommercialFormValue): Pick<Salida, 'cupos_totales' | 'cupos_disponibles' | 'precio_desde' | 'financiacion' | 'detalles_agencia'> {
  const cuposTotales = optionalNumber(value.cupos_totales, 'Cupos totales', 1)
  const cuposDisponibles = optionalNumber(value.cupos_disponibles, 'Cupos disponibles', 0)
  if (cuposTotales !== undefined && cuposDisponibles !== undefined && cuposDisponibles > cuposTotales) {
    throw new Error('Cupos disponibles no puede superar cupos totales')
  }
  const cuotas = optionalNumber(value.cuotas_maximas, 'Cuotas máximas', 1)
  const cuotaDesde = optionalMoney(value.cuota_desde)
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
