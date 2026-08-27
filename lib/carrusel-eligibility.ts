import type { FormatoCarrusel, Salida } from '@/types'

export interface CarruselEligibilityContext {
  hasPhotos?: boolean
  sourcePastSalidaId?: string | null
  sourcePastHasNarrativeData?: boolean
  futureRelatedSalidaId?: string | null
  futureSalidasCount?: number
  holidayCount?: number
}

export interface CarruselEligibility {
  eligible: boolean
  errors: string[]
  warnings: string[]
}

type SalidaForEligibility = Pick<
  Salida,
  'destino' | 'fecha_inicio' | 'fecha_fin' | 'itinerario_dias' | 'puntos_interes'
> & Partial<Pick<Salida, 'tipo_viaje'>>

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

export function evaluateCarruselEligibility(
  formato: FormatoCarrusel,
  salida: SalidaForEligibility,
  context: CarruselEligibilityContext = {},
): CarruselEligibility {
  const errors: string[] = []
  const warnings: string[] = []

  if (!hasText(salida.destino)) errors.push('La salida necesita un destino.')

  switch (formato) {
    case 'editorial':
      break

    case 'organico':
      if (!context.hasPhotos) errors.push('El carrusel orgánico necesita una carpeta con fotos.')
      break

    case 'itinerario': {
      const dias = salida.itinerario_dias ?? []
      if (dias.length === 0) {
        errors.push('Cargá el itinerario día por día antes de generar este formato.')
        break
      }
      dias.forEach((dia, index) => {
        if (!hasText(dia.titulo) || !hasText(dia.descripcion)) {
          errors.push(`El día ${index + 1} necesita título y descripción.`)
        }
      })
      if (context.hasPhotos === false) {
        warnings.push('No hay una carpeta de fotos seleccionada para acompañar cada día.')
      }
      break
    }

    case 'ascenso':
      if (!context.sourcePastSalidaId) errors.push('Seleccioná una salida pasada como fuente del relato.')
      if (context.sourcePastSalidaId && !context.sourcePastHasNarrativeData) {
        errors.push('La salida pasada necesita itinerario o etapas cargadas para narrar hechos reales.')
      }
      if (!context.hasPhotos) errors.push('El carrusel de ascenso necesita fotos cronológicas de la salida pasada.')
      if (!context.futureRelatedSalidaId) {
        warnings.push('Sin una salida futura relacionada, el cierre se generará sin fechas de venta.')
      }
      break

    case 'calendario':
      if (salida.tipo_viaje !== 'salida_recurrente' && (context.futureSalidasCount ?? 0) === 0) {
        errors.push('El cliente necesita al menos una salida futura para generar el calendario.')
      }
      if (salida.tipo_viaje !== 'salida_recurrente' && (context.holidayCount ?? 0) === 0) {
        warnings.push('No hay feriados cargados para el período; solo se mostrarán fechas disponibles.')
      }
      break

    case 'lugar': {
      const puntos = salida.puntos_interes ?? []
      if (puntos.length < 3) {
        errors.push('Cargá al menos 3 puntos de interés verificados antes de generar este formato.')
        break
      }
      puntos.forEach((punto, index) => {
        if (!hasText(punto.nombre) || !hasText(punto.descripcion)) {
          errors.push(`El punto de interés ${index + 1} necesita nombre y descripción.`)
        }
        if (!hasText(punto.fuente)) {
          errors.push(`El punto de interés ${index + 1} necesita una fuente verificable.`)
        }
      })
      if (context.hasPhotos === false) {
        warnings.push('No hay fotos seleccionadas para representar los lugares mencionados.')
      }
      break
    }

    case 'conversacion':
      if (!context.hasPhotos) {
        errors.push('El carrusel conversación necesita imágenes que permitan entender el giro visual.')
      }
      break
  }

  return { eligible: errors.length === 0, errors, warnings }
}
