/**
 * Trends Context — integración con TrendsMCP para el motor de generación.
 *
 * Responsabilidades:
 *   1. Rankear subverticales por score de tendencia actual (reemplaza rotación mecánica)
 *   2. Construir bloque de hooks reales para inyectar al prompt de Gemini
 *
 * Cache local de 7 días → ~4 consultas/mes dentro del free tier (100/mes).
 */

import fs from 'node:fs'
import path from 'node:path'
import type { SubVertical } from '@/types'

const API_KEY    = process.env.TRENDS_MCP_API_KEY || ''
const API_URL    = 'https://api.trendsmcp.ai/mcp'
const CACHE_PATH = path.join(process.cwd(), 'data', 'trends-cache.json')
const CACHE_TTL  = 15 * 24 * 60 * 60 * 1000  // 15 días → máx 2 refreshes/mes

// Singleton en memoria: una vez cargado en el proceso, no vuelve a tocar disco ni API
let _memCache: TrendsCache | null = null
// Deduplicación: si dos llamadas paralelas llegan al mismo tiempo, solo hace una llamada a la API
let _refreshPromise: Promise<TrendsCache> | null = null

// ── Mapeo subvertical → keyword proxy en Google Search ─────────────────────
const SUBVERTICAL_KEYWORD: Partial<Record<SubVertical, string>> = {
  desconexion:          'digital detox',
  naturaleza_terapia:   'mental health nature',
  bienestar_fisico:     'outdoor fitness',
  reflexion:            'mindfulness outdoor',
  ansiedad_depresion:   'burnout escape',
  conexion_humana:      'group travel',
  critica_vida_moderna: 'work life balance',
  la_tribu:             'adventure community',
  convivencia:          'travel friends',
  logros_grupo:         'group adventure',
}

// ── Keywords para generación de hooks ──────────────────────────────────────
const HOOK_KEYWORDS = [
  'mental health nature',
  'digital detox',
  'group travel',
  'outdoor adventure',
  'burnout escape',
  'adventure travel',
  'hiking',
]

// Traducción de keywords al lenguaje del nicho outdoor
const HOOK_HINTS: Record<string, string> = {
  'mental health nature':  'hooks sobre reset mental, naturaleza como medicina, salir del loop de ansiedad',
  'digital detox':         'hooks sobre apagar el teléfono, el ruido digital, escapar de las pantallas',
  'group travel':          'hooks sobre conocer gente real, no ir solo, la tribu que se forma en el camino',
  'outdoor adventure':     'hooks sobre hacer algo que valga la pena, salir de la zona de confort',
  'burnout escape':        'hooks sobre el agotamiento real, el cuerpo que pide parar, la montaña como respuesta',
  'adventure travel':      'hooks sobre viajes que te cambian, no solo destinos sino experiencias',
  'hiking':                'hooks directos y concretos: destino, marcha, lo que se siente al llegar',
  'solo travel':           'hooks para quien viene solo: venís solo, no te vas a sentir solo',
  'Patagonia travel':      'hooks sobre la escala, la magnitud, lo que no entra en una foto',
  'work life balance':     'hooks irónicos sobre el modo automático, el trabajo que no para, la trampa de la rutina',
  'adventure community':   'hooks sobre pertenencia, identidad compartida, la gente que elige lo mismo que vos',
  'travel friends':        'hooks sobre amistades reales que se forman en la montaña',
  'group adventure':       'hooks sobre logros colectivos, el equipo que llega junto a la cumbre',
  'outdoor fitness':       'hooks sobre el cansancio sano vs el cansancio de escritorio',
  'mindfulness outdoor':   'hooks contemplativos, el silencio de la montaña, pensar sin ruido',
}

// ── Tipos ──────────────────────────────────────────────────────────────────
interface TrendScore {
  keyword:  string
  growth3M: number
  growth1Y: number
  score:    number
}

interface TrendsCache {
  updatedAt:         string
  subverticalScores: Partial<Record<SubVertical, TrendScore>>
  hookScores:        TrendScore[]
}

// ── API call ────────────────────────────────────────────────────────────────
async function fetchGrowth(keyword: string): Promise<{ growth3M: number; growth1Y: number } | null> {
  if (!API_KEY) return null
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'tools/call',
        params: {
          name: 'trendsMCP___get_growth',
          arguments: { keyword, source: 'google search', percent_growth: ['3M', '1Y'] },
        },
      }),
    })
    const json = await res.json() as Record<string, unknown>
    const content = ((json?.result as Record<string, unknown>)?.content as Array<{ text: string }>) ?? []
    if (!content[0]) return null
    const outer = JSON.parse(content[0].text) as { body: string }
    const body = JSON.parse(outer.body) as { results?: Array<{ period: string; growth: number; status: string }> }
    const results = body.results ?? []
    const g3M = results.find(r => r.period === '3M' && r.status === 'success')?.growth ?? 0
    const g1Y = results.find(r => r.period === '1Y' && r.status === 'success')?.growth ?? 0
    return { growth3M: g3M, growth1Y: g1Y }
  } catch {
    return null
  }
}

