import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createAdminClient } from '@/lib/supabase/admin'

// Allow up to 3 minutes — Apify scraping + Gemini Vision on thumbnails
export const maxDuration = 180

const APIFY_TOKEN = process.env.APIFY_TOKEN
const APIFY_ACTOR = 'clockworks~tiktok-scraper'

// Use Gemini Vision to extract overlay text from a thumbnail URL
async function extractTextFromThumbnail(thumbnailUrl: string): Promise<string> {
  try {
    // TikTok CDN requires browser-like headers to serve images from server-side
    const imageRes = await fetch(thumbnailUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })

    if (!imageRes.ok) {
      console.error(`Thumbnail fetch failed: ${imageRes.status} ${thumbnailUrl}`)
      return ''
    }

    const buffer = await imageRes.arrayBuffer()
    if (buffer.byteLength === 0) return ''

    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = (imageRes.headers.get('content-type') || 'image/jpeg').split(';')[0]

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: 'Extraé únicamente el texto escrito o sobreimpreso en esta imagen (hooks, títulos, frases en pantalla, subtítulos). Si no hay texto visible respondé exactamente: [sin texto]. Respondé solo con el texto encontrado, sin explicaciones.' },
          ],
        },
      ],
    })

    const text = (result.text ?? '').trim()
    return text === '[sin texto]' ? '' : text
  } catch (err) {
    console.error('extractTextFromThumbnail error:', err)
    return ''
  }
}

