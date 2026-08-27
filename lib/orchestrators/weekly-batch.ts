import type {
  AnyGeneratedPiece,
  CalendarBatchResult,
  CalendarBatchSlotResult,
  CalendarCode,
  ClientOnboarding,
  KnowledgeBase,
  Niche,
  Salida,
  TikTokIntelligence,
  VideoKnowledgeFormat,
  VideoTypographyId,
} from '@/types'
import { resolveWeeklyBatch } from '@/lib/calendar-resolver'
import { getIsoWeekNumber } from '@/lib/calendar-resolver'
import { planWeeklyFormats } from '@/lib/calendar-format-plan'
import {
  assertCommercialMediaSource,
  assertCommercialCopy,
  buildLocalCampaignBanner,
  normalizeCampaignContext,
  resolveContentProfile,
  withCommercialContentAxis,
  withSalidaCommercialFacts,
} from '@/lib/commercial-content-profiles'
import { generateAdaptiveCarrusel, type HolidayInput } from '@/lib/generators/carrusel-formato'
import { generateContentForSalida } from '@/lib/gemini'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { listImagesWithCategories } from '@/lib/google-drive'
import { mapPieceToInsertRow } from '@/lib/contenido-insert'
import { mapBannerContentToInsertRow } from '@/lib/banner-content-insert'
import { runBannerMolde1 } from '@/lib/generators/banner-molde-1-run'
import { runBannerMolde2 } from '@/lib/generators/banner-molde-2-run'
import { runBannerMolde6 } from '@/lib/generators/banner-molde-6-run'
import { buildBannerMolde3, buildBannerMolde5 } from '@/lib/generators/banner-moldes-commercial'
import { generateBannerMolde1Copy } from '@/lib/generators/banner-molde-1-copy'
import { generateBannerMolde1Items } from '@/lib/generators/banner-molde-1-items'
import { generateBannerCtaSuave } from '@/lib/generators/banner-cta-suave'
import { generateBannerMolde6Convocatoria } from '@/lib/generators/banner-molde-6-convocatoria'
import { BANNER_MOLDE_1_CAPS } from '@/lib/banner-render-contract'
import type { BannerContentContract } from '@/lib/generators/banner-content'
import { dispatchVideoRenders, dispatchCarruselRenders, type MatiInsertedRow } from '@/lib/mati-dispatch'
import { loadAntiPatterns, loadKnowledge } from '@/lib/knowledge-loader'
import { generateSlotPieces, type SlotPieceOutcome } from '@/lib/orchestrators/generate-slot-pieces'
import { markGeneratedSlotsRenderPending, reconcileSlotRenderStatuses } from '@/lib/calendar-render-status'
import { generateVideoFamilia1b } from '@/lib/generators/video-familia-1b'
import { generateVideoFamilia1c } from '@/lib/generators/video-familia-1c'
import { generateVideoFamilia2 } from '@/lib/generators/video-familia-2'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import { generateVideoFamilia5 } from '@/lib/generators/video-familia-5'
import type { createAdminClient } from '@/lib/supabase/admin'
import { claimBatchIndex } from '@/lib/batch-rotation'
import {dispatchBannerRender, type BannerRenderSource} from '@/lib/banner-render-dispatch'
import {dispatchFamiliesVideoRender, type FamiliesVideoRenderSource} from '@/lib/mati-families-video-dispatch'
import {prepareAutomaticBannerRender, prepareAutomaticVideoRender} from '@/lib/weekly-auto-render'

// Override opcional para pruebas/admin. En el flujo normal, el plan semanal
// elige automáticamente una familia de video para el slot correspondiente.
export interface WeeklyBatchVideoPiezaInput {
  subfamilia: VideoKnowledgeFormat
  salidaId: string
  tipografiasPermitidas: VideoTypographyId[]
  canalesHabilitados?: string[]
  publicationDate?: string
}

/**
 * Orquestador del batch semanal de calendario — conecta las
 * implementaciones REALES de generación (Gemini, Drive) con
 * `generateSlotPieces` (lib/orchestrators/generate-slot-pieces.ts, la
 * parte testeable/pura) y con la persistencia + render de Mati.
 *
 * Pensado para correr dentro de `after()` — no es sincrónico con la
 * respuesta HTTP (ver app/api/generate-batch/route.ts).
 */

