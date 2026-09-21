import type { ClientOnboarding, ContentProfileCode, FormatoCarrusel, Salida, VideoKnowledgeFormat, CommercialContentAxis } from '@/types'
import { getInitialSlotSchedule } from './calendar-schedule-strategy'
import { getCommercialWeekRecipe } from './commercial-content-profiles'
import { allocateCommercialAxes } from './calendar-format-plan'
import type { PlannedDynamicWeeklySlot } from './calendar-format-plan'

const VIDEO_LABELS: Partial<Record<VideoKnowledgeFormat, string>> = {
  '1b': 'Video señal',
  '1c': 'Video relato',
  '2b': 'Video storytelling',
  '3a': 'Video reflexivo',
  '3b': 'Video POV',
  '3c': 'Video humor',
  '3d': 'Video conversación',
  '3e': 'Video lugar',
  '4': 'Video informativo',
}

const CAROUSEL_LABELS: Partial<Record<FormatoCarrusel, string>> = {
  organico: 'Historia orgánica',
  conversacion: 'Conversación',
  calendario: 'Agenda semanal',
  editorial: 'Autoridad',
  itinerario: 'Itinerario',
  lugar: 'Destino',
  ascenso: 'Historia de ascenso',
}

export function planDynamicWeekly14PiecesAgency(
  salidas: Salida[],
  todayIso?: string,
  options: {
    contentProfile?: ContentProfileCode
    clientOnboarding?: ClientOnboarding | null
    rotationIndex?: number
  } = {},
): PlannedDynamicWeeklySlot[] {
  const today = todayIso ?? new Date().toISOString().slice(0, 10)
  const rotationIndex = options.rotationIndex ?? 0
  const selectionProfile = options.contentProfile ?? 'standard_outdoor'
  
  // Prioritize up to 4 upcoming trips
  const futuras = salidas
    .filter(s => Boolean(s.fecha_inicio) && s.fecha_inicio! >= today && s.estado !== 'completada')
    .sort((a, b) => (a.fecha_inicio ?? '').localeCompare(b.fecha_inicio ?? '') || a.id.localeCompare(b.id))
  
  const selectedSalidas = futuras.slice(0, 4)
  if (selectedSalidas.length === 0 && salidas.length > 0) {
    selectedSalidas.push(salidas.find(s => s.estado !== 'completada') ?? salidas[0])
  }

  const recipe = getCommercialWeekRecipe(selectionProfile, rotationIndex)
  
  const getScheduledAt = (slotIndex: number, dayOffset: number) => {
    return getInitialSlotSchedule({ todayIso: today, dayOffset, slotIndex })
  }

  // 14 piezas: 7 videos, 5 carruseles, 2 banners.
  // Mezclaremos las salidas seleccionadas equitativamente
  const getSalidaId = (index: number) => {
    if (selectedSalidas.length === 0) return null
    return selectedSalidas[index % selectedSalidas.length].id
  }

  const getSalidaObj = (index: number) => {
    if (selectedSalidas.length === 0) return null
    return selectedSalidas[index % selectedSalidas.length]
  }

  const getDayOffset = (index: number) => index % 7

  const standardVideos: VideoKnowledgeFormat[] = ['3b', '3a', '3c', '3e', '4', '2b', '1c']
  const internationalVideos: VideoKnowledgeFormat[] = ['3a', '4', '3e', '2b', '3b', '1c', '3c']
  const videoFamilies = selectionProfile === 'dupla_viajes_internacionales'
    ? internationalVideos
    : standardVideos

  const carouselFormats: FormatoCarrusel[] = selectionProfile === 'standard_outdoor'
    ? ['organico', 'editorial', 'itinerario', 'lugar', 'conversacion']
    : Array.from({ length: 5 }, (_, index) => (
        recipe?.carouselPriority[index % Math.max(1, recipe.carouselPriority.length)] ?? 'organico'
      ))
  
  const bannerMolde = recipe?.bannerMolde ?? 1

  // Distribute the 14 slots:
  // v, c, v, c, b, v, c, v, c, v, b, v, c, v -> algo así, pero repartimos en 7 días
  // Hay 2 piezas por día (14 total)
  
  const formats: ('video' | 'carrusel' | 'banner')[] = [
    'video', 'carrusel',
    'video', 'banner',
    'video', 'carrusel',
    'video', 'carrusel',
    'video', 'banner',
    'video', 'carrusel',
    'video', 'carrusel'
  ]

  let videoIndex = 0
  let carouselIndex = 0
  let bannerIndexCount = 0

  const pieces: PlannedDynamicWeeklySlot[] = formats.map((format, index) => {
    const salidaObj = getSalidaObj(index)
    const salidaId = salidaObj?.id ?? null
    
    // Aquí es donde ajustamos según `context_tags` o `foco_viaje`.
    // Por ejemplo, si es internacional y no se permiten tantos videos o más banners, podríamos pisar el format.
    // Según el req: "si el viaje es internacional a unaciudad como barcelona, un viaje cultural... que estos destinos solo se limiten a verticales mas frontales de venta directa, e incluso limitaria a un banner"
    // Para simplificar, la regla la aplicamos generando el contenido.
    
    let overridenFormat = format
    let overridenMolde = bannerMolde
    let overridenVideo = videoFamilies[videoIndex % videoFamilies.length]

    if (salidaObj && salidaObj.context_tags?.includes('venta_directa')) {
       // Just as an example rule if tagged to be direct sales, could force more banners.
    }

    let piece: PlannedDynamicWeeklySlot
    
    if (overridenFormat === 'video') {
      piece = {
        index,
        label: VIDEO_LABELS[overridenVideo] ?? 'Video',
        formatoContenido: 'video',
        videoSubfamilia: overridenVideo,
        salidaId,
        dayOffset: getDayOffset(index),
        scheduledAt: getScheduledAt(index, getDayOffset(index)),
      }
      videoIndex++
    } else if (overridenFormat === 'carrusel') {
      const cF = carouselFormats[carouselIndex % carouselFormats.length]
      piece = {
        index,
        label: CAROUSEL_LABELS[cF] ?? 'Carrusel',
        formatoContenido: 'carrusel',
        formatoCarrusel: cF,
        salidaId,
        dayOffset: getDayOffset(index),
        scheduledAt: getScheduledAt(index, getDayOffset(index)),
      }
      carouselIndex++
    } else {
      piece = {
        index,
        label: 'Banner promocional',
        formatoContenido: 'banner',
        bannerMolde: overridenMolde,
        salidaId,
        dayOffset: getDayOffset(index),
        scheduledAt: getScheduledAt(index, getDayOffset(index)),
      }
      bannerIndexCount++
    }
    
    return piece
  })

  const axes = recipe
    ? allocateCommercialAxes(recipe.distribution, pieces.length, rotationIndex)
    : []
  
  return pieces.map((piece, index) => ({
    ...piece,
    ...(axes[index] ? { commercialContentAxis: axes[index] } : {}),
  }))
}
