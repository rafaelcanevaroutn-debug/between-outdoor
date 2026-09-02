import {createClient} from '@supabase/supabase-js'
import type {
  ClientOnboarding,
  GeneratedVideoFamilia2,
  GeneratedVideoFamilia3,
  GeneratedVideoFamilia4,
  Niche,
  Profile,
  Salida,
  VideoKnowledgeFormat,
  VideoFamilia3Subfamilia,
  VideoTypographyId,
} from '@/types'
import {generateVideoFamilia2} from '@/lib/generators/video-familia-2'
import {generateVideoFamilia3} from '@/lib/generators/video-familia-3'
import {generateVideoFamilia4} from '@/lib/generators/video-familia-4'
import {resolveEffectiveVideoMaterial} from '@/lib/google-drive'
import {resolveVideoVisualContract} from '@/lib/video-visual-contract'
import {isVideoTypographyId} from '@/lib/generators/video-typography'
import {buildFamiliesVideoPayload} from '@/lib/mati-families-video-dispatch'

type Generated = GeneratedVideoFamilia2 | GeneratedVideoFamilia3 | GeneratedVideoFamilia4

interface AuditCase {
  key: string
  family: VideoKnowledgeFormat
  rotationIndex: number
}

const CASES: AuditCase[] = [
  {key: 'meme_dinero', family: '3c', rotationIndex: 0},
  {key: 'meme_ahorro', family: '3c', rotationIndex: 2},
  {key: 'meme_no_publicar', family: '3c', rotationIndex: 3},
  {key: 'meme_despejar', family: '3c', rotationIndex: 6},
  {key: 'pov_llegada', family: '3b', rotationIndex: 0},
  {key: 'pov_plan', family: '3b', rotationIndex: 3},
  {key: 'reflexivo_tiempo', family: '3a', rotationIndex: 0},
  {key: 'conversacion_plan', family: '3d', rotationIndex: 1},
  {key: 'lugar_pin', family: '3e', rotationIndex: 0},
  {key: 'lugar_bienvenida', family: '3e', rotationIndex: 1},
  {key: 'storytelling', family: '2b', rotationIndex: 0},
  {key: 'consejos', family: '2c', rotationIndex: 0},
  {key: 'informacion_directa', family: '4', rotationIndex: 0},
  {key: 'informacion_directa_agua', family: '4', rotationIndex: 1},
  {key: 'informacion_directa_concha', family: '4', rotationIndex: 2},
]

const requestedCases = new Set(
  (process.env.MEXICO_VIDEO_QA_CASES ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean),
)
const RUN_CASES = requestedCases.size > 0
  ? CASES.filter(item => requestedCases.has(item.key))
  : CASES
const RENDER_REAL_VIDEOS = process.env.MEXICO_VIDEO_QA_RENDER === '1'

const DEFAULT_FONTS: Record<VideoKnowledgeFormat, VideoTypographyId[]> = {
  '1a': ['Inter'],
  '1b': ['Inter'],
  '1c': ['Inter'],
  '2a': ['oswald', 'plex', 'poppins'],
  '2b': ['oswald', 'plex', 'poppins'],
  '2c': ['oswald', 'plex', 'poppins'],
  '3a': ['cormorant', 'crimson text', 'Playfair Display'],
  '3b': ['poppins', 'plex', 'Inter'],
  '3c': ['poppins', 'plex', 'Inter'],
  '3d': ['poppins', 'plex', 'Inter'],
  '3e': ['cormorant', 'cinzel', 'elegant'],
  '4': ['oswald', 'poppins', 'plex'],
  '5': ['plex'],
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
    : []
}

function familyOf(piece: Generated): VideoKnowledgeFormat {
  return 'subfamilia' in piece ? piece.subfamilia : piece.familia
}

function visibleCopy(piece: Generated): string {
  if ('copy' in piece) return 'dato_duro' in piece && piece.dato_duro
    ? `${piece.copy}\n${piece.dato_duro}`
    : piece.copy
  if (piece.subfamilia === '2b') return [piece.apertura, ...piece.desarrollo, piece.cierre].filter(Boolean).join('\n')
  return [piece.titulo, ...piece.items, piece.cta].join('\n')
}

