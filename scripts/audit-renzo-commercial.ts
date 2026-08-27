import { createClient } from '@supabase/supabase-js'
import type { ClientOnboarding, Profile, Salida } from '@/types'
import {
  assertCommercialCopy,
  buildLocalCampaignBanner,
  getCommercialWeekRecipe,
  projectSalidaForCommercialProfile,
  resolveContentProfile,
} from '@/lib/commercial-content-profiles'
import { planWeeklyFormats } from '@/lib/calendar-format-plan'
import { resolveWeeklyBatch } from '@/lib/calendar-resolver'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import { generateVideoFamilia2 } from '@/lib/generators/video-familia-2'
import { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import { buildBannerMolde5 } from '@/lib/generators/banner-moldes-commercial'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Faltan variables de Supabase')

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function loadAccount(companyName: string) {
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('*')
    .eq('company_name', companyName)
    .single()
  if (profileError || !profile) throw profileError ?? new Error(`No existe ${companyName}`)

  const [{ data: onboarding, error: onboardingError }, { data: salidas, error: salidasError }] = await Promise.all([
    db.from('client_onboarding').select('*').eq('user_id', profile.id).single(),
    db.from('salidas').select('*').eq('user_id', profile.id),
  ])
  if (onboardingError) throw onboardingError
  if (salidasError) throw salidasError
  return {
    profile: profile as Profile,
    onboarding: onboarding as ClientOnboarding,
    salidas: (salidas ?? []) as Salida[],
  }
}

function summary(label: string, value: unknown, onboarding: ClientOnboarding) {
  try {
    assertCommercialCopy(value, onboarding)
  } catch (error) {
    console.error(`\n=== ${label} · PIEZA RECHAZADA ===`)
    console.error(JSON.stringify(value, null, 2))
    throw error
  }
  console.log(`\n=== ${label} ===`)
  console.log(JSON.stringify(value, null, 2))
}

async function main() {
  const local = await loadAccount('Caminantes de montaña')
  const duo = await loadAccount('alasycaminantes')

  if (process.argv.includes('--plan-only')) {
    for (const account of [local, duo]) {
      const profile = resolveContentProfile(account.onboarding)
      console.log(`\n=== ${account.profile.company_name} · ${profile} ===`)
      console.log(JSON.stringify(Array.from({ length: 4 }, (_, index) => ({
        semana: index + 1,
        receta: getCommercialWeekRecipe(profile, index),
        piezas: planWeeklyFormats(
          account.profile.calendario_asignado,
          resolveWeeklyBatch({
            calendarCode: account.profile.calendario_asignado,
            salidas: account.salidas,
            weekIndex: index,
          }),
          new Set(account.salidas.filter(item => item.carpeta_videos_id).map(item => item.id)),
          { contentProfile: profile, rotationIndex: index },
        ).map(slot => ({
          dia: slot.dia,
          formato: slot.formatoContenido,
          carrusel: slot.formatoContenido === 'carrusel' ? slot.formatoCarrusel : undefined,
          banner: slot.bannerMolde,
          video: slot.videoSubfamilia,
          eje: slot.commercialContentAxis,
          salida: account.salidas.find(item => item.id === slot.salidaId)?.nombre ?? null,
        })),
      })), null, 2))
    }
    return
  }

  const localSource = local.salidas.find(item => item.carpeta_videos_nombre && item.carpeta_fotos_nombre)
    ?? local.salidas.find(item => item.carpeta_videos_nombre)
    ?? local.salidas[0]
  const duoSource = duo.salidas.find(item => item.que_incluye && item.detalles_agencia)
    ?? duo.salidas[0]
  if (!localSource || !duoSource) throw new Error('Faltan salidas fuente para la auditoría')

  const localEditorial = projectSalidaForCommercialProfile(localSource, local.onboarding)
  const localName = local.onboarding.campaign_context?.nombre_publico ?? 'Caminantes de Montaña'
  const duoName = duo.onboarding.campaign_context?.nombre_publico ?? 'Renzo + Franco'

  const localDirect = await generateVideoFamilia4({
    salida: localSource,
    niche: local.profile.niche,
    clientName: localName,
    clientOnboarding: local.onboarding,
    clipDurationSeconds: 10,
    canalesHabilitados: [],
    tipografiasPermitidas: ['Inter', 'Montserrat'],
    carpeta: localSource.carpeta_videos_nombre ?? '',
  })
  summary('LOCAL · VIDEO DIRECTO', localDirect, local.onboarding)

  const localPlace = await generateVideoFamilia3({
    subfamilia: '3e',
    salida: localSource,
    niche: local.profile.niche,
    clientName: localName,
    clientOnboarding: local.onboarding,
    clipDurationSeconds: 10,
    tipografiasPermitidas: ['Inter', 'Montserrat'],
    carpeta: localSource.carpeta_videos_nombre ?? '',
  })
  summary('LOCAL · VIDEO LUGAR', localPlace, local.onboarding)

  const localBanner = buildLocalCampaignBanner(local.onboarding, localEditorial)
  if (!localBanner) throw new Error('No se pudo construir el banner local')
  summary('LOCAL · BANNER COMUNIDAD', localBanner, local.onboarding)

  for (const [index, format] of (['organico', 'conversacion'] as const).entries()) {
    const carousel = await generateAdaptiveCarrusel({
      formato: format,
      salida: localEditorial,
      niche: local.profile.niche,
      clientName: localName,
      clientOnboarding: local.onboarding,
      objetivo: 'convertir',
      carpeta: localSource.carpeta_fotos_nombre ?? '',
      mesAnio: 'campaña vigente',
      imageFiles: [],
      variantCount: 2,
      variantIndex: index + 1,
    })
    summary(`LOCAL · CARRUSEL ${format.toUpperCase()} ${index + 1}`, carousel, local.onboarding)
  }

  if (process.argv.includes('--local-only')) return

  const duoStory = await generateVideoFamilia2({
    subfamilia: '2b',
    salida: duoSource,
    niche: duo.profile.niche,
    clientName: duoName,
    clientOnboarding: duo.onboarding,
    clipDurationSeconds: 10,
    tipografiasPermitidas: ['Inter', 'Montserrat'],
    carpeta: duoSource.carpeta_videos_nombre ?? '',
  })
  summary('DUPLA · VIDEO STORYTELLING', duoStory, duo.onboarding)

  const duoHumor = await generateVideoFamilia3({
    subfamilia: '3c',
    salida: duoSource,
    niche: duo.profile.niche,
    clientName: duoName,
    clientOnboarding: duo.onboarding,
    clipDurationSeconds: 10,
    tipografiasPermitidas: ['Inter', 'Montserrat'],
    carpeta: duoSource.carpeta_videos_nombre ?? '',
  })
  summary('DUPLA · VIDEO HUMOR', duoHumor, duo.onboarding)

  const duoDirect = await generateVideoFamilia4({
    salida: duoSource,
    niche: duo.profile.niche,
    clientName: duoName,
    clientOnboarding: duo.onboarding,
    clipDurationSeconds: 10,
    canalesHabilitados: ['Instagram'],
    tipografiasPermitidas: ['Inter', 'Montserrat'],
    carpeta: duoSource.carpeta_videos_nombre ?? '',
  })
  summary('DUPLA · VIDEO DIRECTO', duoDirect, duo.onboarding)

  const duoBanner = buildBannerMolde5({ salida: duoSource, cta: 'Pedí la propuesta', typographyId: 'Inter' })
  summary('DUPLA · BANNER PAQUETE', duoBanner, duo.onboarding)

  for (const format of ['itinerario', 'conversacion'] as const) {
    const carousel = await generateAdaptiveCarrusel({
      formato: format,
      salida: duoSource,
      niche: duo.profile.niche,
      clientName: duoName,
      clientOnboarding: duo.onboarding,
      objetivo: 'convertir',
      carpeta: duoSource.carpeta_fotos_nombre ?? '',
      mesAnio: 'enero 2027',
      imageFiles: [],
    })
    summary(`DUPLA · CARRUSEL ${format.toUpperCase()}`, carousel, duo.onboarding)
  }
}

main().catch(error => {
  console.error('\n[AUDITORÍA COMERCIAL] FALLÓ:', error)
  process.exitCode = 1
})
