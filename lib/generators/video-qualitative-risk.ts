import type { Salida } from '@/types'
import { comparableVideoText as comparable } from './video-verified-places.ts'
import { factualCorpus } from './video-factual-corpus.ts'

// Heurístico de "alarma de humo" para afirmaciones cualitativas de terreno
// o seguridad — no es una prueba de veracidad (eso requeriría entender si
// la frase realmente está sostenida por el texto libre de la salida, un
// problema de entailment semántico que no se resuelve con regex). Es una
// red de seguridad más angosta: si un texto afirma una ausencia fuerte
// ("no hay agua", "sin señal"), exige que exista al menos una palabra
// relacionada en algún campo de la salida. La garantía real sigue siendo
// el gate de aprobación humana antes de que la pieza llegue a Mati.
// Compartido entre cualquier generador de video que necesite este chequeo
// (hoy: Familia 2c — tips en secuencia, cada uno validado individualmente).
const QUALITATIVE_RISK_CLAIMS: { claim: RegExp; keywords: RegExp; label: string }[] = [
  { claim: /\bsin\s+(?:fuentes?\s+de\s+)?agua\b|\bno\s+hay\s+agua\b/iu, keywords: /\bagua\b|\bfuente(?:s)?\b|\bhidratacion\b/iu, label: 'ausencia de agua' },
  { claim: /\bsin\s+senal\b|\bsin\s+cobertura\b|\bsenal\s+cero\b/iu, keywords: /\bsenal\b|\bcobertura\b/iu, label: 'ausencia de señal' },
  { claim: /\bsin\s+sombra\b|\bsol\s+directo\b/iu, keywords: /\bsombra\b|\bsol\b|\bexposicion\b/iu, label: 'exposición al sol' },
  { claim: /\bterreno\s+tecnico\b|\bpedregos[oa]\b|\brocos[oa]\b|\bresbaladiz[oa]\b/iu, keywords: /\btecnic[oa]\b|\bpedregos[oa]\b|\brocos[oa]\b|\bresbaladiz[oa]\b|\bpiedras?\b/iu, label: 'terreno técnico' },
]

export function unsupportedQualitativeClaims(copy: string, salida: Salida): string[] {
  const normalizedCopy = comparable(copy)
  const corpus = factualCorpus(salida)
  return QUALITATIVE_RISK_CLAIMS
    .filter(({ claim, keywords }) => claim.test(normalizedCopy) && !keywords.test(corpus))
    .map(({ label }) => label)
}