async function loadConfiguredFonts(
  db: ReturnType<typeof createClient<any>>,
  clientId: string,
): Promise<Map<string, VideoTypographyId[]>> {
  const [{data: templates, error: templateError}, {data: overrides, error: overrideError}] = await Promise.all([
    db.from('content_templates').select('id,type,metadata').eq('type', 'video'),
    db.from('content_template_overrides').select('template_id,enabled,custom_rules,salida_id').eq('client_id', clientId),
  ])
  if (templateError) throw templateError
  if (overrideError) throw overrideError
  const typedOverrides = (overrides ?? []) as Array<{
    template_id: string
    enabled: boolean
    salida_id: string | null
    custom_rules: Record<string, unknown> | null
  }>
  const typedTemplates = (templates ?? []) as Array<{
    id: string
    metadata: Record<string, unknown> | null
  }>
  const active = new Map(typedOverrides
    .filter(row => row.enabled && row.salida_id === null)
    .map(row => [row.template_id, row] as const))
  const result = new Map<string, VideoTypographyId[]>()
  for (const template of typedTemplates) {
    const override = active.get(template.id)
    const family = typeof template.metadata?.video_family === 'string' ? template.metadata.video_family : null
    if (!override || !family) continue
    const fonts = strings(override.custom_rules?.typography_ids).filter(isVideoTypographyId)
    if (fonts.length > 0) result.set(family, fonts)
  }
  return result
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Faltan variables de Supabase')
  const db = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}})

  const {data: profiles, error: profilesError} = await db.from('profiles').select('*')
  if (profilesError) throw profilesError
  const profile = (profiles ?? []).find(item => /alasycaminantes|renzo.*franco|franco.*renzo/iu.test(`${item.company_name ?? ''} ${item.full_name ?? ''}`))
  if (!profile) throw new Error('No se encontró el perfil Renzo + Franco')
  const [
    {data: onboarding, error: onboardingError},
    {data: salidas, error: salidasError},
    {data: brandIdentity, error: brandIdentityError},
  ] = await Promise.all([
    db.from('client_onboarding').select('*').eq('user_id', profile.id).single(),
    db.from('salidas').select('*').eq('user_id', profile.id),
    db.from('brand_identity').select('mati_cliente_id,color_primario,color_texto,font_body,videos_folder_id').eq('user_id', profile.id).maybeSingle(),
  ])
  if (onboardingError) throw onboardingError
  if (salidasError) throw salidasError
  if (brandIdentityError) throw brandIdentityError
  const salida = (salidas ?? [])
    .filter(item => /canc[uú]n|playa del carmen|m[eé]xico/iu.test(`${item.nombre ?? ''} ${item.destino ?? ''}`))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))[0]
  if (!salida) throw new Error('No existe una salida de Cancún/México para el cliente')

  const p = profile as Profile
  const o = onboarding as ClientOnboarding
  const s = salida as Salida
  const configuredFonts = await loadConfiguredFonts(db, p.id)
  const clientName = o.campaign_context?.nombre_publico ?? p.company_name ?? p.full_name ?? 'Renzo + Franco'
  const avoidByFamily = new Map<string, string[]>()
  const reports: Array<Record<string, unknown>> = []

  for (const [index, auditCase] of RUN_CASES.entries()) {
    const material = s.carpeta_videos_id
      ? await resolveEffectiveVideoMaterial(s.carpeta_videos_id, s.carpeta_videos_nombre, {
          selectionIndex: auditCase.rotationIndex,
          salida: s,
        })
      : null
    const allowed = configuredFonts.get(auditCase.family) ?? DEFAULT_FONTS[auditCase.family]
    const selectedFont = allowed[index % allowed.length]
    const recent = avoidByFamily.get(auditCase.family) ?? []
    const common = {
      salida: s,
      niche: p.niche as Niche,
      clientName,
      clientOnboarding: o,
      clipDurationSeconds: 15,
      tipografiasPermitidas: [selectedFont],
      carpeta: material?.folderName ?? s.carpeta_videos_nombre ?? '',
      materialContext: material?.materialContext ?? null,
    }
    const startedAt = Date.now()
    let piece: Generated
    if (auditCase.family === '2b') {
      piece = await generateVideoFamilia2({...common, subfamilia: '2b'})
    } else if (auditCase.family === '2c') {
      piece = await generateVideoFamilia2({...common, subfamilia: '2c'})
    } else if (auditCase.family === '4') {
      piece = await generateVideoFamilia4({
        ...common,
        canalesHabilitados: ['Instagram', 'TikTok'],
        rotationIndex: auditCase.rotationIndex,
        avoidCopies: recent,
      })
    } else {
      piece = await generateVideoFamilia3({
        ...common,
        subfamilia: auditCase.family as VideoFamilia3Subfamilia,
        rotationIndex: auditCase.rotationIndex,
        avoidCopies: recent,
      })
    }
    const generatedFamily = familyOf(piece)
    const copy = visibleCopy(piece)
    avoidByFamily.set(auditCase.family, [...recent, copy])
    const visualContract = resolveVideoVisualContract({
      subfamilia: generatedFamily,
      typographyId: piece.tipografia_id,
      seed: `qa-mexico:${auditCase.key}:${index}`,
    })
    let renderJob: Record<string, unknown> | null = null
    if (RENDER_REAL_VIDEOS) {
      if (!material) throw new Error(`${auditCase.key}: no hay material resuelto para render`)
      const built = buildFamiliesVideoPayload({
        id: `qa-mexico-${Date.now()}-${auditCase.key}`,
        subfamilia: generatedFamily,
        contract: {...piece, visual_contract: visualContract} as unknown as Record<string, unknown>,
        generationMetadata: {
          clipDurationSeconds: 15,
          video_folder_id: material.folderId,
          zona_geografica: s.zona_geografica,
          content_context_tags: s.context_tags,
        },
        videoCrudo: material.folderName,
        mes: null,
        fechaInicio: s.fecha_inicio,
        ownerProfile: {company_name: p.company_name, full_name: p.full_name},
        brandIdentity,
      })
      if (!built.ok) throw new Error(`${auditCase.key}: contrato no renderizable: ${built.error}`)
      const videoUrl = process.env.MATI_SKILL_VIDEOS_URL?.trim()
      if (!videoUrl) throw new Error('MEXICO_VIDEO_QA_RENDER requiere MATI_SKILL_VIDEOS_URL')
      const response = await fetch(videoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.MATI_SKILL_TOKEN?.trim()
            ? {Authorization: `Bearer ${process.env.MATI_SKILL_TOKEN.trim()}`}
            : {}),
        },
        body: JSON.stringify({
          ...built.payload,
          carpeta: material.folderName,
          carpetaId: material.folderId,
        }),
      })
      const responseBody = await response.text()
      if (response.status !== 202) {
        throw new Error(`${auditCase.key}: motor de video respondió ${response.status}: ${responseBody.slice(0, 300)}`)
      }
      const parsed = JSON.parse(responseBody) as {jobId?: unknown}
      if (typeof parsed.jobId !== 'string' && typeof parsed.jobId !== 'number') {
        throw new Error(`${auditCase.key}: el motor respondió sin jobId`)
      }
      renderJob = {
        jobId: String(parsed.jobId),
        statusUrl: `${videoUrl.replace(/\/api\/[^/]+\/?$/u, '')}/api/status/${String(parsed.jobId)}`,
      }
      console.error(`[QA MÉXICO/RENDER] ${auditCase.key}: job ${String(parsed.jobId)} encolado`)
    }
    reports.push({
      key: auditCase.key,
      requestedFamily: auditCase.family,
      generatedFamily,
      copy,
      structuredPiece: piece,
      renderer: visualContract,
      selectedMaterial: material ? {
        folderName: material.folderName,
        mentionPolicy: material.materialContext.mentionPolicy,
        verifiedSpecificName: material.materialContext.verifiedSpecificName,
      } : null,
      typographySource: configuredFonts.has(auditCase.family) ? 'client_design_studio' : 'curated_caribbean_default',
      renderJob,
      durationMs: Date.now() - startedAt,
    })
    console.error(`[QA MÉXICO/COPY] ${auditCase.key}: ${copy.replace(/\n/gu, ' / ')}`)
    console.error(`[QA MÉXICO] ${index + 1}/${RUN_CASES.length} ${auditCase.key} listo`)
  }

  console.log(JSON.stringify({
    qa: 'Mexico / Caribe · lote oficial de video',
    client: clientName,
    salida: {id: s.id, nombre: s.nombre, destino: s.destino},
    configuredTypographyFamilies: Object.fromEntries(configuredFonts),
    total: reports.length,
    reports,
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
