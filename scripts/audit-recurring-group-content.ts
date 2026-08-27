import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import type {
  ClientOnboarding,
  Niche,
  Profile,
  Salida,
  VideoKnowledgeFormat,
  VideoTypographyId,
} from '@/types'
import { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import { generateWeeklyBannerContent } from '@/lib/orchestrators/weekly-batch'
import {
  auditCommercialCopy,
  withLocalRecurringCtaRotation,
  withSalidaCommercialFacts,
} from '@/lib/commercial-content-profiles'

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

  const [{ data: profileRow, error: profileError }, { data: onboardingRow }] = await Promise.all([
    db.from('profiles').select('*').eq('id', salida.user_id).single(),
    db.from('client_onboarding').select('*').eq('user_id', salida.user_id).maybeSingle(),
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
  const onboardingFor = (rotationIndex: number) => (
    withLocalRecurringCtaRotation(onboarding, salida, rotationIndex)
  )

  const adaptiveFormats = ['organico', 'conversacion', 'calendario'] as const
  for (const format of adaptiveFormats) {
    const avoidAngles: string[] = []
    const avoidConversationLines: string[] = []
    for (let variant = 1; variant <= 2; variant++) {
      const pieceOnboarding = onboardingFor(variant - 1)
      await capture('carrusel', format, variant, pieceOnboarding, async () => {
        const output = await generateAdaptiveCarrusel({
          formato: format,
          salida,
          niche,
          clientName,
          clientOnboarding: pieceOnboarding,
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

  const videoFormats: VideoKnowledgeFormat[] = ['3b', '3c', '3d', '4']
  for (const format of videoFormats) {
    const variantCount = format === '4' ? 5 : 2
    for (let variant = 1; variant <= variantCount; variant++) {
      const pieceOnboarding = onboardingFor(variant - 1)
      const commonVideo = {
        salida,
        niche,
        clientName,
        clientOnboarding: pieceOnboarding,
        clipDurationSeconds: 10,
        tipografiasPermitidas: ['Inter', 'Montserrat'] as VideoTypographyId[],
        carpeta: salida.carpeta_videos_nombre ?? '',
      }
      await capture('video', format, variant, pieceOnboarding, () => (
        format === '4'
          ? generateVideoFamilia4({
              ...commonVideo,
              canalesHabilitados: [],
              rotationIndex: variant - 1,
            })
          : generateVideoFamilia3({ ...commonVideo, subfamilia: format as '3b' | '3c' | '3d' })
      ))
    }
  }

  // Para grupos recurrentes, la UI expone un único formato comunitario.
  // Auditamos sus cinco discursos reales en vez de repetir el mismo
  // contrato bajo los números de moldes comerciales que no aplican.
  for (let variant = 1; variant <= 5; variant++) {
      const pieceOnboarding = onboardingFor(variant - 1)
      await capture('banner', 'molde-6', variant, pieceOnboarding, () => generateWeeklyBannerContent({
        bannerMolde: 6,
        salida,
        niche,
        clientName,
        clientOnboarding: pieceOnboarding,
        carpeta: salida.carpeta_fotos_nombre ?? '',
        rotationIndex: variant - 1,
      }))
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
