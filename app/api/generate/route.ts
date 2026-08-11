import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateContentForSalida } from '@/lib/gemini'
import { generateCarruselPromo } from '@/lib/generators/carrusel-promo'
import { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import { generateVideoFamilia2 } from '@/lib/generators/video-familia-2'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import { listImagesInFolder } from '@/lib/google-drive'
import type { Salida, KnowledgeBase, TikTokIntelligence, Niche, ObjetivoGeneracion, Vertical, SubVertical, ClientOnboarding, GeneratedAdaptiveCarrusel, GeneratedCarruselPromo, PromoVariante, FormatoCarrusel, ObjetivoInteraccion, AnyGeneratedPiece, VideoFamilia3Subfamilia } from '@/types'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { dispatchVideoRenders, type MatiInsertedRow } from '@/lib/mati-dispatch'
import { mapPieceToInsertRow } from '@/lib/contenido-insert'
import {
  resolveVideoGenerationDispatch,
  shouldDeleteExistingContent,
  shouldDispatchVideoToMati,
} from '@/lib/video-generation-dispatch'
import { loadKnowledge, loadAntiPatterns } from '@/lib/knowledge-loader'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const {
      salidaId,
      objetivo = 'vender_salida',
      subverticals = {},
      carpetasPorVertical = {},
      cantidad,
      formato,
      formatoCarrusel = 'editorial',
      objetivoInteraccion = 'convertir',
      carpetaFotos,
      carpetaFotosId,
      promoVariante,
      piezas,
      sourcePastSalidaId,
      futureRelatedSalidaId,
      calendarSalidaIds,
      calendarHolidayDates,
      calendarOpportunityType,
      videoMotor,
      videoSubfamilia,
      clipDurationSeconds,
      tipografiasPermitidas,
      publicationDate,
      canalesHabilitados,
    } = await request.json()
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })
    if (objetivo !== 'vender_salida' && objetivo !== 'mantener_cuenta') {
      return NextResponse.json({ error: 'objetivo debe ser vender_salida o mantener_cuenta' }, { status: 400 })
    }
    const isPromo = formato === 'carrusel_promo'
    const normalizedTypographyIds = Array.isArray(tipografiasPermitidas)
      ? tipografiasPermitidas
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.trim())
        .filter(Boolean)
      : []
    const normalizedChannels = Array.isArray(canalesHabilitados)
      ? canalesHabilitados
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.trim())
        .filter(Boolean)
      : []
    const videoDispatch = resolveVideoGenerationDispatch({ formato, videoMotor, videoSubfamilia })
    if (!videoDispatch.ok) {
      return NextResponse.json({ error: videoDispatch.error }, { status: 400 })
    }
    const videoMode = videoDispatch.mode
    if (videoMode.kind === 'familias') {
      if (
        normalizedTypographyIds.length === 0
      ) {
        return NextResponse.json({ error: 'tipografiasPermitidas requiere al menos un ID para el motor familias' }, { status: 400 })
      }
      if (
        clipDurationSeconds !== undefined
        && (typeof clipDurationSeconds !== 'number' || !Number.isFinite(clipDurationSeconds) || clipDurationSeconds <= 0)
      ) {
        return NextResponse.json({ error: 'clipDurationSeconds debe ser un número positivo' }, { status: 400 })
      }
      if (
        publicationDate !== undefined
        && (typeof publicationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(publicationDate))
      ) {
        return NextResponse.json({ error: 'publicationDate debe usar formato YYYY-MM-DD' }, { status: 400 })
      }
      if (
        videoMode.subfamilia === '4'
        && (
          normalizedChannels.length === 0
        )
      ) {
        return NextResponse.json({ error: 'Familia 4 requiere al menos un canal habilitado' }, { status: 400 })
      }
    }
    const carruselFormatValues: FormatoCarrusel[] = ['editorial', 'organico', 'itinerario', 'ascenso', 'calendario', 'lugar', 'conversacion']
    const interactionValues: ObjetivoInteraccion[] = ['comentar', 'guardar', 'compartir', 'convertir']
    if (formato === 'carrusel' && !carruselFormatValues.includes(formatoCarrusel as FormatoCarrusel)) {
      return NextResponse.json({ error: 'Formato de carrusel inválido' }, { status: 400 })
    }
    if (formato === 'carrusel' && !interactionValues.includes(objetivoInteraccion as ObjetivoInteraccion)) {
      return NextResponse.json({ error: 'Objetivo de interacción inválido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    console.log(`[API/generate] formato=${formato ?? '(null)'} | isPromo=${isPromo} | promoVariante=${promoVariante ?? '(null)'} | objetivo=${objetivo} | cantidad=${cantidad ?? 'default'} | salidaId=${salidaId} | userId=${user.id}`)
    console.log('[API/generate] FULL PAYLOAD:', JSON.stringify({ salidaId, objetivo, subverticals, carpetasPorVertical, cantidad, formato, carpetaFotos, carpetaFotosId, promoVariante, piezas }, null, 2))

    // Get profile (RLS: user sees own profile)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const admin = createAdminClient()

    // Get salida via admin client (allows admin to generate for any client's salida)
    const { data: salida } = await admin
      .from('salidas')
      .select('*')
      .eq('id', salidaId)
      .single()

    if (!salida) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })

    let sourcePastSalida: Salida | null = null
    let futureRelatedSalida: Salida | null = null
    let futureSalidas: Salida[] = []
    let holidays: Array<{ fecha: string; nombre: string; tipo: string | null; fuente: string | null }> = []

    if (profile.role !== 'admin' && salida.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para generar contenido de esta salida' }, { status: 403 })
    }

    if (formato === 'carrusel') {
      const today = new Date().toISOString().slice(0, 10)
      const [{ data: futureRows }, { data: holidayRows }] = await Promise.all([
        admin.from('salidas').select('*').eq('user_id', salida.user_id).eq('pais_codigo', salida.pais_codigo ?? 'AR').gte('fecha_inicio', today).order('fecha_inicio'),
        admin.from('feriados').select('fecha, nombre, tipo, fuente').eq('pais', salida.pais_codigo ?? 'AR').gte('fecha', today).order('fecha'),
      ])
      futureSalidas = (futureRows ?? []) as Salida[]
      holidays = holidayRows ?? []

      if (formatoCarrusel === 'calendario') {
        const requestedSalidaIds = Array.isArray(calendarSalidaIds)
          ? [...new Set(calendarSalidaIds.filter((value): value is string => typeof value === 'string'))].slice(0, 3)
          : []
        const requestedHolidayDates = Array.isArray(calendarHolidayDates)
          ? [...new Set(calendarHolidayDates.filter((value): value is string => typeof value === 'string'))]
          : []
        if (requestedSalidaIds.length > 0) {
          const requested = new Set(requestedSalidaIds)
          futureSalidas = futureSalidas.filter(item => requested.has(item.id))
          if (futureSalidas.length !== requested.size) {
            return NextResponse.json({ error: 'La selección del calendario contiene salidas no válidas.' }, { status: 400 })
          }
        } else {
          futureSalidas = futureSalidas.slice(0, 3)
        }
        const requestedDates = new Set(requestedHolidayDates)
        holidays = requestedDates.size > 0 ? holidays.filter(item => requestedDates.has(item.fecha)) : []
        console.log(`[CALENDARIO] oportunidad=${typeof calendarOpportunityType === 'string' ? calendarOpportunityType : 'proximas'} | salidas=${futureSalidas.map(item => item.id).join(',')} | fechas=${holidays.map(item => item.fecha).join(',')}`)
      }

      if (sourcePastSalidaId) {
        const { data: sourcePast } = await admin.from('salidas').select('*').eq('id', sourcePastSalidaId).single()
        if (!sourcePast || sourcePast.user_id !== salida.user_id || (sourcePast.fecha_inicio >= today && sourcePast.estado !== 'completada')) {
          return NextResponse.json({ error: 'La salida pasada seleccionada no es válida' }, { status: 400 })
        }
        sourcePastSalida = sourcePast as Salida
      }

      if (futureRelatedSalidaId) {
        const { data: futureRelated } = await admin.from('salidas').select('*').eq('id', futureRelatedSalidaId).single()
        if (!futureRelated || futureRelated.user_id !== salida.user_id || futureRelated.fecha_inicio < today || futureRelated.estado === 'completada') {
          return NextResponse.json({ error: 'La salida futura seleccionada no es válida' }, { status: 400 })
        }
        futureRelatedSalida = futureRelated as Salida
      }

      const eligibility = evaluateCarruselEligibility(formatoCarrusel as FormatoCarrusel, salida as Salida, {
        hasPhotos: Boolean(carpetaFotos),
        sourcePastSalidaId,
        sourcePastHasNarrativeData: Boolean(sourcePastSalida?.itinerario?.trim() || sourcePastSalida?.itinerario_dias?.length),
        futureRelatedSalidaId,
        futureSalidasCount: futureSalidas.length,
        holidayCount: holidays.length,
      })

      if (!eligibility.eligible) {
        return NextResponse.json({ error: eligibility.errors.join(' '), eligibility }, { status: 400 })
      }

      if (!['editorial', 'organico', 'conversacion', 'itinerario', 'ascenso', 'calendario', 'lugar'].includes(formatoCarrusel)) {
        return NextResponse.json({ error: `El motor del formato ${formatoCarrusel} se implementa en el próximo bloque.` }, { status: 501 })
      }
    }

    // Always use the SALIDA OWNER's profile for niche — not the calling user's.
    // This ensures admin generates with the client's niche knowledge, not their own.
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', salida.user_id)
      .single()

    if (!ownerProfile) return NextResponse.json({ error: 'Perfil del cliente no encontrado' }, { status: 404 })

    console.log(`[GENERATE] caller=${user.id} | owner=${salida.user_id} | niche=${ownerProfile.niche}`)

    // Get client onboarding profile for the salida owner (optional — graceful if missing)
    const { data: clientOnboarding } = await admin
      .from('client_onboarding')
      .select('*')
      .eq('user_id', salida.user_id)
      .single()

    if (clientOnboarding) {
      console.log(`[GENERATE] Perfil cliente inyectado: avatar="${clientOnboarding.avatar_edad_genero ?? '—'}" | tono="${(clientOnboarding.marca_personalidad ?? '').slice(0, 60)}..." | embudo=${clientOnboarding.embudo_paso ?? '—'} | lineas_rojas="${clientOnboarding.marca_lineas_rojas ?? '—'}"`)
    } else {
      console.log('[GENERATE] Sin perfil de onboarding — generando con contexto de nicho únicamente')
    }

    // Get brand identity for the salida owner (optional — graceful if missing)
    const { data: brandIdentity } = await admin
      .from('brand_identity')
      .select('*')
      .eq('user_id', salida.user_id)
      .single()

    if (brandIdentity) {
      console.log(`[GENERATE] Branding cargado: font="${brandIdentity.font_family ?? '—'}" | colores=${[brandIdentity.color_primario, brandIdentity.color_secundario, brandIdentity.color_acento].filter(Boolean).join(', ') || '—'} | logo=${brandIdentity.logo_url ? 'sí' : 'no'}`)
    } else {
      console.log('[GENERATE] Sin branding — la skill recibirá branding null cuando se integre')
    }

    const vozSlugCandidate = brandIdentity?.mati_cliente_id?.trim()
    const vozSlug = vozSlugCandidate && /^[a-z0-9_-]+$/i.test(vozSlugCandidate)
      ? vozSlugCandidate
      : undefined

    // ── Skill integration point (pendiente URL pública + token de Mati) ─────────
    // El payload ya está armado con los nombres exactos del contrato.
    // Cuando Mati pase la URL pública y el token, descomentar el fetch:
    //
    // const skillPayload = buildSkillPayload(brandIdentity as BrandIdentity | null, ownerProfile)
    // console.log('[GENERATE] Skill payload:', JSON.stringify(skillPayload, null, 2))
    //
    // const skillRes = await fetch('MATI_SKILL_URL', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer MATI_SKILL_TOKEN`,
    //   },
    //   body: JSON.stringify(skillPayload),
    // })
    // if (!skillRes.ok) console.error('[GENERATE] Skill error:', await skillRes.text())
    // ──────────────────────────────────────────────────────────────────────────

    // Get knowledge base and TikTok references using the OWNER's niche
    const { data: knowledgeBase } = await admin
      .from('knowledge_base')
      .select('*')
      .eq('niche', ownerProfile.niche)
      .eq('activo', true)
      .limit(10)

    const nichoExacto = (ownerProfile.niche as string).toLowerCase().trim()
    const { data: tiktokRaw } = await admin
      .from('tiktok_intelligence')
      .select('*')
      .eq('nicho', nichoExacto)
      .eq('es_referencia', true)
      .order('likes', { ascending: false })
      .limit(8)

    const tiktokExamples = ((tiktokRaw || []) as TikTokIntelligence[]).sort(
      (a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3)
    )

    console.log('[GENERATE] nichoExacto:', nichoExacto)
    console.log('[GENERATE] knowledge_base items:', knowledgeBase?.length ?? 0)
    console.log('[GENERATE] tiktok_intelligence items:', tiktokExamples.length)

    // ── Generación ───────────────────────────────────────────────────────────────
    let pieces: AnyGeneratedPiece[]

    if (videoMode.kind === 'familias') {
      const commonVideoParams = {
        salida: salida as Salida,
        niche: ownerProfile.niche as Niche,
        clientName: ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
        clientOnboarding: (clientOnboarding as ClientOnboarding) ?? null,
        vozSlug,
        clipDurationSeconds: typeof clipDurationSeconds === 'number' ? clipDurationSeconds : undefined,
        tipografiasPermitidas: normalizedTypographyIds,
        carpeta: typeof carpetaFotos === 'string' ? carpetaFotos : undefined,
      }

      if (videoMode.subfamilia === '2a') {
        pieces = [await generateVideoFamilia2({ ...commonVideoParams, subfamilia: '2a' })]
      } else if (videoMode.subfamilia === '2b') {
        pieces = [await generateVideoFamilia2({ ...commonVideoParams, subfamilia: '2b' })]
      } else if (videoMode.subfamilia === '4') {
        pieces = [await generateVideoFamilia4({
          ...commonVideoParams,
          publicationDate: typeof publicationDate === 'string' ? publicationDate : undefined,
          canalesHabilitados: normalizedChannels,
        })]
      } else {
        pieces = [await generateVideoFamilia3({
          ...commonVideoParams,
          subfamilia: videoMode.subfamilia as VideoFamilia3Subfamilia,
        })]
      }
    } else if (isPromo) {
      // Carrusel promocional — ignora KnowledgeBase/TikTok/objetivo, usa solo datos de la salida
      const variantes: PromoVariante[] = promoVariante === 'todas'
        ? ['promo_simple', 'promo_cta', 'promo_info']
        : [promoVariante as PromoVariante]
      console.log(`[GENERATE] Modo promo | variantes=${variantes.join(',')} | carpetaFotos=${carpetaFotos ?? '(default)'}`)
      pieces = await Promise.all(
        variantes.map(v => generateCarruselPromo(salida as Salida, v, carpetaFotos ?? null))
      )
    } else if (formato === 'carrusel' && ['organico', 'conversacion', 'itinerario', 'ascenso', 'calendario', 'lugar'].includes(formatoCarrusel)) {
      let avoidConversationLines: string[] = []
      if (formatoCarrusel === 'conversacion') {
        const { data: previousConversation } = await admin
          .from('contenido_generado')
          .select('slides_data')
          .eq('salida_id', salidaId)
          .eq('formato_carrusel', 'conversacion')
          .order('created_at', { ascending: false })
          .limit(5)
        avoidConversationLines = (previousConversation ?? []).flatMap(row => {
          if (!Array.isArray(row.slides_data)) return []
          return row.slides_data.flatMap(slide => {
            if (!slide || typeof slide !== 'object') return []
            const text = (slide as { texto_principal?: unknown }).texto_principal
            return typeof text === 'string' && text.trim() ? [text.trim()] : []
          })
        })
      }
      const selectedImages = typeof carpetaFotosId === 'string' && carpetaFotosId.trim()
        ? [...new Set((await listImagesInFolder(carpetaFotosId.trim(), 50)).images
          .filter(image => image.mimeType.startsWith('image/'))
          .map(image => image.name))]
          .sort((a, b) => {
            const priority = (name: string) => name.toLocaleLowerCase('es-AR').startsWith('pexels-') ? 0 : /\.(?:jpe?g|png|webp)$/i.test(name) ? 1 : 2
            return priority(a) - priority(b) || a.localeCompare(b)
          })
        : []
      const fechaInicio = new Date((salida as Salida).fecha_inicio)
      const mesAnio = fechaInicio.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      const adaptiveCount = Math.min(4, Math.max(1, typeof cantidad === 'number' ? Math.floor(cantidad) : 1))
      const adaptivePieces: GeneratedAdaptiveCarrusel[] = []
      const avoidAngles: string[] = []
      for (let index = 0; index < adaptiveCount; index++) {
        const piece = await generateAdaptiveCarrusel({
          formato: formatoCarrusel as 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar',
          salida: salida as Salida,
          niche: ownerProfile.niche as Niche,
          clientName: ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
          clientOnboarding: (clientOnboarding as ClientOnboarding) ?? null,
          vozSlug,
          objetivo: objetivoInteraccion as ObjetivoInteraccion,
          carpeta: carpetaFotos as string,
          mesAnio,
          sourcePastSalida,
          futureRelatedSalida,
          futureSalidas,
          holidays,
          imageFiles: selectedImages,
          avoidConversationLines,
          avoidAngles,
          variantIndex: index + 1,
          variantCount: adaptiveCount,
        })
        adaptivePieces.push(piece)
        avoidAngles.push(piece.angulo)
        if (formatoCarrusel === 'conversacion') {
          avoidConversationLines.push(...piece.slides.flatMap(slide => slide.texto_principal ? [slide.texto_principal] : []))
        }
      }
      pieces = adaptivePieces
    } else {
      // Generación de contenido normal (carrusel/video/flyer)
      pieces = await generateContentForSalida(
        salida as Salida,
        carpetasPorVertical as Partial<Record<Vertical, string>>,
        (knowledgeBase || []) as KnowledgeBase[],
        ownerProfile.niche as Niche,
        ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
        tiktokExamples,
        objetivo as ObjetivoGeneracion,
        subverticals as Partial<Record<Vertical, SubVertical>>,
        typeof cantidad === 'number' ? cantidad : undefined,
        (clientOnboarding as ClientOnboarding) ?? null,
        formato as 'carrusel' | 'video' | 'flyer' | 'historia' | undefined,
        loadAntiPatterns(),
        {
          patronesText:     ownerProfile.niche === 'trekking' ? loadKnowledge('nichos/trekking/patrones.md') : '',
          storytellingText: loadKnowledge('formatos/carrusel_storytelling.md'),
          reflexionText:    loadKnowledge('formatos/reflexion.md'),
        },
        piezas,
      )
    }

    // ── Delete + reset export flag ────────────────────────────────────────────
    // Promo se ACUMULA — no borra el contenido existente
    if (!shouldDeleteExistingContent(isPromo, videoMode)) {
      await admin.from('salidas').update({ sheets_exported_at: null }).eq('id', salidaId)
    } else {
      await Promise.all([
        admin.from('contenido_generado').delete().eq('salida_id', salidaId),
        admin.from('salidas').update({ sheets_exported_at: null }).eq('id', salidaId),
      ])
    }

    const insertCtx = {
      salidaId,
      userId: salida.user_id,
      formatoCarrusel: formatoCarrusel as FormatoCarrusel,
      objetivoInteraccion: objetivoInteraccion as ObjetivoInteraccion,
      carpetaFotos: carpetaFotos as string | undefined,
      carpetaFotosId: carpetaFotosId as string | undefined,
      sourcePastSalidaId,
      futureRelatedSalidaId,
      destino: (salida as Salida).destino,
    }
    const toInsert = pieces.map(piece => {
      if (piece.formato === 'carrusel_promo') {
        console.log(`[INSERT-PROMO] variante=${(piece as GeneratedCarruselPromo).variante} | slides en c.slides (${(piece as GeneratedCarruselPromo).slides?.length ?? 'undefined'}):`, JSON.stringify((piece as GeneratedCarruselPromo).slides))
      }
      return mapPieceToInsertRow(piece, insertCtx)
    })

    const { data: inserted, error: insertError } = await admin
      .from('contenido_generado')
      .insert(toInsert)
      .select('id, formato, formato_carrusel, objetivo_interaccion, descripcion_post, tema, angulo, slides_data, video_crudo, titulo, subtitulo, bullets, cta, mes')
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // ── POST a Mati por cada carrusel o video nuevo (fire & forget via after()) ────────
    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+$/, '')
    const matiCarruselUrl = matiBase ? `${matiBase}/api/generar-carrusel` : null
    const matiVideoUrl = process.env.MATI_SKILL_VIDEOS_URL || (matiBase ? `${matiBase}/api/generar-video` : null)
    const matiCliente = brandIdentity?.mati_cliente_id || ownerProfile?.company_name || ownerProfile?.full_name || 'cliente'
    const matiToken = process.env.MATI_SKILL_TOKEN?.trim()

    if (!shouldDispatchVideoToMati(videoMode)) {
      console.log('[MATI/VIDEO] motor familias: render deshabilitado hasta definir contrato')
    } else if (!matiBase && !process.env.MATI_SKILL_VIDEOS_URL) {
      console.warn('[MATI] MATI_SKILL_URL y MATI_SKILL_VIDEOS_URL no configuradas — saltando renderizado')
    } else if (inserted) {
      // Carrusel ya NO se dispara automático acá — queda con
      // render_status='pending_review' (ver lib/contenido-insert.ts) hasta
      // que se apruebe explícitamente desde /api/generate/carrusel/[id]/aprobar.
      const carruselCount = inserted.filter(r => (r.formato === 'carrusel' || r.formato === 'carrusel_promo') && r.slides_data).length
      console.log(`[MATI/CARRUSEL] ${carruselCount} pieza(s) insertada(s) con render_status=pending_review — esperando aprobación explícita`)

      const videoRows = inserted.filter(r => r.formato === 'video') as MatiInsertedRow[]
      const matiCtx = { admin, matiBase, matiCarruselUrl, matiVideoUrl, matiCliente, matiToken }

      // Capturar todo lo necesario antes de after() — las variables del closure
      // deben estar listas porque after() corre después de que la respuesta fue enviada
      const capturedCarpetaVideos = carpetaFotos as string | undefined
      const capturedCarpetaVideosId = carpetaFotosId as string | undefined
      const fallbackFechaInicio = salida.fecha_inicio as string | undefined

      if (videoRows.length > 0) {
        after(() => dispatchVideoRenders(videoRows, matiCtx, { capturedCarpetaVideos, capturedCarpetaVideosId, fallbackFechaInicio }))
      } else {
        console.log('[MATI/VIDEO] Sin filas de video — nada que enviar')
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    revalidatePath(`/salidas/${salidaId}/contenido`)
    return NextResponse.json({ success: true, count: pieces.length, ids: inserted?.map(r => r.id) ?? [] })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar contenido' },
      { status: 500 }
    )
  }
}