// POST /api/scrape — trigger Apify scraping, analyze thumbnails with Gemini, save results
export async function POST(request: NextRequest) {
  try {
    const { niche, searchQueries = [], hashtags = [], profiles = [] } = await request.json()

    if (!niche) {
      return NextResponse.json({ error: 'nicho requerido' }, { status: 400 })
    }
    if (!APIFY_TOKEN) {
      return NextResponse.json({ error: 'APIFY_TOKEN no está configurado en .env.local' }, { status: 500 })
    }
    if (searchQueries.length === 0 && hashtags.length === 0 && profiles.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos una búsqueda, hashtag o perfil' }, { status: 400 })
    }

    const input: Record<string, unknown> = {
      resultsPerPage: 20,
      shouldDownloadVideos: false,
      shouldDownloadCovers: true,   // Apify stores covers on its own CDN — no TikTok CDN restrictions
      shouldDownloadSubtitles: false,
    }
    if (searchQueries.length > 0) input.searchQueries = searchQueries
    if (hashtags.length > 0) input.hashtags = hashtags
    if (profiles.length > 0) input.profiles = profiles

    // Start Apify run and wait up to 90s for completion
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}&waitForFinish=90`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    )

    if (!runResponse.ok) {
      const errText = await runResponse.text()
      return NextResponse.json({ error: `Error de Apify (${runResponse.status}): ${errText}` }, { status: 502 })
    }

    const runData = await runResponse.json()
    const run = runData.data

    if (!run || run.status !== 'SUCCEEDED') {
      return NextResponse.json(
        { error: `El scraping terminó con estado: ${run?.status ?? 'desconocido'}. Intentá con menos hashtags o esperá un momento.` },
        { status: 502 }
      )
    }

    // Fetch scraped items from Apify dataset
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=100`
    )
    if (!datasetResponse.ok) {
      return NextResponse.json({ error: 'Error al obtener resultados de Apify' }, { status: 502 })
    }

    const rawItems = await datasetResponse.json()

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ count: 0, message: 'No se encontraron resultados para esa búsqueda' })
    }

    // — DIAGNOSTIC LOG — remove after confirming field names
    if (rawItems[0]) {
      const sample = rawItems[0]
      console.log('[SCRAPE] First item keys:', Object.keys(sample))
      console.log('[SCRAPE] covers:', sample.covers)
      console.log('[SCRAPE] dynamicCovers:', sample.dynamicCovers)
      console.log('[SCRAPE] videoMeta:', sample.videoMeta)
      console.log('[SCRAPE] text snippet:', String(sample.text || '').slice(0, 80))
    }

    const sourceQuery = [
      ...searchQueries.map((s: string) => s),
      ...hashtags.map((h: string) => `#${h}`),
      ...profiles.map((p: string) => `@${p}`),
    ].join(', ')

    // Map raw Apify items to our schema (extract thumbnail URL too)
    type RawRow = {
      nicho: string
      plataforma: string
      caption: string
      views: number
      likes: number
      comments: number
      shares: number
      hashtags: string[]
      duracion: number | null
      video_url: string | null
      thumbnail_url: string | null
      source_query: string
      es_referencia: boolean
      texto_miniatura: string
    }

    const rows: RawRow[] = rawItems
      .filter((item: Record<string, unknown>) => item.text || item.caption)
      .map((item: Record<string, unknown>) => {
        const stats = (item.stats as Record<string, number> | undefined) || {}
        const videoMeta = (item.videoMeta as Record<string, unknown> | undefined) || {}
        const rawHashtags = (item.hashtags as Array<string | Record<string, string>>) || []
        const covers = (item.covers as string[] | undefined) || []
        const dynamicCovers = (item.dynamicCovers as string[] | undefined) || []

        // Static cover first (most reliable from TikTok CDN),
        // dynamic cover as fallback
        const thumbnail_url =
          covers[0] ||
          (videoMeta.coverUrl as string | undefined) ||
          dynamicCovers[0] ||
          null

        return {
          nicho: niche,
          plataforma: 'tiktok',
          caption: (item.text as string) || (item.caption as string) || '',
          views: (item.playCount as number) || stats.playCount || 0,
          likes: (item.diggCount as number) || stats.diggCount || 0,
          comments: (item.commentCount as number) || stats.commentCount || 0,
          shares: (item.shareCount as number) || stats.shareCount || 0,
          hashtags: rawHashtags
            .map(h => (typeof h === 'string' ? h : h.name || h.text || ''))
            .filter(Boolean),
          duracion: (videoMeta.duration as number | undefined) || (item.duration as number | undefined) || null,
          video_url: (item.webVideoUrl as string | undefined) || (item.url as string | undefined) || null,
          thumbnail_url,
          source_query: sourceQuery,
          // Auto-mark as reference so Gemini uses them immediately
          es_referencia: true,
          texto_miniatura: '',
        }
      })

    // Run Gemini Vision on all thumbnails in parallel
    const visionResults = await Promise.allSettled(
      rows.map(row =>
        row.thumbnail_url
          ? extractTextFromThumbnail(row.thumbnail_url)
          : Promise.resolve('')
      )
    )

    visionResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        rows[i].texto_miniatura = result.value
      }
    })

    const supabase = createAdminClient()

    // Delete previous records for this niche before inserting fresh ones
    const { error: deleteError } = await supabase
      .from('tiktok_intelligence')
      .delete()
      .eq('nicho', niche)
    if (deleteError) {
      console.error('[SCRAPE] Delete error:', deleteError.message)
    } else {
      console.log('[SCRAPE] Deleted previous records for nicho:', niche)
    }

    const { error: insertError } = await supabase
      .from('tiktok_intelligence')
      .insert(rows)

    if (insertError) {
      console.error('[SCRAPE] Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    console.log('[SCRAPE] Inserted', rows.length, 'rows. thumbnail_urls found:', rows.filter(r => r.thumbnail_url).length)

    return NextResponse.json({ count: rows.length, success: true })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al scrapear' },
      { status: 500 }
    )
  }
}

// GET /api/scrape?niche=trekking — fetch saved items for a niche
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const niche = searchParams.get('niche')

    const supabase = createAdminClient()
    let query = supabase
      .from('tiktok_intelligence')
      .select('*')
      .order('scrapeado_en', { ascending: false })
      .limit(200)

    if (niche && niche !== 'all') {
      query = query.eq('nicho', niche)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener datos' },
      { status: 500 }
    )
  }
}

// PATCH /api/scrape?id=xxx — toggle es_referencia
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const body = await request.json()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('tiktok_intelligence')
      .update({ es_referencia: body.es_referencia })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar' },
      { status: 500 }
    )
  }
}

// DELETE /api/scrape?id=xxx — delete an item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('tiktok_intelligence').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al eliminar' },
      { status: 500 }
    )
  }
}
