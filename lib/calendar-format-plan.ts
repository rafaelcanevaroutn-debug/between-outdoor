import type { CalendarCode, CommercialContentAxis, ContentProfileCode, FormatoCarrusel, Salida, VideoKnowledgeFormat } from '@/types'
import type { ResolvedSlot } from './calendar-resolver.ts'
import { getCommercialWeekRecipe } from './commercial-content-profiles.ts'

export type WeeklyPieceFormat = 'carrusel' | 'banner' | 'video'

export interface PlannedWeeklySlot extends ResolvedSlot {
  formatoContenido: WeeklyPieceFormat
  bannerMolde?: 1 | 2 | 3 | 4 | 5 | 6
  videoSubfamilia?: VideoKnowledgeFormat
  commercialContentAxis?: CommercialContentAxis
}

export function allocateCommercialAxes(
  distribution: Readonly<Partial<Record<CommercialContentAxis, number>>>,
  count: number,
  rotationIndex = 0,
): CommercialContentAxis[] {
  if (count <= 0) return []
  const entries = (Object.entries(distribution) as Array<[CommercialContentAxis, number]>)
    .filter(([, weight]) => Number.isFinite(weight) && weight > 0)
    .sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return []

  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  const assigned = new Map<CommercialContentAxis, number>(entries.map(([axis]) => [axis, 0]))
  const axes: CommercialContentAxis[] = []

  // Si la semana tiene lugar, representa cada eje al menos una vez. Después
  // completa por déficit contra el porcentaje objetivo (método determinista).
  for (const [axis] of entries.slice(0, Math.min(count, entries.length))) {
    axes.push(axis)
    assigned.set(axis, 1)
  }
  while (axes.length < count) {
    const next = entries
      .map(([axis, weight]) => ({
        axis,
        deficit: (weight / totalWeight) * count - (assigned.get(axis) ?? 0),
        weight,
      }))
      .sort((a, b) => b.deficit - a.deficit || b.weight - a.weight)[0]
    axes.push(next.axis)
    assigned.set(next.axis, (assigned.get(next.axis) ?? 0) + 1)
  }

  const offset = ((rotationIndex % axes.length) + axes.length) % axes.length
  return [...axes.slice(offset), ...axes.slice(0, offset)]
}

function assignAxesToFormats(
  slots: Array<Omit<PlannedWeeklySlot, 'commercialContentAxis'>>,
  axes: CommercialContentAxis[],
  profile: ContentProfileCode,
): PlannedWeeklySlot[] {
  if (axes.length === 0) return slots
  const available = [...axes]
  const assigned = new Map<number, CommercialContentAxis>()
  const takePreferred = (index: number, preferred: CommercialContentAxis[]) => {
    const match = preferred.find(axis => available.includes(axis))
    const selectedIndex = match ? available.indexOf(match) : 0
    const [axis] = available.splice(Math.max(0, selectedIndex), 1)
    if (axis) assigned.set(index, axis)
  }

  const banner = slots.find(slot => slot.formatoContenido === 'banner')
  if (banner) takePreferred(banner.index, ['conversion', 'confianza', 'objeciones'])
  const video = slots.find(slot => slot.formatoContenido === 'video')
  if (video) {
    takePreferred(video.index, profile === 'dupla_viajes_internacionales'
      ? ['personalidad', 'alcance', 'destino', 'objeciones']
      : ['comunidad', 'descubrimiento', 'utilidad', 'conversion'])
  }
  for (const slot of slots) {
    if (!assigned.has(slot.index)) takePreferred(slot.index, [])
  }
  return slots.map(slot => ({ ...slot, commercialContentAxis: assigned.get(slot.index) }))
}

const MIX_BY_CALENDAR: Record<CalendarCode, {
  bannerIndex: number
  bannerMolde: PlannedWeeklySlot['bannerMolde']
  videoIndex: number
  videoSubfamilia: VideoKnowledgeFormat
}> = {
  'CAL-00': { bannerIndex: 1, bannerMolde: 1, videoIndex: 0, videoSubfamilia: '3e' },
  'CAL-01': { bannerIndex: 1, bannerMolde: 2, videoIndex: 0, videoSubfamilia: '3b' },
  // Cumbre usa Ascenso como prueba de trayectoria. El video debe tomar la
  // salida futura (slot 1), y el flyer comercial ocupa el cierre con fecha
  // límite; así no depende del material histórico para llegar al motor.
  'CAL-02': { bannerIndex: 3, bannerMolde: 3, videoIndex: 1, videoSubfamilia: '2b' },
  'CAL-03': { bannerIndex: 0, bannerMolde: 6, videoIndex: 2, videoSubfamilia: '2a' },
  'CAL-04': { bannerIndex: 2, bannerMolde: 6, videoIndex: 1, videoSubfamilia: '3d' },
  'CAL-05': { bannerIndex: 0, bannerMolde: 1, videoIndex: 4, videoSubfamilia: '2c' },
}

