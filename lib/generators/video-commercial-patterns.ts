// `\b` usa límites ASCII aun con flag `u`. Eso dejaba pasar formas
// rioplatenses con vocal acentuada como `reservá`, `comentá` y la frase
// `últimos lugares`. Estos límites consideran letras Unicode reales.
const UNICODE_WORD = String.raw`[\p{L}\p{N}_]`
const bounded = (source: string) => new RegExp(`(?<!${UNICODE_WORD})(?:${source})(?!${UNICODE_WORD})`, 'iu')

export const COMMERCIAL_LANGUAGE_PATTERN = bounded(
  String.raw`USD|ARS|precio|seña|cupos?|lugares disponibles|últimos lugares|reserv(?:á|a|ar)|inscrib(?:ite|irse|ir)|link en bio|coment(?:á|a)|mandanos? (?:un )?(?:dm|mensaje)|escribinos?|consultanos?`,
)

export const INVENTED_URGENCY_PATTERN = bounded(
  String.raw`últimos cupos|últimos lugares|se agota|sólo hoy|solo hoy`,
)
