import { createClient } from '@supabase/supabase-js'
import type { ClientOnboarding, EstructuraNarrativa, Niche, Salida, TemaCarrusel } from '../types'

const SALIDA_ID = process.env.EDITORIAL_AUDIT_SALIDA_ID ?? 'f78eeaa8-33f3-4e4b-86bb-f5890bc244f5'

const CASES: Array<{ tema: TemaCarrusel; estructura: EstructuraNarrativa }> = [
  { tema: 'seguridad', estructura: 'problema_solucion' },
  { tema: 'destinos', estructura: 'storytelling' },
  { tema: 'preparacion_fisica', estructura: 'pregunta_respuesta' },
  { tema: 'equipo', estructura: 'paso_a_paso' },
  { tema: 'educacion_montana', estructura: 'lista_tips' },
  { tema: 'testimonios', estructura: 'storytelling' },
  { tema: 'detras_del_guia', estructura: 'pregunta_respuesta' },
  { tema: 'motivacion', estructura: 'antes_despues' },
  { tema: 'logistica', estructura: 'antes_despues' },
  { tema: 'dudas_objeciones', estructura: 'mito_vs_realidad' },
  { tema: 'bienestar', estructura: 'problema_solucion' },
]

const requestedThemes = new Set(
  (process.env.EDITORIAL_AUDIT_THEMES ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean),
)
const RUN_CASES = requestedThemes.size > 0
  ? CASES.filter(item => requestedThemes.has(item.tema))
  : CASES

function message(args: unknown[]): string {
  return args.map(value => value instanceof Error ? `${value.name}: ${value.message}` : typeof value === 'string' ? value : JSON.stringify(value)).join(' ')
}

async function main() {
  console.log('[AUDIT] Cargando motor Editorial...')
  const { generateCarrusel } = await import('../lib/generators/carrusel')
  console.log('[AUDIT] Motor Editorial cargado.')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de Supabase')
  const db = createClient(url, key)
  const { data: salida, error: salidaError } = await db.from('salidas').select('*').eq('id', SALIDA_ID).single()
  if (salidaError || !salida) throw salidaError ?? new Error('Salida no encontrada')
  const [{ data: onboarding }, { data: profile }, { data: knowledge }, { data: tiktok }] = await Promise.all([
    db.from('client_onboarding').select('*').eq('user_id', salida.user_id).single(),
    db.from('profiles').select('company_name, full_name, niche').eq('id', salida.user_id).single(),
    db.from('knowledge_base').select('*').eq('niche', 'trekking').eq('activo', true).limit(10),
    db.from('tiktok_intelligence').select('*').eq('nicho', 'trekking').eq('es_referencia', true).order('likes', { ascending: false }).limit(8),
  ])

  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  const reports: unknown[] = []
  const usedTemas: TemaCarrusel[] = []
  const usedAngulos: string[] = []
  const usedHookTypes: string[] = []
  const kbContext = (knowledge ?? []).map(item => `[${item.vertical}]\n${item.titulo}\n${item.contenido}`).join('\n\n')
  const tiktokContext = (tiktok ?? []).slice(0, 5).map(item => [item.caption, item.texto_miniatura].filter(Boolean).join(' — ')).filter(Boolean).join('\n')
  const clientProfileContext = [
    onboarding?.marca_personalidad,
    onboarding?.marca_lineas_rojas,
    onboarding?.marca_autoridad,
    onboarding?.avatar_objeciones,
  ].filter(Boolean).join('\n')

  for (const [index, item] of RUN_CASES.entries()) {
    const logs: string[] = []
    const capture = (...args: unknown[]) => {
      const text = message(args)
      if (/trunc|warning|warn|reintent|parse error|excede|fall[oó]|✓ paso|cta_comentario null/i.test(text)) logs.push(text)
    }
    console.log = capture
    console.warn = capture
    console.error = capture
    const startedAt = Date.now()
    try {
      const piece = await generateCarrusel({
        salida: salida as Salida,
        niche: (profile?.niche ?? 'trekking') as Niche,
        carpeta: salida.carpeta_fotos_nombre || 'Chalten/Paisajes',
        clientOnboarding: (onboarding as ClientOnboarding) ?? null,
        nicheContextText: '',
        clientProfileContext,
        kbContext,
        tiktokContext,
        hookContext: '',
        mesAnio: 'enero 2027',
        pieceIndex: index,
        totalPieces: RUN_CASES.length,
        usedTemas,
        temaAsignado: item.tema,
        usedAngulos,
        estructuraForzada: item.estructura,
        usedHookTypes,
      })
      usedTemas.push(piece.tema)
      if (piece.angulo) usedAngulos.push(piece.angulo)
      if (piece.hook_type) usedHookTypes.push(piece.hook_type)
      reports.push({
        numero: index + 1,
        solicitado: item,
        generadoSinError: true,
        jsonValido: true,
        duracionMs: Date.now() - startedAt,
        logs,
        resultado: piece,
      })
    } catch (error) {
      reports.push({
        numero: index + 1,
        solicitado: item,
        generadoSinError: false,
        jsonValido: false,
        duracionMs: Date.now() - startedAt,
        logs,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
    }
    originalLog(`[AUDIT] ${index + 1}/${RUN_CASES.length} ${item.tema} + ${item.estructura} completado`)
  }

  process.stdout.write(`\n===AUDIT_JSON===\n${JSON.stringify({
    salida: {
      id: salida.id,
      nombre: salida.nombre,
      destino: salida.destino,
      fecha_inicio: salida.fecha_inicio,
      fecha_fin: salida.fecha_fin,
      precio_usd: salida.precio_usd,
      moneda: salida.moneda,
      nivel: salida.nivel,
      cupos: salida.cupos,
    },
    reports,
  }, null, 2)}\n`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