/**
 * Convierte la composición editorial existente en una semana multiformato.
 * No agrega piezas ni altera la cadencia: reemplaza un slot por banner y otro
 * por video. Si la salida de ese slot no tiene videos, conserva el carrusel
 * original para que la semana siga completa.
 */
export function planWeeklyFormats(
  calendarCode: CalendarCode,
  slots: ResolvedSlot[],
  salidaIdsConVideo: ReadonlySet<string>,
  options: {
    contentProfile?: ContentProfileCode
    rotationIndex?: number
  } = {},
): PlannedWeeklySlot[] {
  const baseMix = MIX_BY_CALENDAR[calendarCode]
  const recipe = getCommercialWeekRecipe(
    options.contentProfile ?? 'standard_outdoor',
    options.rotationIndex ?? 0,
  )
  const mix = recipe
    ? {
        ...baseMix,
        bannerMolde: recipe.bannerMolde,
        videoSubfamilia: recipe.videoSubfamilia,
      }
    : baseMix
  const isLocalRecurring = options.contentProfile === 'grupo_recurrente_local'
  const localSecondaryVideoSubfamilia: VideoKnowledgeFormat = mix.videoSubfamilia === '4' ? '3b' : '4'
  const localSecondaryVideoIndex = isLocalRecurring
    ? slots.find(slot => (
        slot.index !== mix.bannerIndex
        && slot.index !== mix.videoIndex
        && Boolean(slot.salidaId)
        && salidaIdsConVideo.has(slot.salidaId as string)
      ))?.index
    : undefined
  let carouselIndex = 0
  const axes = recipe
    ? allocateCommercialAxes(recipe.distribution, slots.length, options.rotationIndex ?? 0)
    : []

  const planned = slots.map(slot => {
    if (slot.index === mix.bannerIndex && slot.salidaId) {
      return { ...slot, formatoContenido: 'banner' as const, bannerMolde: mix.bannerMolde }
    }
    if (
      slot.index === mix.videoIndex
      && slot.salidaId
      && salidaIdsConVideo.has(slot.salidaId)
    ) {
      return { ...slot, formatoContenido: 'video' as const, videoSubfamilia: mix.videoSubfamilia }
    }
    if (
      isLocalRecurring
      && slot.index === localSecondaryVideoIndex
      && slot.salidaId
      && salidaIdsConVideo.has(slot.salidaId)
    ) {
      return { ...slot, formatoContenido: 'video' as const, videoSubfamilia: localSecondaryVideoSubfamilia }
    }
    if (recipe && recipe.carouselPriority.length > 0) {
      const formatoCarrusel = recipe.carouselPriority[carouselIndex % recipe.carouselPriority.length]
      carouselIndex += 1
      return { ...slot, formatoContenido: 'carrusel' as const, formatoCarrusel }
    }
    return { ...slot, formatoContenido: 'carrusel' as const }
  })
  return assignAxesToFormats(planned, axes, options.contentProfile ?? 'standard_outdoor')
}

export interface PlannedDynamicWeeklySlot {
  index: number
  label: string
  formatoContenido: WeeklyPieceFormat
  formatoCarrusel?: FormatoCarrusel
  bannerMolde?: 1 | 2 | 3 | 4 | 5 | 6
  videoSubfamilia?: VideoKnowledgeFormat
  salidaId: string | null
  dayOffset: number
  scheduledAt: string
  commercialContentAxis?: CommercialContentAxis
}

