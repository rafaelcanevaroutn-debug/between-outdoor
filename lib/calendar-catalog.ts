import type { CalendarCode, DiaSemana, FormatoCarrusel } from '@/types'

/**
 * Catálogo de calendarios editoriales (CAL-00..CAL-05).
 *
 * Cada calendario define una composición FIJA de piezas para la semana.
 * Los % del documento fuente se resolvieron una sola vez, a mano, contra
 * el límite inferior de la cadencia de cada calendario (ej. "5-6 piezas"
 * -> 5), redondeando categoría por categoría. Eso convierte "50% de 5" en
 * un array literal de slots en vez de un algoritmo de redondeo en runtime
 * — es intencional: el propio catálogo de origen aclara que estos % son
 * una hipótesis de arranque que se ajusta con clientes reales, así que
 * conviene que ajustarlos sea editar este array, no tocar lógica.
 *
 * `design_id` queda reservado para la capa de diseño visual (qué set de
 * templates/estilo usa cada calendario) — no se conecta a nada todavía.
 */

export interface CalendarSlotDef {
  /** Solo documentación/UI — no se usa para lógica. */
  label: string
  /**
   * Formatos posibles para este slot. Si hay más de uno, el resolver
   * (lib/calendar-resolver.ts) elige el que menos se usó hasta ese punto
   * de la semana (round-robin simple, sin heurística "inteligente").
   */
  formatosCarrusel: FormatoCarrusel[]
  /** Solo CAL-00 fija días concretos; el resto no tiene día fijo. */
  dia?: DiaSemana
  /** Hoy solo lo usa Ascenso: sin salida marcada como pasada, no se puede armar. */
  requiereSalidaPasada?: boolean
  /** A qué formato cae este slot si requiereSalidaPasada=true y no hay ninguna. */
  fallbackFormatoSinSalidaPasada?: FormatoCarrusel
  /** Hoy solo lo usa el domingo de CAL-00 ("si hay fechas próximas... si no..."). */
  condicion?: 'tiene_salida_futura'
  formatoSiNoCumpleCondicion?: FormatoCarrusel
  /**
   * Si está presente, este slot ignora la selección "menos usado" y elige
   * formato por semana: `rotacionSemanal[numeroDeSemanaISO % length]`. Hoy
   * solo lo usa el 4º slot de CAL-03 (comercial liviano / editorial extra,
   * alternando semana a semana en vez de desaparecer).
   */
  rotacionSemanal?: FormatoCarrusel[]
}

export interface CalendarDefinition {
  code: CalendarCode
  nombre: string
  /** Frase de una línea que ve el cliente al elegir calendario. */
  fraseCliente: string
  objetivoNegocio: string
  cadencia: { min: number; max: number }
  /** Reservado para la capa de diseño visual — no usar todavía. */
  designId: string | null
  /** Composición resuelta al límite inferior de `cadencia`. */
  slots: CalendarSlotDef[]
}

