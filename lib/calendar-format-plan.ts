import type { CalendarCode, VideoKnowledgeFormat } from '@/types'
import type { ResolvedSlot } from './calendar-resolver.ts'

export type WeeklyPieceFormat = 'carrusel' | 'banner' | 'video'

export interface PlannedWeeklySlot extends ResolvedSlot {
  formatoContenido: WeeklyPieceFormat
  bannerMolde?: 1 | 2 | 3 | 4 | 5 | 6
  videoSubfamilia?: VideoKnowledgeFormat
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
): PlannedWeeklySlot[] {
  const mix = MIX_BY_CALENDAR[calendarCode]

  return slots.map(slot => {
    if (slot.index === mix.bannerIndex && slot.salidaId) {
      return { ...slot, formatoContenido: 'banner', bannerMolde: mix.bannerMolde }
    }
    if (
      slot.index === mix.videoIndex
      && slot.salidaId
      && salidaIdsConVideo.has(slot.salidaId)
    ) {
      return { ...slot, formatoContenido: 'video', videoSubfamilia: mix.videoSubfamilia }
    }
    return { ...slot, formatoContenido: 'carrusel' }
  })
}

export interface PlannedDynamicWeeklySlot {
  index: number
  label: string
  formatoContenido: WeeklyPieceFormat
  formatoCarrusel?: import('@/types').FormatoCarrusel
  bannerMolde?: 1 | 2 | 3 | 4 | 5 | 6
  videoSubfamilia?: VideoKnowledgeFormat
  salidaId: string | null
  dayOffset: number
  scheduledAt: string
}

/**
 * Genera el plan dinámico fijo de 10 piezas (5 videos + 5 estáticas)
 * distribuidas en una ventana móvil de 7 días (0 = hoy ... 6 = hoy+6).
 */
export function planDynamicWeekly10Pieces(
  salidas: import('@/types').Salida[],
  todayIso?: string,
): PlannedDynamicWeeklySlot[] {
  const today = todayIso ?? new Date().toISOString().slice(0, 10)
  const futuras = salidas
    .filter(s => s.fecha_inicio >= today)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  const proximaFutura = futuras[0] ?? salidas[0] ?? null
  const salidaId = proximaFutura ? proximaFutura.id : null

  const baseDate = new Date(`${today}T12:00:00Z`)
  const getScheduledAt = (dayOffset: number) => {
    const d = new Date(baseDate)
    d.setUTCDate(d.getUTCDate() + dayOffset)
    return d.toISOString()
  }

  return [
    {
      index: 0,
      label: 'Video POV',
      formatoContenido: 'video',
      videoSubfamilia: '3b',
      salidaId,
      dayOffset: 0,
      scheduledAt: getScheduledAt(0),
    },
    {
      index: 1,
      label: 'Descubrimiento',
      formatoContenido: 'carrusel',
      formatoCarrusel: 'organico',
      salidaId,
      dayOffset: 1,
      scheduledAt: getScheduledAt(1),
    },
    {
      index: 2,
      label: 'Video Reflexivo',
      formatoContenido: 'video',
      videoSubfamilia: '3a',
      salidaId,
      dayOffset: 2,
      scheduledAt: getScheduledAt(2),
    },
    {
      index: 3,
      label: 'Banner Destacado',
      formatoContenido: 'banner',
      bannerMolde: 1,
      salidaId,
      dayOffset: 3,
      scheduledAt: getScheduledAt(3),
    },
    {
      index: 4,
      label: 'Video Meme',
      formatoContenido: 'video',
      videoSubfamilia: '3c',
      salidaId,
      dayOffset: 4,
      scheduledAt: getScheduledAt(4),
    },
    {
      index: 5,
      label: 'Autoridad',
      formatoContenido: 'carrusel',
      formatoCarrusel: 'editorial',
      salidaId,
      dayOffset: 5,
      scheduledAt: getScheduledAt(5),
    },
    {
      index: 6,
      label: 'Video Datos',
      formatoContenido: 'video',
      videoSubfamilia: '1c',
      salidaId,
      dayOffset: 6,
      scheduledAt: getScheduledAt(6),
    },
    {
      index: 7,
      label: 'Banner Promocional',
      formatoContenido: 'banner',
      bannerMolde: 1,
      salidaId,
      dayOffset: 1,
      scheduledAt: getScheduledAt(1),
    },
    {
      index: 8,
      label: 'Video Señal',
      formatoContenido: 'video',
      videoSubfamilia: '1b',
      salidaId,
      dayOffset: 3,
      scheduledAt: getScheduledAt(3),
    },
    {
      index: 9,
      label: 'Itinerario',
      formatoContenido: 'carrusel',
      formatoCarrusel: 'itinerario',
      salidaId,
      dayOffset: 5,
      scheduledAt: getScheduledAt(5),
    },
  ]
}
