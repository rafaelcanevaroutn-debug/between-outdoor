import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { generateContentForSalida } from '../lib/gemini'
import type { ClientOnboarding, EstructuraNarrativa, KnowledgeBase, Niche, Salida, TemaCarrusel, TikTokIntelligence } from '../types'

const SALIDA_ID = '2cf2a2c5-796b-4e59-89b4-2045ccde4b58'

const CASES: Array<{ tema: TemaCarrusel; estructura: EstructuraNarrativa }> = [
  { tema: 'destinos', estructura: 'storytelling' },
  { tema: 'seguridad', estructura: 'problema_solucion' },
  { tema: 'preparacion_fisica', estructura: 'pregunta_respuesta' },
  { tema: 'motivacion', estructura: 'lista_tips' },
  { tema: 'dudas_objeciones', estructura: 'mito_vs_realidad' },
  { tema: 'equipo', estructura: 'paso_a_paso' },
  { tema: 'logistica', estructura: 'antes_despues' },
]

function loadText(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'lib/knowledge', relativePath), 'utf-8')
  } catch {
    return ''
  }
}

function message(args: unknown[]): string {
  return args.map(value => value instanceof Error ? `${value.name}: ${value.message}` : typeof value === 'string' ? value : JSON.stringify(value)).join(' ')
}

async function main() {
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

  for (const [index, item] of CASES.entries()) {
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
      const pieces = await generateContentForSalida(
        salida as Salida,
        { autoridad: 'Chalten/Paisajes' },
        (knowledge ?? []) as KnowledgeBase[],
        (profile?.niche ?? 'trekking') as Niche,
        profile?.company_name || profile?.full_name || 'Caminantes de Montaña',
        (tiktok ?? []) as TikTokIntelligence[],
        'vender_salida',
        {},
        1,
        (onboarding as ClientOnboarding) ?? null,
        'carrusel',
        loadText('global/anti-patterns.md'),
        {
          patronesText: loadText('nichos/trekking/patrones.md'),
          storytellingText: loadText('formatos/carrusel_storytelling.md'),
          reflexionText: loadText('formatos/reflexion.md'),
        },
        [item],
      )
      const piece = pieces[0]
      if (!piece || piece.formato !== 'carrusel') throw new Error('El motor no devolvió un carrusel')
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
    originalLog(`[AUDIT] ${index + 1}/7 ${item.tema} + ${item.estructura} completado`)
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