const VIDEO_LABELS: Partial<Record<VideoKnowledgeFormat, string>> = {
  '1b': 'Video señal',
  '1c': 'Video relato',
  '2b': 'Video storytelling',
  '3a': 'Video reflexivo',
  '3b': 'Video POV',
  '3c': 'Video humor',
  '3d': 'Video conversación',
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

/**
 * Genera el plan dinámico fijo de 10 piezas (5 videos + 5 estáticas)
 * distribuidas en una ventana móvil de 7 días (0 = hoy ... 6 = hoy+6).
 */
export function planDynamicWeekly10Pieces(
  salidas: Salida[],
  todayIso?: string,
  options: {
    contentProfile?: ContentProfileCode
    rotationIndex?: number
  } = {},
): PlannedDynamicWeeklySlot[] {
  const today = todayIso ?? new Date().toISOString().slice(0, 10)
  const profile = options.contentProfile ?? 'standard_outdoor'
  const rotationIndex = options.rotationIndex ?? 0
  const recipe = getCommercialWeekRecipe(profile, rotationIndex)
  const futuras = salidas
    .filter(s => Boolean(s.fecha_inicio) && s.fecha_inicio >= today && s.estado !== 'completada')
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  const recurrente = salidas.find(s => s.tipo_viaje === 'salida_recurrente' && s.estado !== 'completada')
  const selectedSalida = profile === 'grupo_recurrente_local'
    ? recurrente ?? futuras[0] ?? salidas[0] ?? null
    : futuras[0] ?? salidas.find(s => s.estado !== 'completada') ?? salidas[0] ?? null
  const salidaId = selectedSalida?.id ?? null

  const baseDate = new Date(`${today}T12:00:00Z`)
  const getScheduledAt = (dayOffset: number) => {
    const d = new Date(baseDate)
    d.setUTCDate(d.getUTCDate() + dayOffset)
    return d.toISOString()
  }

  const standardVideos: VideoKnowledgeFormat[] = ['3b', '3a', '3c', '1c', '1b']
  const localVideos: VideoKnowledgeFormat[] = [recipe?.videoSubfamilia ?? '3b', '4', '3b', '3c', '3d']
  const internationalVideos: VideoKnowledgeFormat[] = [recipe?.videoSubfamilia ?? '2b', '2b', '3c', '3d', '4']
  const videoFamilies = profile === 'grupo_recurrente_local'
    ? localVideos
    : profile === 'dupla_viajes_internacionales'
      ? internationalVideos
      : standardVideos
  const carouselFormats: FormatoCarrusel[] = profile === 'standard_outdoor'
    ? ['organico', 'editorial', 'itinerario']
    : Array.from({ length: 3 }, (_, index) => (
        recipe?.carouselPriority[index % Math.max(1, recipe.carouselPriority.length)] ?? 'organico'
      ))
  const bannerMolde = recipe?.bannerMolde ?? 1

  const pieces: PlannedDynamicWeeklySlot[] = [
    {
      index: 0,
      label: VIDEO_LABELS[videoFamilies[0]] ?? 'Video',
      formatoContenido: 'video',
      videoSubfamilia: videoFamilies[0],
      salidaId,
      dayOffset: 0,
      scheduledAt: getScheduledAt(0),
    },
    {
      index: 1,
      label: CAROUSEL_LABELS[carouselFormats[0]] ?? 'Carrusel',
      formatoContenido: 'carrusel',
      formatoCarrusel: carouselFormats[0],
      salidaId,
      dayOffset: 1,
      scheduledAt: getScheduledAt(1),
    },
    {
      index: 2,
      label: VIDEO_LABELS[videoFamilies[1]] ?? 'Video',
      formatoContenido: 'video',
      videoSubfamilia: videoFamilies[1],
      salidaId,
      dayOffset: 2,
      scheduledAt: getScheduledAt(2),
    },
    {
      index: 3,
      label: profile === 'grupo_recurrente_local' ? 'Convocatoria al grupo' : 'Banner destacado',
      formatoContenido: 'banner',
      bannerMolde,
      salidaId,
      dayOffset: 3,
      scheduledAt: getScheduledAt(3),
    },
    {
      index: 4,
      label: VIDEO_LABELS[videoFamilies[2]] ?? 'Video',
      formatoContenido: 'video',
      videoSubfamilia: videoFamilies[2],
      salidaId,
      dayOffset: 4,
      scheduledAt: getScheduledAt(4),
    },
    {
      index: 5,
      label: CAROUSEL_LABELS[carouselFormats[1]] ?? 'Carrusel',
      formatoContenido: 'carrusel',
      formatoCarrusel: carouselFormats[1],
      salidaId,
      dayOffset: 5,
      scheduledAt: getScheduledAt(5),
    },
    {
      index: 6,
      label: VIDEO_LABELS[videoFamilies[3]] ?? 'Video',
      formatoContenido: 'video',
      videoSubfamilia: videoFamilies[3],
      salidaId,
      dayOffset: 6,
      scheduledAt: getScheduledAt(6),
    },
    {
      index: 7,
      label: profile === 'grupo_recurrente_local' ? 'Sumate al grupo' : 'Banner promocional',
      formatoContenido: 'banner',
      bannerMolde,
      salidaId,
      dayOffset: 1,
      scheduledAt: getScheduledAt(1),
    },
    {
      index: 8,
      label: VIDEO_LABELS[videoFamilies[4]] ?? 'Video',
      formatoContenido: 'video',
      videoSubfamilia: videoFamilies[4],
      salidaId,
      dayOffset: 3,
      scheduledAt: getScheduledAt(3),
    },
    {
      index: 9,
      label: CAROUSEL_LABELS[carouselFormats[2]] ?? 'Carrusel',
      formatoContenido: 'carrusel',
      formatoCarrusel: carouselFormats[2],
      salidaId,
      dayOffset: 5,
      scheduledAt: getScheduledAt(5),
    },
  ]

  const axes = recipe
    ? allocateCommercialAxes(recipe.distribution, pieces.length, rotationIndex)
    : []
  return pieces.map((piece, index) => ({
    ...piece,
    ...(axes[index] ? { commercialContentAxis: axes[index] } : {}),
  }))
}