// ─── Orquestación real contra Supabase — pensada para after() ────────

export interface RunWeeklyBatchParams {
  runId: string
  clientId: string
  admin: ReturnType<typeof createAdminClient>
  videoPiezas?: WeeklyBatchVideoPiezaInput[]
}

export interface WeeklyBannerGenerationParams {
  bannerMolde: 1 | 2 | 3 | 4 | 5 | 6
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  carpeta: string
}

export async function generateWeeklyBannerContent(params: WeeklyBannerGenerationParams): Promise<BannerContentContract> {
  const localBanner = buildLocalCampaignBanner(params.clientOnboarding, params.salida)
  if (localBanner) return localBanner
  const common = {
    salida: params.salida,
    niche: params.niche,
    clientName: params.clientName,
    clientOnboarding: params.clientOnboarding,
    vozSlug: params.vozSlug,
    tipografiasPermitidas: ['Inter', 'Playfair Display'] as VideoTypographyId[],
    canalesHabilitados: [] as string[],
  }
  const generateMolde1 = async () => {
    const result = await runBannerMolde1({
      ...common,
      copyMaxCharacters: BANNER_MOLDE_1_CAPS.copy,
      lugarMaxCharacters: BANNER_MOLDE_1_CAPS.lugar,
      fechaMaxCharacters: BANNER_MOLDE_1_CAPS.fecha,
      itemMaxCharacters: BANNER_MOLDE_1_CAPS.item,
      generateCopy: generateBannerMolde1Copy,
      generateItems: generateBannerMolde1Items,
    })
    if (!result.ok) throw new Error(result.error)
    return result.content
  }

  try {
    if (params.bannerMolde === 2) {
      const result = await runBannerMolde2({
        ...common,
        carpeta: params.carpeta,
        lugarMaxCharacters: 40,
        fechaMaxCharacters: 28,
        ctaMaxCharacters: 40,
        generateFicha: generateVideoFamilia5,
        generateCta: generateBannerCtaSuave,
      })
      if (!result.ok) throw new Error(result.error)
      return result.content
    }
    if (params.bannerMolde === 3) {
      return buildBannerMolde3({ salida: params.salida, cta: 'Consultá tu lugar', typographyId: 'Inter' })
    }
    if (params.bannerMolde === 5) {
      return buildBannerMolde5({ salida: params.salida, cta: 'Pedí la propuesta', typographyId: 'Inter' })
    }
    if (params.bannerMolde === 6) {
      const result = await runBannerMolde6({
        ...common,
        carpeta: params.carpeta,
        mensajeMaxCharacters: 80,
        convocatoriaMaxCharacters: 60,
        generateMensaje: generateVideoFamilia3,
        generateConvocatoria: generateBannerMolde6Convocatoria,
      })
      if (!result.ok) throw new Error(result.error)
      return result.content
    }
    return await generateMolde1()
  } catch (error) {
    if (params.bannerMolde === 1) throw error
    if (params.bannerMolde === 5 && resolveContentProfile(params.clientOnboarding) === 'dupla_viajes_internacionales') {
      console.warn('[BATCH/BANNER] Molde 5 sin ficha completa; usando Molde 3 con datos comerciales verificados:', error)
      return buildBannerMolde3({ salida: params.salida, cta: 'Pedí la propuesta', typographyId: 'Inter' })
    }
    console.warn(`[BATCH/BANNER] Molde ${params.bannerMolde} no elegible; usando Molde 1:`, error)
    return generateMolde1()
  }
}

