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
