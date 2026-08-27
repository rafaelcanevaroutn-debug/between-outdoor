import type { CalendarCode, CommercialContentAxis, ContentProfileCode, VideoKnowledgeFormat } from '@/types'
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
