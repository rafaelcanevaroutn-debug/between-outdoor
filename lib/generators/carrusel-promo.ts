import type { Salida, SlideCarrusel, PromoVariante, GeneratedCarruselPromo } from '@/types'
import { generateWithRetry } from '@/lib/gemini-core'
import { formatFechaSalida } from '@/lib/utils/dates'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function buildPrompt(salida: Salida, variante: PromoVariante, fechaFormateada: string, mesAnio: string): string {
  // Build data block — only include fields that exist
  const datos: string[] = [
    `Destino: ${salida.destino}`,
    `Nombre del viaje: ${salida.nombre}`,
    `Fecha: ${fechaFormateada}`,
    `Precio: USD ${salida.precio_usd}`,
    `Cupos disponibles: ${salida.cupos}`,
  ]
  if (salida.que_incluye)      datos.push(`Qué incluye: ${salida.que_incluye}`)
  if (salida.itinerario)       datos.push(`Itinerario: ${salida.itinerario}`)
  if (salida.que_no_incluye)   datos.push(`Qué no incluye: ${salida.que_no_incluye}`)
  if (salida.link_inscripcion) datos.push(`Reservas / inscripción: ${salida.link_inscripcion}`)

  const base = `Sos el asistente de contenido de una agencia de viajes de aventura. Generás carruseles promocionales visuales — estilo agencia, poco texto, impacto visual directo. Nada de hooks elaborados ni narrativas.

⚠️ FIDELIDAD ABSOLUTA: Cada dato concreto (destino, fecha, precio, cupos, qué incluye, itinerario) debe salir EXACTAMENTE de los datos de la salida. Prohibido inventar, aproximar, cambiar nombres ni fechas.

DATOS DE LA SALIDA:
${datos.join('\n')}

MES Y AÑO: ${mesAnio}

REGLAS DE FORMATO:
- texto_principal: máx. 60 caracteres. Solo el dato esencial.
- texto_apoyo: máx. 100 caracteres. Puede ser null.
- Slides de SOLO FOTO: texto_principal = "" y texto_apoyo = null.
- indicacion_imagen: descripción muy corta del tipo de foto sugerida (ej: "paisaje del destino", "grupo en ruta", "cumbre").
- Responde ÚNICAMENTE con el JSON — sin texto adicional, sin markdown.`

  if (variante === 'promo_simple') {
    return `${base}

VARIANTE promo_simple — 5 slides:
- Slide 1 (portada): texto_principal = nombre del DESTINO en MAYÚSCULAS. texto_apoyo = mes y fecha corta (ej: "AGOSTO · 15 AL 17") seguido de " · " y una bajada promo breve de 1 frase (ej: "Un viaje para disfrutar al máximo").
- Slides 2–5 (solo foto): texto_principal = "", texto_apoyo = null.

JSON esperado:
{
  "slides": [
    { "n_slide": 1, "rol": "portada",    "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." },
    { "n_slide": 2, "rol": "desarrollo", "texto_principal": "",    "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 3, "rol": "desarrollo", "texto_principal": "",    "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 4, "rol": "desarrollo", "texto_principal": "",    "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 5, "rol": "desarrollo", "texto_principal": "",    "texto_apoyo": null,  "indicacion_imagen": "..." }
  ]
}`
  }

  if (variante === 'promo_cta') {
    return `${base}

VARIANTE promo_cta — 5 slides:
- Slide 1 (portada): igual que promo_simple — DESTINO en mayúsculas, texto_apoyo = mes·fecha·bajada promo.
- Slides 2–4 (solo foto): texto_principal = "", texto_apoyo = null.
- Slide 5 (cierre con CTA): texto_principal = CTA directo de reserva (ej: "Reservá tu lugar", "Escribinos por WhatsApp"). texto_apoyo = link de inscripción si está disponible en los datos, sino null.

JSON esperado:
{
  "slides": [
    { "n_slide": 1, "rol": "portada",    "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." },
    { "n_slide": 2, "rol": "desarrollo", "texto_principal": "",    "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 3, "rol": "desarrollo", "texto_principal": "",    "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 4, "rol": "desarrollo", "texto_principal": "",    "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 5, "rol": "cierre",     "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." }
  ]
}`
  }

  // promo_info
  return `${base}

VARIANTE promo_info — 5 slides:
- Slide 1 (portada): igual que promo_simple — DESTINO en mayúsculas, texto_apoyo = mes·fecha·bajada promo.
- Slides 2–5 (info): orden FIJO. Si un dato no está disponible en la salida, usá el siguiente disponible — nunca inventes.
  • Slide 2: Qué incluye — resumí en pocas palabras lo esencial.
  • Slide 3: Itinerario — 1 línea resumida.
  • Slide 4: Precio y cupos — ej: "Desde USD 420 · 8 cupos".
  • Slide 5: Fecha exacta + cómo reservar (link o instrucción).

JSON esperado:
{
  "slides": [
    { "n_slide": 1, "rol": "portada",    "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." },
    { "n_slide": 2, "rol": "desarrollo", "texto_principal": "...", "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 3, "rol": "desarrollo", "texto_principal": "...", "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 4, "rol": "desarrollo", "texto_principal": "...", "texto_apoyo": null,  "indicacion_imagen": "..." },
    { "n_slide": 5, "rol": "cierre",     "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." }
  ]
}`
}

function parsePromoResponse(raw: string, variante: PromoVariante): SlideCarrusel[] {
  let text = raw.trim()
  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
  }

  console.log(`[PROMO-PARSE] ${variante} — raw Gemini (primeros 600 chars):`, text.slice(0, 600))

  const parsed = JSON.parse(text)
  const rawSlides = Array.isArray(parsed.slides)
    ? parsed.slides
    : parsed.slides && typeof parsed.slides === 'object'
      ? Object.values(parsed.slides as Record<string, unknown>)
      : []

  console.log(`[PROMO-PARSE] ${variante} — slides parseados (${rawSlides.length}):`, JSON.stringify(rawSlides))

  if (rawSlides.length === 0) throw new Error(`[PROMO] ${variante}: slides vacíos en respuesta de Gemini`)
  return rawSlides as SlideCarrusel[]
}

export async function generateCarruselPromo(
  salida: Salida,
  variante: PromoVariante,
  carpetaFotos: string | null,
): Promise<GeneratedCarruselPromo> {
  const fechaFormateada = formatFechaSalida(salida.fecha_inicio, salida.fecha_fin)
  const mesAnio = format(parseLocalDate(salida.fecha_inicio), "MMMM 'de' yyyy", { locale: es })

  const prompt = buildPrompt(salida, variante, fechaFormateada, mesAnio)

  console.log(`[PROMO] Generando variante=${variante} | destino=${salida.destino} | fecha=${fechaFormateada}`)
  const raw = await generateWithRetry(prompt, `carrusel-promo-${variante}`)
  const slides = parsePromoResponse(raw, variante)
  console.log(`[PROMO] ✓ variante=${variante} | slides=${slides.length}`)

  return {
    formato:          'carrusel_promo',
    variante,
    slides,
    carpeta_material: carpetaFotos ?? salida.destino,
    mes:              mesAnio,
  }
}
