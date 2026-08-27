import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import type {
  ClientOnboarding,
  KnowledgeBase,
  Niche,
  Profile,
  Salida,
  TikTokIntelligence,
  VideoKnowledgeFormat,
  VideoTypographyId,
} from '@/types'
import { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import { generateContentForSalida } from '@/lib/gemini'
import { generateVideoFamilia1a } from '@/lib/generators/video-familia-1a'
import { generateVideoFamilia1b } from '@/lib/generators/video-familia-1b'
import { generateVideoFamilia1c } from '@/lib/generators/video-familia-1c'
import { generateVideoFamilia2 } from '@/lib/generators/video-familia-2'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import { generateVideoFamilia5 } from '@/lib/generators/video-familia-5'
import { generateWeeklyBannerContent } from '@/lib/orchestrators/weekly-batch'
import { auditCommercialCopy, withSalidaCommercialFacts } from '@/lib/commercial-content-profiles'
import { loadAntiPatterns, loadKnowledge } from '@/lib/knowledge-loader'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Faltan variables de Supabase')

const salidaId = process.argv[2]
if (!salidaId) throw new Error('Uso: audit-recurring-group-content.ts <salidaId>')
const partialOutputPath = `/tmp/between-recurring-group-copy-audit-${salidaId}.partial.json`

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const results: Array<{
  family: 'carrusel' | 'video' | 'banner'
  format: string
  variant: number
  status: 'ok' | 'error'
  output?: unknown
  commercialIssues?: string[]
  error?: string
}> = []

const VISIBLE_COPY_KEYS = new Set([
  'copy', 'discurso', 'titulo', 'subtitulo', 'cta', 'dato_duro', 'lugar',
  'mensaje', 'convocatoria', 'descripcion_post', 'descripcion', 'cta_comentario',
  'texto_principal', 'texto_apoyo', 'pill_text', 'bullets', 'datos', 'etiqueta', 'valor',
])

function visibleCopyText(value: unknown, parentKey = ''): string[] {
  if (typeof value === 'string') return VISIBLE_COPY_KEYS.has(parentKey) ? [value] : []
  if (Array.isArray(value)) return value.flatMap(item => visibleCopyText(item, parentKey))
  if (!value || typeof value !== 'object') return []
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => visibleCopyText(child, key))
}

async function capture(
  family: 'carrusel' | 'video' | 'banner',
  format: string,
  variant: number,
  onboarding: ClientOnboarding | null,
  generate: () => Promise<unknown>,
) {
  process.stdout.write(`[AUDIT] ${family}/${format} variante ${variant}... `)
  try {
    const output = await generate()
    const commercialIssues = onboarding
      ? auditCommercialCopy(visibleCopyText(output).join('\n'), onboarding)
      : []
    results.push({ family, format, variant, status: 'ok', output, commercialIssues })
    await writeFile(partialOutputPath, JSON.stringify(results, null, 2), 'utf8')
    console.log(commercialIssues.length ? `OK (${commercialIssues.length} alerta/s)` : 'OK')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({ family, format, variant, status: 'error', error: message })
    await writeFile(partialOutputPath, JSON.stringify(results, null, 2), 'utf8')
    console.log(`ERROR: ${message}`)
  }
}