export const CALENDAR_CATALOG: Record<CalendarCode, CalendarDefinition> = {
  'CAL-00': {
    code: 'CAL-00',
    nombre: 'Arranque',
    fraseCliente: 'Arranque: la mezcla segura mientras conocemos tu cuenta',
    objetivoNegocio: 'Ninguno específico — mezcla balanceada segura para clientes nuevos sin datos aún.',
    cadencia: { min: 4, max: 5 },
    designId: null,
    slots: [
      { label: 'Descubrimiento', dia: 'lunes', formatosCarrusel: ['organico'] },
      { label: 'Conversión', dia: 'miércoles', formatosCarrusel: ['itinerario', 'lugar'] },
      { label: 'Autoridad', dia: 'viernes', formatosCarrusel: ['editorial'] },
      {
        label: 'Calendario o Conversación',
        dia: 'domingo',
        formatosCarrusel: ['calendario'],
        condicion: 'tiene_salida_futura',
        formatoSiNoCumpleCondicion: 'conversacion',
      },
    ],
  },

  'CAL-01': {
    code: 'CAL-01',
    nombre: 'Ritmo',
    fraseCliente: 'Ritmo: para crecer tu audiencia',
    objetivoNegocio: 'Conseguir nuevos participantes / hacer crecer la cuenta.',
    cadencia: { min: 5, max: 6 },
    designId: null,
    slots: [
      // Abre la semana con Descubrimiento (nunca venta directa el lunes).
      { label: 'Descubrimiento', formatosCarrusel: ['conversacion', 'organico'] },
      { label: 'Conversión liviana', formatosCarrusel: ['itinerario', 'lugar'] },
      { label: 'Descubrimiento', formatosCarrusel: ['conversacion', 'organico'] },
      { label: 'Autoridad', formatosCarrusel: ['editorial'] },
      // Único calendario donde Conversación puede aparecer más de una vez.
      { label: 'Descubrimiento', formatosCarrusel: ['conversacion', 'organico'] },
    ],
  },

  'CAL-02': {
    code: 'CAL-02',
    nombre: 'Cumbre',
    fraseCliente: 'Cumbre: para llenar tu salida grande',
    objetivoNegocio: 'Llenar un viaje/salida premium.',
    cadencia: { min: 4, max: 4 },
    designId: null,
    slots: [
      // Único calendario donde Ascenso es obligatorio, no opcional.
      {
        label: 'Ascenso',
        formatosCarrusel: ['ascenso'],
        requiereSalidaPasada: true,
        fallbackFormatoSinSalidaPasada: 'lugar',
      },
      { label: 'Lugar/Itinerario', formatosCarrusel: ['lugar', 'itinerario'] },
      { label: 'Conversación', formatosCarrusel: ['conversacion'] },
      // Único calendario que combina Ascenso + Calendario en la misma semana.
      { label: 'Calendario con fecha límite', formatosCarrusel: ['calendario'] },
    ],
  },

  'CAL-03': {
    code: 'CAL-03',
    nombre: 'Base',
    fraseCliente: 'Base: para generar confianza si sos marca nueva',
    objetivoNegocio: 'Generar confianza/autoridad.',
    cadencia: { min: 4, max: 5 },
    designId: null,
    slots: [
      // Único calendario donde Editorial supera el 35% de la semana (2/4 = 50%).
      { label: 'Editorial', formatosCarrusel: ['editorial'] },
      { label: 'Editorial', formatosCarrusel: ['editorial'] },
      { label: 'Descubrimiento', formatosCarrusel: ['organico', 'conversacion'] },
      {
        label: 'Ascenso (trayectoria)',
        formatosCarrusel: ['ascenso'],
        requiereSalidaPasada: true,
        fallbackFormatoSinSalidaPasada: 'lugar',
      },
      // El 10% "comercial muy liviano" no desaparece: rota semana a semana
      // con un Editorial extra en vez de forzar un slot de venta todas las
      // semanas — mantiene "menor venta del catálogo" sin llegar a "cero
      // venta". `itinerario` se usa como el formato comercial más liviano
      // disponible (a diferencia de `calendario`/`lugar` con CTA fuerte,
      // que el documento pide evitar en este calendario).
      {
        label: 'Comercial liviano / Editorial extra (rota semana a semana)',
        formatosCarrusel: ['itinerario', 'editorial'],
        rotacionSemanal: ['itinerario', 'editorial'],
      },
    ],
  },

  'CAL-04': {
    code: 'CAL-04',
    nombre: 'Presencia',
    fraseCliente: 'Presencia: para mantener tu comunidad activa',
    objetivoNegocio: 'Mantener activa la comunidad.',
    cadencia: { min: 3, max: 4 },
    designId: null,
    slots: [
      // Único calendario sin Itinerario ni Lugar — no necesita vender detalle.
      { label: 'Calendario', formatosCarrusel: ['calendario'] },
      { label: 'Orgánico', formatosCarrusel: ['organico'] },
      { label: 'Editorial (comunidad, testimonios)', formatosCarrusel: ['editorial'] },
    ],
  },

  'CAL-05': {
    code: 'CAL-05',
    nombre: 'Local',
    fraseCliente: 'Local: para vender tus salidas recurrentes',
    objetivoNegocio: 'Vender más salidas locales/recurrentes.',
    cadencia: { min: 5, max: 6 },
    designId: null,
    slots: [
      // Único calendario con relación 40/40/20 — Conversión y Confianza pesan igual.
      { label: 'Conversión directa', formatosCarrusel: ['calendario', 'itinerario'] },
      { label: 'Confianza', formatosCarrusel: ['editorial'] },
      { label: 'Conversión directa', formatosCarrusel: ['calendario', 'itinerario'] },
      { label: 'Confianza', formatosCarrusel: ['editorial'] },
      { label: 'Descubrimiento', formatosCarrusel: ['organico'] },
    ],
  },
}

export function getCalendarDefinition(code: CalendarCode): CalendarDefinition {
  return CALENDAR_CATALOG[code]
}
