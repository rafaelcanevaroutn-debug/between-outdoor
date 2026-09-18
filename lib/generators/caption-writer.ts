import { generateWithRetryTracked } from '@/lib/gemini-core'
import type { ClientOnboarding, Salida, SlideCarrusel } from '@/types'
import { LIMITS_BY_FORMAT } from '@/lib/generators/carrusel-text-limits'

function extractJson(text: string): any {
  const m = text.match(/```json\s([\s\S]*?)```/)
  if (m) return JSON.parse(m[1])
  const idx = text.indexOf('{')
  if (idx !== -1) return JSON.parse(text.slice(idx, text.lastIndexOf('}') + 1))
  return JSON.parse(text)
}

function nullableText(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim().replace(/\bCHALTEN\b/g, 'CHALTÉN').replace(/\bChalten\b/g, 'Chaltén').replace(/\bchalten\b/g, 'chaltén')
}

function ctaKeyword(destino: string): string {
  return destino.trim().replace(/^(?:el|la|los|las)\s+/i, '').split(/[,–—-]/)[0].trim().toLocaleUpperCase('es-AR').replace(/\bCHALTEN\b/g, 'CHALTÉN') || 'INFO'
}

function buildCanonicalCommentCta(keyword: string): string {
  const cleanKeyword = keyword.trim().toUpperCase()
  return cleanKeyword === 'INFO' ? 'Comentá INFO para sumarte.' : `Comentá ${cleanKeyword} para recibir los detalles.`
}

export interface CaptionWriterParams {
  formato: 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar' | 'video'
  salida: Salida
  clientOnboarding: ClientOnboarding | null
  // Contenido gráfico generado en el paso 1
  graphicPieces: string | SlideCarrusel[]
}

export interface CaptionWriterResult {
  descripcion_post?: string // Mantenemos compatibilidad con el sistema anterior
  titulo_tiktok?: string
  descripcion_tiktok?: string
  descripcion_instagram?: string
}

function buildCaptionWriterPrompt(p: CaptionWriterParams): string {
  const isVideo = p.formato === 'video'
  
  let visualContentStr = ''
  if (Array.isArray(p.graphicPieces)) {
    visualContentStr = p.graphicPieces.map(s => {
      return `Slide ${s.n_slide} [${s.rol}]: ${s.texto_principal || ''} ${s.texto_apoyo || ''}`
    }).join('\n')
  } else {
    visualContentStr = p.graphicPieces
  }

  const destination = p.salida.destino ?? p.salida.nombre ?? 'el destino'
  const cta = buildCanonicalCommentCta(ctaKeyword(destination))
  const limitInstagram = isVideo ? 180 : (LIMITS_BY_FORMAT[p.formato as keyof typeof LIMITS_BY_FORMAT]?.descripcion_post ?? 1500)

  return `Sos el Subagente Redactor de Captions de Between Outdoor.
Tu única función es redactar los textos para acompañar el post, basándote en el contenido gráfico ya generado y adaptándolos a TikTok e Instagram.

=== REGLAS DEL SUBAGENTE (caption-writing) ===
1. NUNCA repitas palabra por palabra lo que ya está escrito en el contenido visual. Expandí la narrativa.
2. Usá emojis funcionalmente: 📍 para listas/itinerarios, 📌 o ➡️ para el CTA.
3. Respetá la vertical (ej: si es playa, cero montañas o trekking).
4. El caption debe cerrar con este CTA exacto: "${cta}"

=== REGLAS ZERNIO (MULTIPLATAFORMA) ===
- titulo_tiktok: OBLIGATORIO. Máximo 85 caracteres. Sin hashtags. Es un gancho corto.
- descripcion_tiktok: Más directa y concisa. Cierra con el CTA.
- descripcion_instagram: Más larga y narrativa (máx ${limitInstagram} caracteres). Cierra con el CTA.

=== CONTENIDO GRÁFICO GENERADO (NO REPETIR ESTO) ===
${visualContentStr}

=== SALIDA / DESTINO ===
Destino: ${destination}
Tipo: ${p.salida.tipo_viaje}
Días: ${p.salida.itinerario_dias?.length || 'No especificado'}

Respondé ÚNICAMENTE con JSON válido en este formato:
{
  "titulo_tiktok": "título corto...",
  "descripcion_tiktok": "texto con CTA...",
  "descripcion_instagram": "texto largo con CTA..."
}`
}

export async function generateCaptionForPiece(p: CaptionWriterParams): Promise<CaptionWriterResult> {
  try {
    const prompt = buildCaptionWriterPrompt(p)
    const result = await generateWithRetryTracked(prompt, `caption-writer[1/2]`)
    const extracted = extractJson(result.text)
    
    return {
      titulo_tiktok: nullableText(extracted.titulo_tiktok) ?? undefined,
      descripcion_tiktok: nullableText(extracted.descripcion_tiktok) ?? undefined,
      descripcion_instagram: nullableText(extracted.descripcion_instagram) ?? undefined,
      descripcion_post: nullableText(extracted.descripcion_instagram) ?? nullableText(extracted.descripcion_post) ?? undefined
    }
  } catch (error) {
    console.warn(`[CAPTION-WRITER] Error generando caption dedicado: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    return {} // Fallback
  }
}
