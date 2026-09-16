import type { Salida, Niche, TemaVideo } from '@/types'
import { buildSalidaContentContextPrompt } from '@/lib/content-context/prompt'

export const VIDEO_GOLDEN_RULES = `⚠️ REGLA DE ORO DE FORMATO VIDEO (Reels / TikTok):
1. **LOS VIDEOS NO LLEVAN BULLETS:** En video corto nadie lee listas de viñetas. Las viñetas quedan reservadas solo para piezas estáticas o flyers.
2. **ESTRUCTURA DE 2 NIVELES EN PANTALLA (TITULO + SUBTITULO):**
   - "titulo": Hook o texto principal en pantalla (< 10 palabras) que frene el scroll:
     * Salidas locales:
       a) Lugar + Sub-camino / Variante (ej: 'Villa Padre Monti + Viaducto', 'San Javier · Puerta del Cielo', 'San Javier · Casco Viejo').
       b) Desconexión directa (ej: 'Esto y no estar en internet', 'Tu cable a tierra de la semana').
       c) Reflexión sobre el sendero / historia (ej: 'El trekking también es caminar por los senderos que nos dejó la historia').
   - "subtitulo": CTA o remate VISIBLE EN EL PROPIO VIDEO invitando a comentar:
     * Ejemplos en salidas locales: 'Comentá para más info', 'Comentá para más info sobre trekking', 'Comentá si querés también caminar por aquí', 'Comentá HORCO MOLLE y te sumamos'.
3. "descripcion_post": Caption breve para el feed/post. En TikTok y Reels debe priorizar que la audiencia COMENTE en la publicación para disparar interacciones (no mandar a DM directo).
4. "cta": Llamado a la acción claro y concreto invitando a comentar la publicación:
   - Salidas locales (ej. Horco Molle): Usar el nombre completo: ej. 'Comentá HORCO MOLLE y te sumamos al grupo' (NUNCA recortar a solo 'HORCO').
   - Expediciones de montaña (ej. Chaltén): Decir 'Comentá CHALTÉN para recibir información' o 'para recibir toda la data'. NUNCA usar la palabra 'itinerario'.
   - Playa / Caribe: Decir 'Comentá PLAYA y te paso información del viaje' o 'te paso la data sobre este viaje al caribe' (NUNCA 'pedí fechas por DM').
5. "bullets": Siempre un array vacío [].`


export const VIDEO_THEME_INSTRUCTIONS: Record<TemaVideo, string> = {
  motivacional: 'Foco: INSPIRACIÓN. Conecta emocionalmente, motivando a salir de la zona de confort y vivir la experiencia al máximo.',
  pov: 'Foco: POV (Point of View). Describe la perspectiva en primera persona para que el espectador sienta que está viviendo la experiencia inmersiva allí mismo.',
  comercial: 'Foco: VENTA DIRECTA Y DATOS (Placa comercial). Destaca la información dura de la salida (fechas, precio, destino, cupos, nivel). El objetivo principal es vender la propuesta directamente y que quede claro de qué viaje hablamos.',
}

export const VIDEO_OUTPUT_SCHEMA_INSTRUCTIONS = `Devolvé SOLO un objeto JSON válido con los campos: "titulo", "subtitulo", "descripcion_post", "cta" y "bullets" (array vacío []). Sin texto adicional, sin código markdown \`\`\`json.`

export function formatSalidaDataBlock(salida: Salida): string {
  const lines: string[] = [
    '=== DATOS DE LA SALIDA ===',
    `- Nombre: ${salida.nombre}`,
    `- Destino: ${salida.destino}`,
    `- Fecha: ${salida.fecha_inicio} al ${salida.fecha_fin}`,
    `- Precio: USD ${salida.precio_usd}${salida.sena_usd ? ` (seña: USD ${salida.sena_usd})` : ''}`,
    `- Nivel: ${salida.nivel}`,
    `- Cupos: ${salida.cupos}`,
    `- Tipo: ${salida.tipo_viaje.replace(/_/g, ' ')}`,
  ]

  if (salida.itinerario) lines.push(`- Itinerario: ${salida.itinerario}`)
  if (salida.que_incluye) lines.push(`- Incluye: ${salida.que_incluye}`)
  if (salida.que_no_incluye) lines.push(`- No incluye: ${salida.que_no_incluye}`)
  if (salida.link_inscripcion) lines.push(`- Link inscripción: ${salida.link_inscripcion}`)

  return lines.join('\n')
}

export interface BuildVideoPromptParams {
  salida: Salida
  niche: Niche
  carpeta: string
  temaAsignado: TemaVideo
  nicheContextText: string
  clientProfileContext: string
  kbContext: string
  tiktokContext: string
  hookContext: string
}

export function buildVideoPrompt(params: BuildVideoPromptParams): string {
  const {
    salida,
    niche,
    carpeta,
    temaAsignado,
    nicheContextText,
    clientProfileContext,
    kbContext,
    tiktokContext,
    hookContext,
  } = params

  const instruccionesTema = VIDEO_THEME_INSTRUCTIONS[temaAsignado] || ''
  const salidaDataBlock = formatSalidaDataBlock(salida)
  const contentContextBlock = buildSalidaContentContextPrompt(salida)

  return `${nicheContextText}

${clientProfileContext}=== INSTRUCCIÓN ESPECÍFICA PARA VIDEO CORTOS ===
Estás creando el guion visual/texto para un VIDEO CORTO (Reel/TikTok/Short) enfocado en el tema: "${temaAsignado.toUpperCase()}".
${instruccionesTema}

${VIDEO_GOLDEN_RULES}

${salidaDataBlock}

${contentContextBlock}

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

${VIDEO_OUTPUT_SCHEMA_INSTRUCTIONS}`
}
