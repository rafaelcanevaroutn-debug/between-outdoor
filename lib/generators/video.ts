import { Salida, Niche, ClientOnboarding, TemaCarrusel, GeneratedVideo } from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'

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
  temaAsignado: TemaCarrusel
}

export async function generateVideo(params: GenerateVideoParams): Promise<GeneratedVideo> {
  const {
    salida,
    niche,
    carpeta,
    nicheContextText,
    clientProfileContext,
    kbContext,
    tiktokContext,
    hookContext,
    mesAnio,
    temaAsignado,
  } = params

  const prompt = `${nicheContextText}

${clientProfileContext}=== INSTRUCCIÓN ESPECÍFICA PARA VIDEO CORTOS ===
Estás creando el guion visual/texto para un VIDEO CORTO (Reel/TikTok/Short) enfocado en el tema: "${temaAsignado.toUpperCase()}".
⚠️ REGLA DE ORO: EL TEXTO DEBE SER EXTREMADAMENTE CORTO. Pensalo como UNA ÚNICA SLIDE o pantalla. Nadie lee textos largos en video.

ESTRUCTURA OBLIGATORIA:
1. "titulo": Un gancho (hook) súper potente de máximo 6-8 palabras que atrape de inmediato.
2. "subtitulo": Una frase corta de refuerzo (1 línea máximo).
3. "bullets": Máximo 3 o 4 viñetas (bullets). CADA viñeta debe tener MÁXIMO 3 a 5 palabras. (Ej: "Equipo ligero", "Comida incluida").
4. "cta": Llamado a la acción directo y conciso.

=== DATOS DE LA SALIDA ===
- Nombre: ${salida.nombre}
- Destino: ${salida.destino}
- Fecha: ${salida.fecha_inicio} al ${salida.fecha_fin}
- Precio: USD ${salida.precio_usd}${salida.sena_usd ? ` (seña: USD ${salida.sena_usd})` : ''}
- Nivel: ${salida.nivel}
- Cupos: ${salida.cupos}
- Tipo: ${salida.tipo_viaje.replace(/_/g, ' ')}
${salida.itinerario ? `- Itinerario: ${salida.itinerario}` : ''}
${salida.que_incluye ? `- Incluye: ${salida.que_incluye}` : ''}
${salida.que_no_incluye ? `- No incluye: ${salida.que_no_incluye}` : ''}
${salida.link_inscripcion ? `- Link inscripción: ${salida.link_inscripcion}` : ''}

=== MATERIAL DISPONIBLE ===
Carpeta de material: "${carpeta}"

${kbContext ? kbContext + '\n' : ''}${tiktokContext ? tiktokContext + '\n' : ''}${hookContext ? hookContext + '\n' : ''}
=== TAREA ===
Generá el texto para este video sobre el tema ${temaAsignado.toUpperCase()}.
⚠️ JERARQUÍA DE TONO:
1. VOZ DE MARCA (si está definida en PERFIL DEL CLIENTE)
2. NICHO (${niche.toUpperCase()})
NUNCA suenes a folleto publicitario, independientemente del nicho.
Recibí el canal de conversión de la voz de marca si existe y aplicalo en el CTA.

Devolvé SOLO un objeto JSON válido con los campos: "titulo", "subtitulo", "bullets" (array de strings) y "cta". Sin texto adicional, sin código markdown \`\`\`json.`

  const result = await generateWithRetryTracked(prompt, `video_${temaAsignado}`)

  const jsonMatch = result.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')

  const parsed = JSON.parse(jsonMatch[0])

  return {
    formato: 'video',
    tema: temaAsignado,
    vertical: 'promocional', // Default for DB constraints
    carpeta_material: carpeta,
    titulo: parsed.titulo || '',
    subtitulo: parsed.subtitulo || '',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    cta: parsed.cta || '',
    video_crudo: carpeta,
    mes: mesAnio,
    metadata: {
      _inputTokens: result.inputTokens,
      _outputTokens: result.outputTokens,
    }
  }
}
