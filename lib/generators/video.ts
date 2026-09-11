import { Salida, Niche, ClientOnboarding, TemaVideo, GeneratedVideo } from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import { buildVideoPrompt } from '@/lib/prompts/video'

export interface GenerateVideoParams {
  salida: Salida
  niche: Niche
  carpeta: string
  clientOnboarding: ClientOnboarding | null
  nicheContextText: string
  clientProfileContext: string
  kbContext: string
  tiktokContext: string
  hookContext: string
  mesAnio: string
  pieceIndex: number
  totalPieces: number
  temaAsignado: TemaVideo
}

export async function generateVideo(params: GenerateVideoParams): Promise<GeneratedVideo> {
  const {
    carpeta,
    mesAnio,
    temaAsignado,
  } = params

  const prompt = buildVideoPrompt(params)

  const result = await generateWithRetryTracked(prompt, `video_${temaAsignado}`)

  const jsonMatch = result.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  const parsed = JSON.parse(jsonMatch[0])

  return {
    formato: 'video',
    tema: temaAsignado,
    vertical: 'promocional', // Default for DB constraints
    carpeta_material: carpeta,
    titulo: parsed.texto_en_pantalla || parsed.titulo || '',
    subtitulo: parsed.toma_sugerida || parsed.subtitulo || '',
    toma_sugerida: parsed.toma_sugerida || parsed.subtitulo || '',
    descripcion_post: parsed.descripcion_post || '',
    bullets: [], // En formato video NUNCA se generan bullets
    cta: parsed.cta || '',
    video_crudo: carpeta,
    mes: mesAnio,
    metadata: {
      _inputTokens: result.inputTokens,
      _outputTokens: result.outputTokens,
    },
  }
}