async function main() {
  const { data: salidaRow, error: salidaError } = await db.from('salidas').select('*').eq('id', salidaId).single()
  if (salidaError || !salidaRow) throw salidaError ?? new Error('Salida no encontrada')
  const salida = salidaRow as Salida
  if (salida.tipo_viaje !== 'salida_recurrente') throw new Error('La salida indicada no es recurrente')

  const [{ data: profileRow, error: profileError }, { data: onboardingRow }, { data: knowledgeRows }, { data: tiktokRows }] = await Promise.all([
    db.from('profiles').select('*').eq('id', salida.user_id).single(),
    db.from('client_onboarding').select('*').eq('user_id', salida.user_id).maybeSingle(),
    db.from('knowledge_base').select('*').eq('niche', 'trekking').eq('activo', true).limit(10),
    db.from('tiktok_intelligence').select('*').eq('nicho', 'trekking').eq('es_referencia', true).order('likes', { ascending: false }).limit(8),
  ])
  if (profileError || !profileRow) throw profileError ?? new Error('Perfil no encontrado')

  const profile = profileRow as Profile
  const onboarding = withSalidaCommercialFacts(
    (onboardingRow as ClientOnboarding | null) ?? null,
    salida,
  )
  const clientName = onboarding?.campaign_context?.nombre_publico
    ?? profile.company_name
    ?? profile.full_name
    ?? 'Cliente'
  const niche = profile.niche as Niche
  const commonVideo = {
    salida,
    niche,
    clientName,
    clientOnboarding: onboarding,
    clipDurationSeconds: 10,
    tipografiasPermitidas: ['Inter', 'Montserrat'] as VideoTypographyId[],
    carpeta: salida.carpeta_videos_nombre ?? '',
  }

  const adaptiveFormats = ['organico', 'lugar', 'conversacion', 'calendario'] as const
  for (const format of adaptiveFormats) {
    const avoidAngles: string[] = []
    const avoidConversationLines: string[] = []
    for (let variant = 1; variant <= 2; variant++) {
      await capture('carrusel', format, variant, onboarding, async () => {
        const output = await generateAdaptiveCarrusel({
          formato: format,
          salida,
          niche,
          clientName,
          clientOnboarding: onboarding,
          objetivo: 'convertir',
          carpeta: salida.carpeta_fotos_nombre ?? '',
          mesAnio: 'grupo semanal',
          futureSalidas: format === 'calendario' ? [salida] : undefined,
          imageFiles: [],
          avoidAngles,
          avoidConversationLines,
          variantIndex: variant,
          variantCount: 2,
        })
        avoidAngles.push(output.angulo)
        if (format === 'conversacion') {
          avoidConversationLines.push(...output.slides.flatMap(slide => slide.texto_principal ? [slide.texto_principal] : []))
        }
        return output
      })
    }
  }

  await capture('carrusel', 'editorial', 1, onboarding, async () => {
    const output = await generateContentForSalida(
      salida,
      { autoridad: salida.carpeta_fotos_nombre ?? '' },
      (knowledgeRows ?? []) as KnowledgeBase[],
      niche,
      clientName,
      (tiktokRows ?? []) as TikTokIntelligence[],
      'vender_salida',
      {},
      1,
      onboarding,
      'carrusel',
      loadAntiPatterns(),
      {
        patronesText: loadKnowledge('nichos/trekking/patrones.md'),
        storytellingText: loadKnowledge('formatos/carrusel_storytelling.md'),
        reflexionText: loadKnowledge('formatos/reflexion.md'),
      },
      [{ tema: 'dudas_objeciones', estructura: 'storytelling' }],
      0,
    )
    return output[0]
  })
  await capture('carrusel', 'editorial', 2, onboarding, async () => {
    const output = await generateContentForSalida(
      salida,
      { comunidad: salida.carpeta_fotos_nombre ?? '' },
      (knowledgeRows ?? []) as KnowledgeBase[],
      niche,
      clientName,
      (tiktokRows ?? []) as TikTokIntelligence[],
      'vender_salida',
      {},
      1,
      onboarding,
      'carrusel',
      loadAntiPatterns(),
      {
        patronesText: loadKnowledge('nichos/trekking/patrones.md'),
        storytellingText: loadKnowledge('formatos/carrusel_storytelling.md'),
        reflexionText: loadKnowledge('formatos/reflexion.md'),
      },
      [{ tema: 'motivacion', estructura: 'storytelling' }],
      1,
    )
    return output[0]
  })

  const videoGenerators: Array<[VideoKnowledgeFormat, () => Promise<unknown>]> = [
    ['1a', () => generateVideoFamilia1a(commonVideo)],
    ['1b', () => generateVideoFamilia1b({ ...commonVideo, subfamilia: '1b' })],
    ['1c', () => generateVideoFamilia1c({ subfamilia: '1c', tipografiasPermitidas: [...commonVideo.tipografiasPermitidas], clipDurationSeconds: 10 })],
    ['2a', () => generateVideoFamilia2({ ...commonVideo, subfamilia: '2a' })],
    ['2b', () => generateVideoFamilia2({ ...commonVideo, subfamilia: '2b' })],
    ['2c', () => generateVideoFamilia2({ ...commonVideo, subfamilia: '2c' })],
    ['3a', () => generateVideoFamilia3({ ...commonVideo, subfamilia: '3a' })],
    ['3b', () => generateVideoFamilia3({ ...commonVideo, subfamilia: '3b' })],
    ['3c', () => generateVideoFamilia3({ ...commonVideo, subfamilia: '3c' })],
    ['3d', () => generateVideoFamilia3({ ...commonVideo, subfamilia: '3d' })],
    ['3e', () => generateVideoFamilia3({ ...commonVideo, subfamilia: '3e' })],
    ['4', () => generateVideoFamilia4({ ...commonVideo, canalesHabilitados: ['WhatsApp'], publicationDate: new Date().toISOString().slice(0, 10) })],
    ['5', () => generateVideoFamilia5({ ...commonVideo, canalesHabilitados: ['WhatsApp'], publicationDate: new Date().toISOString().slice(0, 10) })],
  ]
  for (const [format, generate] of videoGenerators) {
    for (let variant = 1; variant <= 2; variant++) {
      await capture('video', format, variant, onboarding, generate)
    }
  }

  for (const molde of [1, 2, 3, 6] as const) {
    for (let variant = 1; variant <= 2; variant++) {
      await capture('banner', `molde-${molde}`, variant, onboarding, () => generateWeeklyBannerContent({
        bannerMolde: molde,
        salida,
        niche,
        clientName,
        clientOnboarding: onboarding,
        carpeta: salida.carpeta_fotos_nombre ?? '',
      }))
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    salida: {
      id: salida.id,
      nombre: salida.nombre,
      destino: salida.destino,
      tipo_viaje: salida.tipo_viaje,
      dias_semana: salida.dias_semana,
      frecuencia: salida.frecuencia,
      lugares_recurrentes: salida.lugares_recurrentes,
      grupo_info: salida.grupo_info,
    },
    profile: {
      company_name: profile.company_name,
      content_profile: onboarding?.content_profile ?? null,
      campaign_context: onboarding?.campaign_context ?? null,
    },
    summary: {
      total: results.length,
      ok: results.filter(item => item.status === 'ok').length,
      errors: results.filter(item => item.status === 'error').length,
      commercialAlerts: results.reduce((sum, item) => sum + (item.commercialIssues?.length ?? 0), 0),
    },
    results,
  }
  const outputPath = `/tmp/between-recurring-group-copy-audit-${salida.id}.json`
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\n[AUDIT] Reporte: ${outputPath}`)
  console.log(`[AUDIT] Total=${report.summary.total} OK=${report.summary.ok} errores=${report.summary.errors} alertas=${report.summary.commercialAlerts}`)
}

main().catch(error => {
  console.error('[AUDIT] Falló:', error)
  process.exitCode = 1
})