// ── Cache ───────────────────────────────────────────────────────────────────
function readCache(): TrendsCache | null {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    const cache = JSON.parse(raw) as TrendsCache
    if (!cache.updatedAt) return null
    if (Date.now() - new Date(cache.updatedAt).getTime() > CACHE_TTL) return null
    return cache
  } catch {
    return null
  }
}

function writeCache(cache: TrendsCache): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
}

async function refreshCache(): Promise<TrendsCache> {
  console.log('[TRENDS] Actualizando cache de tendencias...')

  const subverticalScores: Partial<Record<SubVertical, TrendScore>> = {}

  for (const [sv, keyword] of Object.entries(SUBVERTICAL_KEYWORD) as [SubVertical, string][]) {
    const g = await fetchGrowth(keyword)
    if (g) {
      const score = (g.growth3M + g.growth1Y) / 2
      subverticalScores[sv] = { keyword, growth3M: g.growth3M, growth1Y: g.growth1Y, score }
      const s3  = `${g.growth3M >= 0 ? '+' : ''}${g.growth3M.toFixed(0)}%`
      const s1y = `${g.growth1Y >= 0 ? '+' : ''}${g.growth1Y.toFixed(0)}%`
      console.log(`[TRENDS]   ${sv} (${keyword}): 3M=${s3} 1Y=${s1y}`)
    }
  }

  const hookScores: TrendScore[] = []
  for (const keyword of HOOK_KEYWORDS) {
    const g = await fetchGrowth(keyword)
    if (g) {
      hookScores.push({ keyword, growth3M: g.growth3M, growth1Y: g.growth1Y, score: (g.growth3M + g.growth1Y) / 2 })
    }
  }
  hookScores.sort((a, b) => b.score - a.score)

  const cache: TrendsCache = { updatedAt: new Date().toISOString(), subverticalScores, hookScores }
  writeCache(cache)
  console.log(`[TRENDS] Cache actualizado — ${Object.keys(subverticalScores).length} subverticales, ${hookScores.length} hook keywords`)
  return cache
}

// ── Punto de entrada único al cache ─────────────────────────────────────────
// Orden de prioridad: memoria → disco → API (solo si el disco está vencido/ausente)
async function getCache(): Promise<TrendsCache | null> {
  if (!API_KEY) return null

  // 1. Memoria: ya cargado en este proceso → cero overhead
  if (_memCache) return _memCache

  // 2. Disco: fresco (< 15 días) → carga a memoria y listo
  const disk = readCache()
  if (disk) {
    _memCache = disk
    console.log('[TRENDS] Cache cargado desde disco (sin llamadas a API)')
    return _memCache
  }

  // 3. API: cache vencido o inexistente → una sola llamada, deduplicada
  if (!_refreshPromise) {
    _refreshPromise = refreshCache().finally(() => { _refreshPromise = null })
  }
  try {
    _memCache = await _refreshPromise
    return _memCache
  } catch {
    return null
  }
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Rankea subverticales de mayor a menor score de tendencia actual.
 * Si no hay API key o falla, devuelve el orden original sin romper la generación.
 */
export async function rankSubverticals(subverticals: SubVertical[]): Promise<SubVertical[]> {
  if (!API_KEY) return subverticals
  try {
    const cache = await getCache()
    if (!cache) return subverticals
    const scored = subverticals.map(sv => ({
      sv,
      score: cache.subverticalScores[sv]?.score ?? 0,
    }))
    scored.sort((a, b) => b.score - a.score)
    const ranked = scored.map(x => x.sv)
    console.log(`[TRENDS] Subverticales rankeados por tendencia: ${ranked.join(' > ')}`)
    return ranked
  } catch {
    return subverticals
  }
}

/**
 * Bloque de texto para inyectar al prompt con hooks basados en tendencias reales.
 * Devuelve string vacío si no hay API key o falla.
 */
export async function buildHookContext(): Promise<string> {
  if (!API_KEY) return ''
  try {
    const cache = await getCache()
    if (!cache) return ''
    const top = cache.hookScores.filter(h => h.score > 0).slice(0, 5)
    if (top.length === 0) return ''

    const lines = top.map(h => {
      const s1y = `${h.growth1Y >= 0 ? '+' : ''}${h.growth1Y.toFixed(0)}%`
      const hint = HOOK_HINTS[h.keyword] ?? 'usá este tema como eje del hook'
      return `- "${h.keyword}" ${s1y} en 1 año → ${hint}`
    })

    return `=== TENDENCIAS REALES ESTA SEMANA (para construir hooks) ===
Estos términos están creciendo en búsquedas. Usalos como SEÑAL de qué conecta con la audiencia ahora — NO los copies literalmente, transladarlos al tono del nicho:

${lines.join('\n')}

REGLA: El hook debe sonar como alguien que entiende lo que siente el buyer, no como un análisis de datos.`
  } catch {
    return ''
  }
}
