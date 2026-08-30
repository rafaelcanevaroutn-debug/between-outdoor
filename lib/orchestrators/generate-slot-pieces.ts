import type {
  AnyGeneratedPiece,
  CalendarBatchSlotResult,
  ClientOnboarding,
  CommercialContentAxis,
  FormatoCarrusel,
  GeneratedAdaptiveCarrusel,
  KnowledgeBase,
  Niche,
  ObjetivoGeneracion,
  ObjetivoInteraccion,
  Salida,
  TikTokIntelligence,
  TemaCarrusel,
  EstructuraNarrativa,
} from '@/types'
import type { ResolvedSlot } from '@/lib/calendar-resolver'
import type { HolidayInput } from '@/lib/generators/carrusel-formato'
import type { CarruselEligibility, CarruselEligibilityContext } from '@/lib/carrusel-eligibility'
import {
  assertCommercialMediaSource,
  projectSalidaForCommercialProfile,
  withCommercialContentAxis,
  withLocalRecurringCtaRotation,
  withSalidaCommercialFacts,
} from '../commercial-content-profiles.ts'

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
  slots: Array<ResolvedSlot & { commercialContentAxis?: CommercialContentAxis }>
  salidasById: Map<string, Salida>
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  hasPhotosBySalidaId: Map<string, boolean>
  imageFilesBySalidaId: Map<string, string[]>
  carpetaNombreBySalidaId: Map<string, string | null>
  calendarEnrichment: { futureSalidas: Salida[]; holidays: HolidayInput[] } | null
  avoidConversationLinesSeed: string[]
  avoidAnglesSeed?: string[]
  knowledgeBase: KnowledgeBase[]
  tiktokExamples: TikTokIntelligence[]
  objetivoGeneracion: ObjetivoGeneracion
  antiPatternsText: string
  formatoTexts: { patronesText?: string; storytellingText?: string; reflexionText?: string }
  editorialBatchIndex?: number
  ctaRotationIndex?: number
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
    piezas?: { tema: TemaCarrusel; estructura: EstructuraNarrativa }[],
    batchIndex?: number,
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
  const avoidAngles: string[] = [...new Set(
    (params.avoidAnglesSeed ?? []).map(angle => angle.trim()).filter(Boolean),
  )]
  const avoidConversationLines: string[] = [...params.avoidConversationLinesSeed]

  for (let slot of params.slots) {
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

    const hasPhotos = params.hasPhotosBySalidaId.get(slotSalida.id) ?? false
    const imageFiles = params.imageFilesBySalidaId.get(slotSalida.id) ?? []
    const carpetaNombre = params.carpetaNombreBySalidaId.get(slotSalida.id) ?? null

    const eligibilityContextFor = (formato: FormatoCarrusel): CarruselEligibilityContext => ({
      hasPhotos,
      sourcePastSalidaId: formato === 'ascenso' ? slotSalida.id : undefined,
      sourcePastHasNarrativeData: formato === 'ascenso'
        ? Boolean(slotSalida.itinerario?.trim() || slotSalida.itinerario_dias?.length)
        : undefined,
      futureRelatedSalidaId: undefined,
      futureSalidasCount: formato === 'calendario' ? (params.calendarEnrichment?.futureSalidas.length ?? 0) : undefined,
      holidayCount: formato === 'calendario' ? (params.calendarEnrichment?.holidays.length ?? 0) : undefined,
    })

    // Diez piezas es innegociable: un formato de carrusel inelegible por
    // datos incompletos (ej. "lugar" sin fuentes verificadas en los puntos
    // de interés) no puede tirar abajo la semana entera. Mismo criterio que
    // ya existe para video (fallback a una familia siempre disponible) —
    // "orgánico" solo pide fotos, y "editorial" no pide nada más que el
    // destino ya validado arriba, así que el fallback siempre resuelve.
    let effectiveFormato = slot.formatoCarrusel
    let eligibility = deps.evaluateCarruselEligibility(effectiveFormato, slotSalida, eligibilityContextFor(effectiveFormato))
    let fallbackReason: string | null = null
    if (!eligibility.eligible && effectiveFormato !== 'organico') {
      fallbackReason = eligibility.errors.join(' ')
      effectiveFormato = 'organico'
      eligibility = deps.evaluateCarruselEligibility(effectiveFormato, slotSalida, eligibilityContextFor(effectiveFormato))
    }
    if (!eligibility.eligible && effectiveFormato !== 'editorial') {
      fallbackReason = fallbackReason ?? eligibility.errors.join(' ')
      effectiveFormato = 'editorial'
      eligibility = deps.evaluateCarruselEligibility(effectiveFormato, slotSalida, eligibilityContextFor(effectiveFormato))
    }

    if (!eligibility.eligible) {
      results.push({ slot, outcome: 'ineligible', reason: eligibility.errors.join(' ') })
      continue
    }
    if (effectiveFormato !== slot.formatoCarrusel) {
      console.warn(`[BATCH/CARRUSEL] Slot ${slot.index}: "${slot.formatoCarrusel}" inelegible (${fallbackReason}) — usando "${effectiveFormato}" en su lugar.`)
    }
    slot = { ...slot, formatoCarrusel: effectiveFormato }

    try {
      const pieceOnboarding = withLocalRecurringCtaRotation(
        withCommercialContentAxis(
          withSalidaCommercialFacts(params.clientOnboarding, slotSalida),
          slot.commercialContentAxis,
        ),
        slotSalida,
        (params.ctaRotationIndex ?? 0) + slot.index,
      )
      assertCommercialMediaSource(carpetaNombre, pieceOnboarding, slotSalida)
      const editorialSalida = projectSalidaForCommercialProfile(slotSalida, pieceOnboarding)
      const mesAnio = slotSalida.tipo_viaje === 'salida_recurrente'
        ? 'grupo semanal'
        : new Date(slotSalida.fecha_inicio).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

      if (slot.formatoCarrusel === 'editorial') {
        const pieces = await deps.generateContentForSalida(
          editorialSalida,
          {},
          params.knowledgeBase,
          params.niche,
          params.clientName,
          params.tiktokExamples,
          params.objetivoGeneracion,
          {},
          1,
          pieceOnboarding,
          'carrusel',
          params.antiPatternsText,
          params.formatoTexts,
          undefined,
          params.editorialBatchIndex,
        )
        const piece = pieces[0]
        if (!piece) throw new Error('generateContentForSalida no devolvió ninguna pieza para el slot Editorial.')
        results.push({ slot, outcome: 'generated', piece })
        continue
      }

      const piece = await deps.generateAdaptiveCarrusel({
        formato: slot.formatoCarrusel as 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar',
        salida: editorialSalida,
        niche: params.niche,
        clientName: params.clientName,
        clientOnboarding: pieceOnboarding,
        vozSlug: params.vozSlug,
        objetivo: 'convertir',
        carpeta: carpetaNombre ?? '',
        mesAnio,
        sourcePastSalida: isAscenso ? slotSalida : undefined,
        futureSalidas: isCalendario ? params.calendarEnrichment?.futureSalidas : undefined,
        holidays: isCalendario ? params.calendarEnrichment?.holidays : undefined,
        imageFiles: imageFiles,
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
