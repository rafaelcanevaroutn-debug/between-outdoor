import type { Salida } from '@/types'
import { comparableVideoText as comparable, verifiedVideoPlaces } from './video-verified-places.ts'
import { factualCorpus, unsupportedNumericClaims } from './video-factual-corpus.ts'

const COMMERCIAL_PATTERN = /\b(?:USD|ARS|precio|seña|cupos?|lugares disponibles|últimos lugares|reserv(?:á|a|ar)|inscrib(?:ite|irse|ir)|link en bio|coment(?:á|a)|mandanos? (?:un )?(?:dm|mensaje)|escribinos?|consultanos?)\b/iu
const DATE_PATTERN = /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|20\d{2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/iu

function mentionsVerifiedPlace(copy: string, salida: Salida): boolean {
  const normalized = comparable(copy)
  return verifiedVideoPlaces(salida).some(place => {
    const value = comparable(place.value)
    return value.length >= 3 && normalized.includes(value)
  })
}

// Heurístico de "alarma de humo" para afirmaciones cualitativas de terreno
// o seguridad — no es una prueba de veracidad (eso requeriría entender si
// la frase realmente está sostenida por el texto libre de la salida, un
// problema de entailment semántico que no se resuelve con regex). Es una
// red de seguridad más angosta: si el consejo afirma una ausencia fuerte
// ("no hay agua", "sin señal"), exige que exista al menos una palabra
// relacionada en algún campo de la salida. La garantía real sigue siendo
// el gate de aprobación humana antes de que la pieza llegue a Mati.
const QUALITATIVE_RISK_CLAIMS: { claim: RegExp; keywords: RegExp; label: string }[] = [
  { claim: /\bsin\s+(?:fuentes?\s+de\s+)?agua\b|\bno\s+hay\s+agua\b/iu, keywords: /\bagua\b|\bfuente(?:s)?\b|\bhidratacion\b/iu, label: 'ausencia de agua' },
  { claim: /\bsin\s+senal\b|\bsin\s+cobertura\b|\bsenal\s+cero\b/iu, keywords: /\bsenal\b|\bcobertura\b/iu, label: 'ausencia de señal' },
  { claim: /\bsin\s+sombra\b|\bsol\s+directo\b/iu, keywords: /\bsombra\b|\bsol\b|\bexposicion\b/iu, label: 'exposición al sol' },
  { claim: /\bterreno\s+tecnico\b|\bpedregos[oa]\b|\brocos[oa]\b|\bresbaladiz[oa]\b/iu, keywords: /\btecnic[oa]\b|\bpedregos[oa]\b|\brocos[oa]\b|\bresbaladiz[oa]\b|\bpiedras?\b/iu, label: 'terreno técnico' },
]

function unsupportedQualitativeClaims(copy: string, salida: Salida): string[] {
  const normalizedCopy = comparable(copy)
  const corpus = factualCorpus(salida)
  return QUALITATIVE_RISK_CLAIMS
    .filter(({ claim, keywords }) => claim.test(normalizedCopy) && !keywords.test(corpus))
    .map(({ label }) => label)
}

export function validateVideoFamily5Copy({
  copy,
  salida,
}: {
  copy: string
  salida: Salida
}): string[] {
  const errors: string[] = []

  if (COMMERCIAL_PATTERN.test(copy) || DATE_PATTERN.test(copy)) {
    errors.push('copy contiene un dato comercial, CTA o fecha prohibida')
  }
  if (mentionsVerifiedPlace(copy, salida)) {
    errors.push('copy menciona un destino o lugar verificado; el consejo debe ser reutilizable para cualquier salida')
  }

  const numericClaims = unsupportedNumericClaims(copy, salida)
  if (numericClaims.length > 0) {
    errors.push(`copy contiene datos numéricos no verificados: ${numericClaims.join(', ')}`)
  }

  const qualitativeClaims = unsupportedQualitativeClaims(copy, salida)
  if (qualitativeClaims.length > 0) {
    errors.push(`copy afirma una condición sin respaldo en la salida: ${qualitativeClaims.join(', ')}`)
  }

  return errors
}
