import type {
  AnyGeneratedPiece,
  CalendarBatchSlotResult,
  ClientOnboarding,
  FormatoCarrusel,
  GeneratedAdaptiveCarrusel,
  KnowledgeBase,
  Niche,
  ObjetivoGeneracion,
  ObjetivoInteraccion,
  Salida,
  TikTokIntelligence,
} from '@/types'
import type { ResolvedSlot } from '@/lib/calendar-resolver'
import type { HolidayInput } from '@/lib/generators/carrusel-formato'
import type { CarruselEligibility, CarruselEligibilityContext } from '@/lib/carrusel-eligibility'

/**
 * Resuelve cada slot de la semana a una pieza generada (o a un motivo de
 * por qué no se pudo). Único responsable de la lógica de "seguir ante
 * fallos parciales": nunca aborta el batch por un slot — cada uno se
 * clasifica en 'generated' | 'ineligible' | 'error' | 'sin_salida_disponible'.
 *
 * Sin imports de valor a los generadores reales (Gemini/Drive) a propósito
 * — todo entra por `deps`, así este archivo se puede testear con
 * `node --test` sin arrastrar SDKs externos. `lib/orchestrators/weekly-batch.ts`
 * es quien conecta las implementaciones reales.
 */

export interface GenerateSlotPiecesParams {
  slots: ResolvedSlot[]
  salidasById: Map<string, Salida>
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  /** brand_identity.fotos_folder_id truthy — default de banco de fotos para todo el batch. */
  hasPhotos: boolean
  imageFiles: string[]
  calendarEnrichment: { futureSalidas: Salida[]; holidays: HolidayInput[] } | null
  avoidConversationLinesSeed: string[]
  knowledgeBase: KnowledgeBase[]
  tiktokExamples: TikTokIntelligence[]
  objetivoGeneracion: ObjetivoGeneracion
  antiPatternsText: string
  formatoTexts: { patronesText?: string; storytellingText?: string; reflexionText?: string }
}

export interface SlotPieceOutcome {
  slot: ResolvedSlot
  outcome: CalendarBatchSlotResult['outcome']
  piece?: AnyGeneratedPiece
  reason?: string
}

export interface AdaptiveCarruselCallParams {
  formato: 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar'
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  objetivo: ObjetivoInteraccion
  carpeta: string
  mesAnio: string
  sourcePastSalida?: Salida
  futureSalidas?: Salida[]
  holidays?: HolidayInput[]
  imageFiles?: string[]
  avoidConversationLines?: string[]
  avoidAngles?: string[]
}

export interface GenerateSlotPiecesDeps {
  generateAdaptiveCarrusel: (params: AdaptiveCarruselCallParams) => Promise<GeneratedAdaptiveCarrusel>
  generateContentForSalida: (
    salida: Salida,
    carpetasPorVertical: Partial<Record<string, string>>,
    knowledgeBase: KnowledgeBase[],
    niche: Niche,
    clientName: string,
    tiktokExamples: TikTokIntelligence[],
    objetivo: ObjetivoGeneracion,
    subverticalMap: Partial<Record<string, string>>,
    cantidad: number,
    clientOnboarding: ClientOnboarding | null,
    formato: 'carrusel',
    antiPatternsText: string,
    formatoTexts: { patronesText?: string; storytellingText?: string; reflexionText?: string },
  ) => Promise<AnyGeneratedPiece[]>
  evaluateCarruselEligibility: (
    formato: FormatoCarrusel,
    salida: Salida,
    context?: CarruselEligibilityContext,
  ) => CarruselEligibility
}

export async function generateSlotPieces(
  params: GenerateSlotPiecesParams,
  deps: GenerateSlotPiecesDeps,
): Promise<SlotPieceOutcome[]> {
  const results: SlotPieceOutcome[] = []
  // Confirmado: avoidAngles y avoidConversationLines se acumulan a nivel
  // de TODA la semana, no por formato — más variedad en el paquete final.
  const avoidAngles: string[] = []
  const avoidConversationLines: string[] = [...params.avoidConversationLinesSeed]

  for (const slot of params.slots) {
    if (!slot.salidaId) {
      results.push({ slot, outcome: 'sin_salida_disponible', reason: 'El cliente no tiene una salida cargada para este slot.' })
      continue
    }

    const slotSalida = params.salidasById.get(slot.salidaId)
    if (!slotSalida) {
      results.push({ slot, outcome: 'error', reason: `La salida ${slot.salidaId} asignada por el resolver no existe.` })
      continue
    }

    const isAscenso = slot.formatoCarrusel === 'ascenso'
    const isCalendario = slot.formatoCarrusel === 'calendario'

    const eligibility = deps.evaluateCarruselEligibility(slot.formatoCarrusel, slotSalida, {
      hasPhotos: params.hasPhotos,
      sourcePastSalidaId: isAscenso ? slotSalida.id : undefined,
      sourcePastHasNarrativeData: isAscenso
        ? Boolean(slotSalida.itinerario?.trim() || slotSalida.itinerario_dias?.length)
        : undefined,
      futureRelatedSalidaId: undefined,
      futureSalidasCount: isCalendario ? (params.calendarEnrichment?.futureSalidas.length ?? 0) : undefined,
      holidayCount: isCalendario ? (params.calendarEnrichment?.holidays.length ?? 0) : undefined,
    })

    if (!eligibility.eligible) {
      results.push({ slot, outcome: 'ineligible', reason: eligibility.errors.join(' ') })
      continue
    }

    try {
      const mesAnio = new Date(slotSalida.fecha_inicio).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

      if (slot.formatoCarrusel === 'editorial') {
        const pieces = await deps.generateContentForSalida(
          slotSalida,
          {},
          params.knowledgeBase,
          params.niche,
          params.clientName,
          params.tiktokExamples,
          params.objetivoGeneracion,
          {},
          1,
          params.clientOnboarding,
          'carrusel',
          params.antiPatternsText,
          params.formatoTexts,
        )
        const piece = pieces[0]
        if (!piece) throw new Error('generateContentForSalida no devolvió ninguna pieza para el slot Editorial.')
        results.push({ slot, outcome: 'generated', piece })
        continue
      }

      const piece = await deps.generateAdaptiveCarrusel({
        formato: slot.formatoCarrusel as 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar',
        salida: slotSalida,
        niche: params.niche,
        clientName: params.clientName,
        clientOnboarding: params.clientOnboarding,
        vozSlug: params.vozSlug,
        objetivo: 'convertir',
        carpeta: '',
        mesAnio,
        sourcePastSalida: isAscenso ? slotSalida : undefined,
        futureSalidas: isCalendario ? params.calendarEnrichment?.futureSalidas : undefined,
        holidays: isCalendario ? params.calendarEnrichment?.holidays : undefined,
        imageFiles: params.imageFiles,
        avoidConversationLines: slot.formatoCarrusel === 'conversacion' ? avoidConversationLines : undefined,
        avoidAngles,
      })

      avoidAngles.push(piece.angulo)
      if (slot.formatoCarrusel === 'conversacion') {
        avoidConversationLines.push(...piece.slides.flatMap(s => (s.texto_principal ? [s.texto_principal] : [])))
      }
      results.push({ slot, outcome: 'generated', piece })
    } catch (err) {
      results.push({ slot, outcome: 'error', reason: err instanceof Error ? err.message : String(err) })
    }
  }

  return results
}