export async function runWeeklyBatch({
  runId,
  clientId,
  admin,
  videoPiezas,
}: RunWeeklyBatchParams): Promise<void> {
  const nowIso = () => new Date().toISOString()
  let copyReady = false

  try {
    await admin.from('calendar_batch_runs').update({ status: 'running', updated_at: nowIso() }).eq('id', runId)

    const { data: profile } = await admin.from('profiles').select('*').eq('id', clientId).single()
    if (!profile) throw new Error('Perfil del cliente no encontrado')

    const { data: salidaRows } = await admin.from('salidas').select('*').eq('user_id', clientId)
    const salidas = (salidaRows ?? []) as Salida[]
    const salidasById = new Map(salidas.map(s => [s.id, s]))

    const { data: clientOnboarding } = await admin
      .from('client_onboarding')
      .select('*')
      .eq('user_id', clientId)
      .single()
    const typedOnboarding = (clientOnboarding as ClientOnboarding) ?? null
    const publicClientName = normalizeCampaignContext(typedOnboarding?.campaign_context).nombre_publico
      ?? profile.company_name
      ?? profile.full_name
      ?? 'Cliente'
    const today = nowIso().slice(0, 10)

    const resolvedSlots = resolveWeeklyBatch({ calendarCode: profile.calendario_asignado as CalendarCode, salidas })
    const salidaIdsConVideo = new Set(
      salidas
        .filter(salida => Boolean(salida.carpeta_videos_id && salida.carpeta_videos_nombre?.trim()))
        .map(salida => salida.id),
    )
    const plannedSlots = planWeeklyFormats(
      profile.calendario_asignado as CalendarCode,
      resolvedSlots,
      salidaIdsConVideo,
      {
        contentProfile: resolveContentProfile(typedOnboarding),
        rotationIndex: getIsoWeekNumber(today),
      },
    )
    const carruselSlots = plannedSlots.filter(slot => slot.formatoContenido === 'carrusel')
    const editorialBatchIndex = carruselSlots.some(slot => slot.formatoCarrusel === 'editorial')
      ? await claimBatchIndex(admin, clientId, 'carrusel')
      : undefined

    const [{ data: brandIdentity }, { data: knowledgeBase }] = await Promise.all([
      admin.from('brand_identity').select('*').eq('user_id', clientId).single(),
      admin.from('knowledge_base').select('*').eq('niche', profile.niche).eq('activo', true).limit(10),
    ])

    const nichoExacto = (profile.niche as string).toLowerCase().trim()
    const { data: tiktokRaw } = await admin
      .from('tiktok_intelligence')
      .select('*')
      .eq('nicho', nichoExacto)
      .eq('es_referencia', true)
      .order('likes', { ascending: false })
      .limit(8)
    const tiktokExamples = ((tiktokRaw ?? []) as TikTokIntelligence[]).sort(
      (a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3),
    )

    const vozSlugCandidate = brandIdentity?.mati_cliente_id?.trim()
    const vozSlug = vozSlugCandidate && /^[a-z0-9_-]+$/i.test(vozSlugCandidate) ? vozSlugCandidate : undefined

    // Resolvemos las imágenes de cada salida necesaria (para carrusel)
    const hasPhotosBySalidaId = new Map<string, boolean>()
    const imageFilesBySalidaId = new Map<string, string[]>()
    const backgroundImageIdBySalidaId = new Map<string, string>()
    const carpetaNombreBySalidaId = new Map<string, string | null>()

    const uniqueSalidaIdsForCarrusel = [...new Set(plannedSlots.map(s => s.salidaId).filter(Boolean))] as string[]

    await Promise.all(uniqueSalidaIdsForCarrusel.map(async (salidaId) => {
      const salida = salidasById.get(salidaId)
      if (!salida) return

      const fotosId = salida.carpeta_fotos_id
      const fotosNombre = salida.carpeta_fotos_nombre

      if (fotosNombre) {
        carpetaNombreBySalidaId.set(salidaId, fotosNombre)
      }

      if (fotosId) {
        try {
          const categorizedImages = await listImagesWithCategories(fotosId)
          const filesWithCategory = categorizedImages
            .filter(img => img.mimeType.startsWith('image/'))
            .map(img => `[${img.category}] ${img.name}`)

          const imageFiles = [...new Set(filesWithCategory)].sort((a, b) => {
            const priority = (name: string) => (name.toLocaleLowerCase('es-AR').includes('pexels-') ? 0 : /\.(?:jpe?g|png|webp)$/i.test(name) ? 1 : 2)
            return priority(a) - priority(b) || a.localeCompare(b)
          })

          if (imageFiles.length > 0) {
            hasPhotosBySalidaId.set(salidaId, true)
            imageFilesBySalidaId.set(salidaId, imageFiles)
            const firstImage = categorizedImages.find(image => image.mimeType.startsWith('image/'))
            if (firstImage) backgroundImageIdBySalidaId.set(salidaId, firstImage.id)
          } else {
            hasPhotosBySalidaId.set(salidaId, false)
          }
        } catch (e) {
          console.error('Error listando fotos para la salida %s:', salidaId, e)
          hasPhotosBySalidaId.set(salidaId, false)
        }
      } else {
        hasPhotosBySalidaId.set(salidaId, false)
      }
    }))

    const proximaFutura = salidas
      .filter(s => s.fecha_inicio >= today)
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0] ?? null

    // El slot "Calendario" usa la lógica real (varias salidas + feriados),
    // no la simplificación de una sola salida que usa el resolver.
    let calendarEnrichment: { futureSalidas: Salida[]; holidays: HolidayInput[] } | null = null
    if (carruselSlots.some(s => s.formatoCarrusel === 'calendario') && proximaFutura) {
      const paisCodigo = proximaFutura.pais_codigo ?? 'AR'
      const [{ data: futureRows }, { data: holidayRows }] = await Promise.all([
        admin.from('salidas').select('*').eq('user_id', clientId).eq('pais_codigo', paisCodigo).gte('fecha_inicio', today).order('fecha_inicio').limit(3),
        admin.from('feriados').select('fecha, nombre, tipo, fuente').eq('pais', paisCodigo).gte('fecha', today).order('fecha'),
      ])
      calendarEnrichment = { futureSalidas: (futureRows ?? []) as Salida[], holidays: holidayRows ?? [] }
    }

    // Semilla de avoidConversationLines: historial reciente de conversación
    // de TODO el cliente (no una sola salida, como hace /api/generate hoy).
    const { data: recentConversation } = await admin
      .from('contenido_generado')
      .select('slides_data')
      .eq('user_id', clientId)
      .eq('formato_carrusel', 'conversacion')
      .order('created_at', { ascending: false })
      .limit(5)
    const avoidConversationLinesSeed = (recentConversation ?? []).flatMap(row => {
      if (!Array.isArray(row.slides_data)) return []
      return row.slides_data.flatMap((slide: unknown) => {
        if (!slide || typeof slide !== 'object') return []
        const text = (slide as { texto_principal?: unknown }).texto_principal
        return typeof text === 'string' && text.trim() ? [text.trim()] : []
      })
    })

    const generatedOutcomes = await generateSlotPieces(
      {
        slots: carruselSlots,
        salidasById,
        niche: profile.niche as Niche,
        clientName: publicClientName,
        clientOnboarding: (clientOnboarding as ClientOnboarding) ?? null,
        hasPhotosBySalidaId,
        imageFilesBySalidaId,
        carpetaNombreBySalidaId,
        calendarEnrichment,
        avoidConversationLinesSeed,
        knowledgeBase: (knowledgeBase || []) as KnowledgeBase[],
        tiktokExamples,
        objetivoGeneracion: 'vender_salida',
        antiPatternsText: loadAntiPatterns(),
        formatoTexts: {
          patronesText: profile.niche === 'trekking' ? loadKnowledge('nichos/trekking/patrones.md') : '',
          storytellingText: loadKnowledge('formatos/carrusel_storytelling.md'),
          reflexionText: loadKnowledge('formatos/reflexion.md'),
        },
        editorialBatchIndex,
      },
      { generateAdaptiveCarrusel, generateContentForSalida, evaluateCarruselEligibility },
    )
    const outcomes = generatedOutcomes.map(outcome => {
      if (outcome.outcome !== 'generated' || !outcome.piece) return outcome
      try {
        assertCommercialCopy(outcome.piece, typedOnboarding)
        return outcome
      } catch (error) {
        return {
          ...outcome,
          outcome: 'error' as const,
          piece: undefined,
          reason: error instanceof Error ? error.message : String(error),
        }
      }
    })

    // Persistencia aditiva — nunca borra contenido existente (a diferencia
    // de /api/generate, que borra todo lo de una salida antes de insertar;
    // acá varios slots pueden compartir la misma salida en el mismo batch).
    const successOutcomes = outcomes.filter(
      (o): o is SlotPieceOutcome & { piece: AnyGeneratedPiece } => o.outcome === 'generated' && Boolean(o.piece),
    )
    const toInsert = successOutcomes.map(o => {
      const salidaId = o.slot.salidaId as string
      return mapPieceToInsertRow(o.piece, {
        salidaId,
        userId: clientId,
        formatoCarrusel: o.slot.formatoCarrusel,
        objetivoInteraccion: 'convertir',
        carpetaFotos: carpetaNombreBySalidaId.get(salidaId) ?? '',
        destino: salidasById.get(salidaId)?.destino,
      })
    })

    let inserted: MatiInsertedRow[] = []
    if (toInsert.length > 0) {
      const { data, error } = await admin
        .from('contenido_generado')
        .insert(toInsert)
        .select('id, formato, formato_carrusel, objetivo_interaccion, descripcion_post, tema, angulo, slides_data, video_crudo, titulo, subtitulo, bullets, cta, mes')
      if (error) throw new Error(`Error insertando contenido_generado: ${error.message}`)
      // Supabase devuelve las filas de RETURNING en el mismo orden que el
      // array insertado — es seguro emparejar por índice con successOutcomes.
      inserted = (data ?? []) as MatiInsertedRow[]
    }

    const carruselResultSlots = outcomes.map(o => {
      const insertedIndex = successOutcomes.indexOf(o as SlotPieceOutcome & { piece: AnyGeneratedPiece })
      return {
        index: o.slot.index,
        label: o.slot.label,
        formatoContenido: 'carrusel' as const,
        formatoCarrusel: o.slot.formatoCarrusel,
        salidaId: o.slot.salidaId,
        outcome: o.outcome,
        ...(o.reason ? { reason: o.reason } : {}),
        ...(insertedIndex >= 0 && inserted[insertedIndex] ? { contenidoId: inserted[insertedIndex].id } : {}),
      }
    }) satisfies CalendarBatchSlotResult[]

    // El banner/flyer ocupa su slot dentro de la misma cadencia semanal.
    // Se genera como contrato editable y queda pendiente de aprobación; no
    // se renderiza ni se publica sin intervención del usuario.
    const bannerResultSlots: CalendarBatchSlotResult[] = []
    const automaticBannerRenders: BannerRenderSource[] = []
    for (const slot of plannedSlots.filter(item => item.formatoContenido === 'banner')) {
      const salidaId = slot.salidaId
      const salida = salidaId ? salidasById.get(salidaId) : null
      const backgroundDriveFileId = salidaId ? backgroundImageIdBySalidaId.get(salidaId) : null
      if (!salidaId || !salida || !backgroundDriveFileId) {
        bannerResultSlots.push({
          index: slot.index,
          label: slot.label,
          formatoContenido: 'banner',
          formatoCarrusel: slot.formatoCarrusel,
          salidaId,
          outcome: 'error',
          reason: 'La salida no tiene una foto utilizable para el banner',
        })
        continue
      }
      try {
        const pieceOnboarding = withCommercialContentAxis(
          withSalidaCommercialFacts(typedOnboarding, salida),
          slot.commercialContentAxis,
        )
        assertCommercialMediaSource(salida.carpeta_fotos_nombre, pieceOnboarding)
        const content = await generateWeeklyBannerContent({
          bannerMolde: slot.bannerMolde ?? 1,
          salida,
          niche: profile.niche as Niche,
          clientName: publicClientName,
          clientOnboarding: pieceOnboarding,
          vozSlug,
          carpeta: salida.carpeta_fotos_nombre ?? '',
        })
        assertCommercialCopy(content, pieceOnboarding)
        const row = mapBannerContentToInsertRow({
          salidaId,
          userId: clientId,
          content,
          backgroundDriveFileId,
          metadata: { calendar_batch_run_id: runId, calendar_slot_index: slot.index },
        })
        const { data: bannerRow, error: bannerInsertError } = await admin
          .from('contenido_generado')
          .insert(row)
          .select('id')
          .single()
        if (bannerInsertError || !bannerRow) throw new Error(bannerInsertError?.message ?? 'No se pudo guardar el banner')
        const preparedRender = await prepareAutomaticBannerRender({
          admin,
          rowId: bannerRow.id,
          userId: clientId,
          content,
          backgroundDriveFileId,
          profile,
          brandIdentity,
        })
        if (preparedRender) automaticBannerRenders.push(preparedRender)
        bannerResultSlots.push({
          index: slot.index,
          label: slot.label,
          formatoContenido: 'banner',
          formatoCarrusel: slot.formatoCarrusel,
          salidaId,
          outcome: 'generated',
          contenidoId: bannerRow.id,
        })
      } catch (error) {
        console.error(`[BATCH/BANNER] Error generando slot ${slot.index}:`, error)
        bannerResultSlots.push({
          index: slot.index,
          label: slot.label,
          formatoContenido: 'banner',
          formatoCarrusel: slot.formatoCarrusel,
          salidaId,
          outcome: 'error',
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Video-familias del slot semanal — bloque aparte del pipeline de
    // carrusel de arriba. Corre también si el carrusel generó cero piezas.
    // Cada pieza se inserta con
    // render_status='pending_review' vía mapPieceToInsertRow, igual que
    // el flujo individual — nunca pasa por dispatchVideoRenders (eso es
    // solo para video legacy) ni se auto-dispara a Mati.
    const automaticVideoSlots = plannedSlots.filter(slot => slot.formatoContenido === 'video')
    const effectiveVideoPiezas: WeeklyBatchVideoPiezaInput[] = videoPiezas ?? automaticVideoSlots.flatMap(slot => (
      slot.salidaId && slot.videoSubfamilia
        ? [{
            subfamilia: slot.videoSubfamilia,
            salidaId: slot.salidaId,
            tipografiasPermitidas: ['Inter', 'Montserrat'] as VideoTypographyId[],
          }]
        : []
    ))
    const videoResultSlots: CalendarBatchSlotResult[] = []
    const automaticVideoRenders: FamiliesVideoRenderSource[] = []
    let videoGenerated = 0
    let videoFailed = 0
    if (effectiveVideoPiezas.length > 0) {
      const commonVideoBase = {
        niche: profile.niche as Niche,
        clientName: publicClientName,
        vozSlug,
      }
      const generatedVideoRows: Array<{
        row: Record<string, unknown>
        piezaIndex: number
        subfamilia: VideoKnowledgeFormat
        salida: Salida
      }> = []
      for (const [piezaIndex, pieza] of effectiveVideoPiezas.entries()) {
        const salidaVideo = salidasById.get(pieza.salidaId)
        if (!salidaVideo) {
          videoFailed += 1
          console.error(`[BATCH/VIDEO] salida ${pieza.salidaId} no pertenece a este cliente — se salta`)
          continue
        }
        const carpetaVideoNombre = salidaVideo.carpeta_videos_nombre ?? ''
        const automaticSlot = automaticVideoSlots[piezaIndex]
        const pieceOnboarding = withCommercialContentAxis(
          withSalidaCommercialFacts(typedOnboarding, salidaVideo),
          automaticSlot?.commercialContentAxis,
        )
        assertCommercialMediaSource(carpetaVideoNombre, pieceOnboarding)
        const videoBase = { ...commonVideoBase, clientOnboarding: pieceOnboarding }
        try {
          let piece: AnyGeneratedPiece
          if (pieza.subfamilia === '2a') {
            piece = await generateVideoFamilia2({ ...videoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '2a', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '2b') {
            piece = await generateVideoFamilia2({ ...videoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '2b', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '2c') {
            piece = await generateVideoFamilia2({ ...videoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '2c', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '4') {
            piece = await generateVideoFamilia4({
              ...videoBase,
              carpeta: carpetaVideoNombre,
              salida: salidaVideo,
              tipografiasPermitidas: pieza.tipografiasPermitidas,
              canalesHabilitados: pieza.canalesHabilitados ?? [],
              publicationDate: pieza.publicationDate,
            })
          } else if (pieza.subfamilia === '1a') {
            throw new Error('Familia 1a (Discurso) no está disponible en el batch semanal todavía')
          } else if (pieza.subfamilia === '1b') {
            piece = await generateVideoFamilia1b({ ...videoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: '1b', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '1c') {
            piece = await generateVideoFamilia1c({ subfamilia: '1c', tipografiasPermitidas: pieza.tipografiasPermitidas })
          } else if (pieza.subfamilia === '5') {
            const generated = await generateVideoFamilia5({
              ...videoBase,
              carpeta: carpetaVideoNombre,
              salida: salidaVideo,
              tipografiasPermitidas: pieza.tipografiasPermitidas,
              canalesHabilitados: pieza.canalesHabilitados ?? [],
              publicationDate: pieza.publicationDate,
            })
            if (!generated) continue
            piece = generated
          } else {
            piece = await generateVideoFamilia3({ ...videoBase, carpeta: carpetaVideoNombre, salida: salidaVideo, subfamilia: pieza.subfamilia, tipografiasPermitidas: pieza.tipografiasPermitidas })
          }
          assertCommercialCopy(piece, pieceOnboarding)
          generatedVideoRows.push({
            row: mapPieceToInsertRow(piece, {
              salidaId: pieza.salidaId,
              userId: clientId,
              carpetaFotos: carpetaVideoNombre,
              carpetaFotosId: salidaVideo.carpeta_videos_id ?? undefined,
            }),
            piezaIndex,
            subfamilia: pieza.subfamilia,
            salida: salidaVideo,
          })
          videoGenerated += 1
        } catch (err) {
          videoFailed += 1
          console.error(`[BATCH/VIDEO] Error generando ${pieza.subfamilia} para salida ${pieza.salidaId}:`, err)
        }
      }
      if (generatedVideoRows.length > 0) {
        const { data: videoRows, error: videoInsertError } = await admin
          .from('contenido_generado')
          .insert(generatedVideoRows.map(item => item.row))
          .select('id')
        if (videoInsertError) {
          console.error('[BATCH/VIDEO] Error insertando piezas de video:', videoInsertError.message)
          videoFailed += generatedVideoRows.length
          videoGenerated -= generatedVideoRows.length
        } else {
          for (const [rowIndex, row] of (videoRows ?? []).entries()) {
            const generated = generatedVideoRows[rowIndex]
            const requestIndex = generated?.piezaIndex ?? rowIndex
            const slot = automaticVideoSlots[requestIndex]
            if (!slot) continue
            if (generated) {
              const preparedRender = await prepareAutomaticVideoRender({
                admin,
                rowId: row.id,
                userId: clientId,
                subfamilia: generated.subfamilia,
                persistedRow: generated.row,
                salida: generated.salida,
                profile,
                brandIdentity,
              })
              if (preparedRender) automaticVideoRenders.push(preparedRender)
            }
            videoResultSlots.push({
              index: slot.index,
              label: slot.label,
              formatoContenido: 'video',
              formatoCarrusel: slot.formatoCarrusel,
              salidaId: slot.salidaId,
              outcome: 'generated',
              contenidoId: row.id,
            })
          }
        }
      }
    }

    for (const slot of automaticVideoSlots) {
      if (videoResultSlots.some(resultSlot => resultSlot.index === slot.index)) continue
      videoResultSlots.push({
        index: slot.index,
        label: slot.label,
        formatoContenido: 'video',
        formatoCarrusel: slot.formatoCarrusel,
        salidaId: slot.salidaId,
        outcome: 'error',
        reason: 'No se pudo generar el video de esta semana',
      })
    }

    const slots = markGeneratedSlotsRenderPending([
      ...carruselResultSlots,
      ...bannerResultSlots,
      ...videoResultSlots,
    ].sort((a, b) => a.index - b.index))
    const generatedCount = slots.filter(slot => slot.outcome === 'generated').length
    const failedCount = slots.length - generatedCount

    let result: CalendarBatchResult = {
      calendarCode: profile.calendario_asignado as CalendarCode,
      generated: generatedCount,
      failed: failedCount,
      slots,
      ...(effectiveVideoPiezas.length > 0 ? { videoGenerated, videoFailed } : {}),
    }

    await admin
      .from('calendar_batch_runs')
      .update({ status: 'completed', result, updated_at: nowIso() })
      .eq('id', runId)
    copyReady = true

    if (inserted.length === 0 && automaticBannerRenders.length === 0 && automaticVideoRenders.length === 0) return

    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+$/, '')
    const matiCarruselUrl = matiBase ? `${matiBase}/api/generar-carrusel` : null
    const matiVideoUrl = process.env.MATI_SKILL_VIDEOS_URL || (matiBase ? `${matiBase}/api/generar-video` : null)
    const configuredBannerUrl = process.env.MATI_SKILL_BANNER_LIBRARY_URL?.trim()
    const matiBannerUrl = configuredBannerUrl || (matiBase ? `${matiBase}/api/generar-banner-library` : null)
    const matiBannerBase = matiBannerUrl?.replace(/\/api\/generar-banner(?:-library)?\/?$/u, '') ?? matiBase
    const matiCliente = brandIdentity?.mati_cliente_id || profile?.company_name || profile?.full_name || 'cliente'
    const matiToken = process.env.MATI_SKILL_TOKEN?.trim()

    if (!matiBase && !matiVideoUrl && !matiBannerUrl) {
      console.warn('[MATI] MATI_SKILL_URL y MATI_SKILL_VIDEOS_URL no configuradas — saltando renderizado')
    } else {
      const matiCtx = { admin, matiBase, matiCarruselUrl, matiVideoUrl, matiCliente, matiToken }
      const videoRows = inserted.filter(r => r.formato === 'video')

      const carruselRows = inserted.filter(r => (r.formato === 'carrusel' || r.formato === 'carrusel_promo') && r.slides_data)

      // Ya estamos dentro del after() del batch (ver route.ts) — corremos el
      // dispatch directo, sin anidar otro after() (no es el contexto para eso).
      if (videoRows.length > 0) {
        await dispatchVideoRenders(videoRows, matiCtx)
      }

      // Enviamos carruseles también
      if (carruselRows.length > 0) {
        // En el batch resolvemos la carpeta por salida. El generador ya guardó
        // el nombre de la carpeta en video_crudo. Podemos usar ese valor o undefined
        // y dejar que dispatchCarruselRenders tome el video_crudo (wait, dispatchCarruselRenders
        // usa el capturedCarpetaFotos si se le pasa, de lo contrario no lo manda, lo que
        // está bien porque el crudo no es confiable). Pero en el batch, resolvemos
        // carpetaNombreBySalidaId. Lo pasaremos como undefined para que use el default.
        await dispatchCarruselRenders(carruselRows, matiCtx)
      }

    }

    // Banner y video de familias no esperan aprobación manual: una vez que
    // existe su contrato, se envían inmediatamente a sus APIs. Los dispatchers
    // persisten `failed` si falta configuración y mantienen el reintento manual.
    const callbackUrl = process.env.MATI_VIDEO_RENDER_WEBHOOK_URL?.trim()
      || process.env.MATI_RENDER_WEBHOOK_URL?.trim().replace(/\/render\/?$/u, '/video')
      || null
    const automaticDispatches = [
      ...automaticBannerRenders.map(source => dispatchBannerRender(source, {
        admin,
        matiBase: matiBannerBase,
        matiBannerUrl,
        matiToken,
      })),
      ...automaticVideoRenders.map(source => dispatchFamiliesVideoRender(source, {
        admin,
        matiVideoUrl,
        matiToken,
        callbackUrl,
      })),
    ]
    if (automaticDispatches.length > 0) {
      const settled = await Promise.allSettled(automaticDispatches)
      for (const failure of settled) {
        if (failure.status === 'rejected') console.error('[BATCH/RENDER] Dispatch automático rechazado:', failure.reason)
      }
    }

    // Con webhook, el copy ya está visible y cada render confirmará su propio
    // estado de forma asíncrona. No reconciliamos como fallido algo que sigue en cola.
    if (process.env.MATI_RENDER_WEBHOOK_URL?.trim()) return

    const contenidoIds = slots.flatMap(slot => slot.contenidoId ? [slot.contenidoId] : [])
    if (contenidoIds.length === 0) return
    const { data: renderedRows, error: renderLookupError } = await admin
      .from('contenido_generado')
      .select('id, render_folder_id')
      .in('id', contenidoIds)
    if (renderLookupError) {
      throw new Error(`Error reconciliando renders del batch: ${renderLookupError.message}`)
    }

    const renderedContenidoIds = new Set(
      (renderedRows ?? [])
        .filter(row => Boolean(row.render_folder_id))
        .map(row => row.id as string),
    )
    result = {
      ...result,
      slots: reconcileSlotRenderStatuses(result.slots, renderedContenidoIds),
    }

    await admin
      .from('calendar_batch_runs')
      .update({ status: 'completed', result, updated_at: nowIso() })
      .eq('id', runId)
  } catch (err) {
    console.error('[BATCH] Error corriendo el batch semanal:', err)
    if (copyReady) {
      // El calendario ya es utilizable. Un problema posterior de render no
      // vuelve a bloquear ni invalida el copy que el usuario puede revisar.
      return
    }
    await admin
      .from('calendar_batch_runs')
      .update({ status: 'error', error: err instanceof Error ? err.message : String(err), updated_at: nowIso() })
      .eq('id', runId)
  }
}
