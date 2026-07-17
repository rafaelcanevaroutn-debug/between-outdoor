import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateContentForSalida } from '@/lib/gemini'
import { generateCarruselPromo } from '@/lib/generators/carrusel-promo'
import { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import { listImagesInFolder } from '@/lib/google-drive'
import type { Salida, KnowledgeBase, TikTokIntelligence, Niche, ObjetivoGeneracion, Vertical, SubVertical, ClientOnboarding, GeneratedCarrusel, GeneratedAdaptiveCarrusel, GeneratedCarruselPromo, GeneratedPieceLegacy, PromoVariante, FormatoCarrusel, ObjetivoInteraccion } from '@/types'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { revalidatePath } from 'next/cache'
import path from 'node:path'
import fs from 'node:fs'

function loadKnowledge(filename: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'lib/knowledge', filename), 'utf-8')
  } catch {
    return ''
  }
}

function loadAntiPatterns(): string {
  return loadKnowledge('global/anti-patterns.md')
}

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
    } = await request.json()
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })
    if (objetivo !== 'vender_salida' && objetivo !== 'mantener_cuenta') {
      return NextResponse.json({ error: 'objetivo debe ser vender_salida o mantener_cuenta' }, { status: 400 })
    }
    const isPromo = formato === 'carrusel_promo'
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
    let pieces: (GeneratedCarrusel | GeneratedAdaptiveCarrusel | GeneratedCarruselPromo | GeneratedPieceLegacy)[]

    if (isPromo) {
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
    if (isPromo) {
      await admin.from('salidas').update({ sheets_exported_at: null }).eq('id', salidaId)
    } else {
      await Promise.all([
        admin.from('contenido_generado').delete().eq('salida_id', salidaId),
        admin.from('salidas').update({ sheets_exported_at: null }).eq('id', salidaId),
      ])
    }

    const toInsert = pieces.map(piece => {
      if (piece.formato === 'carrusel') {
        const c = piece as GeneratedCarrusel | GeneratedAdaptiveCarrusel
        return {
          salida_id:            salidaId,
          user_id:              salida.user_id,
          formato:              'carrusel',
          formato_carrusel:     c.formato_carrusel ?? formatoCarrusel,
          objetivo_interaccion: c.objetivo_interaccion ?? objetivoInteraccion,
          descripcion_post:     c.descripcion_post ?? null,
          generation_metadata:  { ...(c.metadata ?? {}), ...('fuentes' in c && c.fuentes ? { fuentes: c.fuentes } : {}) },
          source_salida_ids:     [sourcePastSalidaId, futureRelatedSalidaId].filter(Boolean),
          vertical:             'vertical' in c ? (c.vertical ?? null) : null,
          slot_key:             null,
          tema:                 c.tema,
          estructura_narrativa: c.estructura_narrativa,
          angulo:               c.angulo,
          cta_comentario:       c.cta_comentario,
          slides_data:          c.slides,
          video_crudo:          (carpetaFotos as string | undefined) ?? c.carpeta_material,
          mes:                  c.mes,
          is_edited:            false,
          titulo: null, subtitulo: null, bullets: null, cta: null, slides: null,
        }
      } else if (piece.formato === 'carrusel_promo') {
        const c = piece as GeneratedCarruselPromo
        console.log(`[INSERT-PROMO] variante=${c.variante} | slides en c.slides (${c.slides?.length ?? 'undefined'}):`, JSON.stringify(c.slides))
        return {
          salida_id:            salidaId,
          user_id:              salida.user_id,
          formato:              'carrusel_promo',
          vertical:             null,
          slot_key:             null,
          tema:                 c.variante,
          estructura_narrativa: null,
          angulo:               `${(salida as Salida).destino} — promo`,
          cta_comentario:       null,
          slides_data:          c.slides,
          video_crudo:          c.carpeta_material,
          mes:                  c.mes,
          is_edited:            false,
          titulo: null, subtitulo: null, bullets: null, cta: null, slides: null,
        }
      } else {
        const l = piece as GeneratedPieceLegacy
        return {
          salida_id:   salidaId,
          user_id:     salida.user_id,
          formato:     l.formato,
          vertical:    l.vertical,
          slot_key:    l.subvertical ?? null,
          titulo:      l.titulo,
          subtitulo:   l.subtitulo,
          bullets:     l.bullets,
          cta:         l.cta,
          slides:      null,
          video_crudo: l.video_crudo,
          mes:         l.mes,
          is_edited:   false,
          tema: null, estructura_narrativa: null, angulo: null, cta_comentario: null, slides_data: null,
        }
      }
    })

    const { data: inserted, error: insertError } = await admin
      .from('contenido_generado')
      .insert(toInsert)
      .select('id, formato, formato_carrusel, objetivo_interaccion, descripcion_post, tema, angulo, slides_data, video_crudo')
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // ── POST a Mati por cada carrusel nuevo (fire & forget via after()) ────────
    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+$/, '')
    const matiCarruselUrl = matiBase ? `${matiBase}/api/generar-carrusel` : null
    const matiCliente = brandIdentity?.mati_cliente_id || ownerProfile?.company_name || ownerProfile?.full_name || 'cliente'
    const matiToken = process.env.MATI_SKILL_TOKEN?.trim()

    if (!matiCarruselUrl) {
      console.warn('[MATI/CARRUSEL] MATI_SKILL_URL no configurada — saltando renderizado')
    } else if (inserted) {
      const carruselRows = inserted.filter(r => (r.formato === 'carrusel' || r.formato === 'carrusel_promo') && r.slides_data)

      if (carruselRows.length === 0) {
        console.log('[MATI/CARRUSEL] Sin filas con slides_data — nada que enviar')
      } else {
        // Capturar todo lo necesario antes de after() — las variables del closure
        // deben estar listas porque after() corre después de que la respuesta fue enviada
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
        }
        const capturedCarpetaFotos = carpetaFotos as string | undefined

        const POLL_INTERVAL_MS = 5_000
        const MAX_POLL_ATTEMPTS = 72 // 6 minutos

        after(async () => {
          console.log(`[MATI/CARRUSEL] ── LOTE ${carruselRows.length} carrusel(es) (background) ────────────`)
          console.log(`[MATI/CARRUSEL] URL:     ${matiCarruselUrl}`)
          console.log(`[MATI/CARRUSEL] Auth:    ${matiToken ? 'Bearer ***' : 'sin token'}`)
          console.log(`[MATI/CARRUSEL] Cliente: "${matiCliente}"`)
          console.log('[MATI/CARRUSEL] ────────────────────────────────────────────────────')

          const matiResults = await Promise.allSettled(
            carruselRows.map(async row => {
              try {
                const slidesClean = (row.slides_data as { n_slide: number; rol: string; tipo?: string; pill_text?: string | null; subtitle_highlight?: string | null; texto_principal: string | null; texto_apoyo: string | null; indicacion_imagen?: string; hablante?: string | null }[])
                  .map(s => ({
                    n_slide:           s.n_slide,
                    rol:               s.rol,
                    ...(s.tipo ? { tipo: s.tipo } : {}),
                    ...(s.pill_text || s.hablante ? { pill_text: s.pill_text || s.hablante } : {}),
                    ...(s.subtitle_highlight ? { subtitle_highlight: s.subtitle_highlight } : {}),
                    ...(s.texto_principal    ? { texto_principal:    s.texto_principal }    : {}),
                    ...(s.texto_apoyo        ? { texto_apoyo:        s.texto_apoyo }        : {}),
                    ...(s.indicacion_imagen  ? { indicacion_imagen:  s.indicacion_imagen }  : {}),
                  }))

                const payload: Record<string, unknown> = {
                  cliente:              matiCliente,
                  formato_carrusel:     row.formato_carrusel,
                  objetivo_interaccion: row.objetivo_interaccion,
                  descripcion_post:     row.descripcion_post,
                  angulo:               row.angulo,
                  tema:                 row.tema,
                  slides:               slidesClean,
                }
                // Solo mandar carpeta si el usuario la eligió explícitamente en el FolderPicker.
                // row.video_crudo puede contener defaults como 'paisaje', 'guia' etc. que son
                // inválidos para Mati — no usarlo como fallback.
                if (capturedCarpetaFotos) payload.carpeta = capturedCarpetaFotos

                console.log(`[MATI/CARRUSEL] ── PAYLOAD id=${row.id} ──────────────────────`)
                console.log(`[MATI/CARRUSEL] formato=${row.formato} | tema=${row.tema} | slides=${slidesClean.length} | carpeta=${capturedCarpetaFotos ?? '(none)'}`)
                console.log('[MATI/CARRUSEL] Body:', JSON.stringify(payload, null, 2))

                // ── 1. Enviar job (espera 202 + jobId) ──────────────────────
                const res = await fetch(matiCarruselUrl, { method: 'POST', headers, body: JSON.stringify(payload) })
                const rawBody = await res.text()

                console.log(`[MATI/CARRUSEL] id=${row.id} | HTTP ${res.status} | body: ${rawBody.slice(0, 500)}`)

                if (res.status !== 202) {
                  console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | HTTP ${res.status} — esperaba 202`)
                  console.error(`[MATI/CARRUSEL] Respuesta: ${rawBody}`)
                  if (res.status === 400) console.error('[MATI/CARRUSEL] 400 Bad Request — revisar campos del payload')
                  if (res.status === 401 || res.status === 403) console.error('[MATI/CARRUSEL] Auth rechazada — revisar MATI_SKILL_TOKEN')
                  if (res.status === 404) console.error('[MATI/CARRUSEL] 404 — cliente no existe en Drive o endpoint incorrecto')
                  if (res.status >= 500) console.error('[MATI/CARRUSEL] Error del servidor de Mati')
                  return
                }

                let jobData: { jobId?: string }
                try {
                  jobData = JSON.parse(rawBody)
                } catch {
                  console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | 202 OK pero body no es JSON válido: ${rawBody}`)
                  return
                }

                const jobId = jobData.jobId
                if (!jobId) {
                  console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | 202 OK pero no vino jobId en la respuesta`)
                  return
                }

                console.log(`[MATI/CARRUSEL] ✓ id=${row.id} | jobId=${jobId} | comenzando polling cada ${POLL_INTERVAL_MS / 1000}s`)

                // ── 2. Polling de estado ─────────────────────────────────────
                const statusUrl = `${matiBase}/api/status/${jobId}`
                const statusHeaders = matiToken ? { Authorization: `Bearer ${matiToken}` } : undefined

                for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
                  await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

                  let statusData: { state?: string; result?: { driveFolderId?: string }; error?: string }
                  try {
                    const statusRes = await fetch(statusUrl, { headers: statusHeaders })
                    statusData = await statusRes.json()
                  } catch (err) {
                    console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | jobId=${jobId} | intento ${attempt} — error al consultar estado: ${err instanceof Error ? err.message : err}`)
                    continue
                  }

                  const { state, result, error: jobError } = statusData
                  console.log(`[MATI/CARRUSEL] id=${row.id} | jobId=${jobId} | intento ${attempt}/${MAX_POLL_ATTEMPTS} | state=${state ?? '(sin state)'}`)

                  if (state === 'completed') {
                    const driveFolderId = result?.driveFolderId ?? null
                    console.log(`[MATI/CARRUSEL] ✓ id=${row.id} | jobId=${jobId} | completed | driveFolderId=${driveFolderId ?? '(no devuelto)'}`)
                    if (driveFolderId) {
                      await admin.from('contenido_generado').update({ render_folder_id: driveFolderId }).eq('id', row.id)
                    }
                    return
                  }

                  if (state === 'failed') {
                    console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | jobId=${jobId} | failed | error: ${jobError ?? '(sin detalle)'}`)
                    return
                  }

                  // pending / processing — seguir esperando
                }

                console.warn(`[MATI/CARRUSEL] ⚠ id=${row.id} | jobId=${jobId} | timeout — no completó en ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60_000} minutos`)
              } catch (err) {
                console.error(`[MATI/CARRUSEL] ✗ id=${row.id} | Error inesperado: ${err instanceof Error ? err.message : err}`)
              }
            })
          )

          const okCount  = matiResults.filter(r => r.status === 'fulfilled').length
          const errCount = matiResults.filter(r => r.status === 'rejected').length
          console.log(`[MATI/CARRUSEL] Lote completo — ✓ ${okCount} OK | ✗ ${errCount} errores`)
        })
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
