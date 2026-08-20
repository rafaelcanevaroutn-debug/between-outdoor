import type {Salida} from '@/types'
import type {Banner4ContentContract, Banner4DepartureItem} from './banner-content.ts'
import {verifiedScheduleDeparture} from './banner-moldes-commercial.ts'

export const BANNER_MOLDE_4_CAPS = {
  titulo: 36,
  lugar: 32,
  fecha: 24,
  precio: 24,
  cta: 32,
  minSalidas: 2,
  maxSalidas: 4,
} as const

function sameDeparture(actual: Banner4DepartureItem, expected: Banner4DepartureItem): boolean {
  return actual.lugar === expected.lugar && actual.fecha === expected.fecha && actual.precio === expected.precio
}

export function validateBannerMolde4Copy(params: {
  content: Banner4ContentContract
  salidas: Salida[]
}): string[] {
  const errors: string[] = []
  const {content, salidas} = params
  if (salidas.length < BANNER_MOLDE_4_CAPS.minSalidas || salidas.length > BANNER_MOLDE_4_CAPS.maxSalidas) {
    errors.push('Molde 4 requiere entre dos y cuatro salidas verificadas')
  }
  if (content.salidas.length !== salidas.length) {
    errors.push('Molde 4 debe conservar exactamente una fila por salida verificada')
  }
  if (content.titulo.length > BANNER_MOLDE_4_CAPS.titulo) errors.push('título supera el cap de Molde 4')
  if (content.cta.length > BANNER_MOLDE_4_CAPS.cta) errors.push('CTA supera el cap de Molde 4')
  if (/\b(?:quiero viajar|reservar ahora|comprar ahora|ver m[aá]s)\b/iu.test(content.cta)) {
    errors.push('CTA de Molde 4 parece un botón de landing; debe ser una acción natural de Instagram')
  }

  const expected = salidas.map(verifiedScheduleDeparture)
  for (const [index, item] of content.salidas.entries()) {
    if (item.lugar.length > BANNER_MOLDE_4_CAPS.lugar) errors.push(`lugar ${index + 1} supera el cap de Molde 4`)
    if (item.fecha.length > BANNER_MOLDE_4_CAPS.fecha) errors.push(`fecha ${index + 1} supera el cap de Molde 4`)
    if (item.precio.length > BANNER_MOLDE_4_CAPS.precio) errors.push(`precio ${index + 1} supera el cap de Molde 4`)
    if (!expected[index] || !sameDeparture(item, expected[index])) {
      errors.push(`salida ${index + 1} no coincide exactamente con lugar, fecha y precio verificados`)
    }
  }
  if (new Set(salidas.map(salida => salida.id)).size !== salidas.length) {
    errors.push('Molde 4 no admite la misma salida repetida')
  }
  return errors
}
