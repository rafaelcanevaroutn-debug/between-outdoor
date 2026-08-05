import type { CalendarBatchSlotResult } from '@/types'

export function markGeneratedSlotsRenderPending(
  slots: CalendarBatchSlotResult[],
): CalendarBatchSlotResult[] {
  return slots.map(slot => (
    slot.outcome === 'generated' && slot.contenidoId
      ? { ...slot, renderStatus: 'render_pending' }
      : slot
  ))
}

export function reconcileSlotRenderStatuses(
  slots: CalendarBatchSlotResult[],
  renderedContenidoIds: ReadonlySet<string>,
): CalendarBatchSlotResult[] {
  return slots.map(slot => {
    if (slot.outcome !== 'generated' || !slot.contenidoId) return slot

    return {
      ...slot,
      renderStatus: renderedContenidoIds.has(slot.contenidoId) ? 'rendered' : 'render_failed',
    }
  })
}
