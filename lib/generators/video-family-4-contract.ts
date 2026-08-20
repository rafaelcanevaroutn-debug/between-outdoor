import type { Salida } from '@/types'

const CONVOCATION_PATTERN = /\b(?:busco|buscamos|invito|invitamos|te sumás|se suman|vamos|venite|acompañanos|armamos grupo|quién se apunta)\b/iu
const CTA_PATTERN = /\b(?:whatsapp|por mp|mensaje privado|escribinos|escribime|mandanos|mandame|enviáselo|compartilo|reservá|respondé)\b/iu
const RELATIVE_DATE_PATTERN = /\b(?:mañana|este sábado|este finde|semana santa)\b/iu
const ANY_HARD_DATUM_PATTERN = /(?:\b(?:USD|ARS|precio|seña)\b|\$\s*\d|\b\d+\s+(?:cupos?|lugares?|personas?|amigos?)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b20\d{2}\b|\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b|\b(?:mañana|este sábado|este finde|semana santa)\b)/iu

function normalizedDigits(value: string): string {
  return value.replace(/[.\s]/gu, '')
}

function comparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/\s+/gu, ' ')
    .trim()
}

function dateParts(date: string): { day: number; month: number; year: number } | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/u)
  return match
    ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
    : null
}

function includesVerifiedHardDatum(copy: string, salida: Salida): boolean {
  const price = normalizedDigits(String(salida.precio_usd))
  const hasPrice = normalizedDigits(copy).includes(price)
    && new RegExp(`\\b${salida.moneda}\\b|\\$`, 'iu').test(copy)
  const start = dateParts(salida.fecha_inicio)
  const hasDate = RELATIVE_DATE_PATTERN.test(copy) || (start
    ? new RegExp(`\\b${start.day}(?:\\s+de)?\\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|${salida.fecha_inicio}`, 'iu').test(copy)
    : false)
  const hasCupos = new RegExp(`\\b${salida.cupos}\\s+(?:cupos?|lugares?|personas?|amigos?)\\b`, 'iu').test(copy)
  return hasPrice || hasDate || hasCupos
}

function validateCommercialNumbers(copy: string, salida: Salida): string[] {
  const errors: string[] = []
  const priceClaims = [...copy.matchAll(/(?:\b(?:ARS|USD)\s*|\$\s*)(\d[\d.\s]*(?:,\d+)?)/giu)]
  for (const claim of priceClaims) {
    if (normalizedDigits(claim[1]).replace(',', '.') !== String(salida.precio_usd)) {
      errors.push(`copy contiene un precio que no coincide con ${salida.moneda} ${salida.precio_usd}`)
      break
    }
  }

  const capacityClaims = [...copy.matchAll(/\b(\d+)\s+(?:cupos?|lugares?|personas?|amigos?)\b/giu)]
  for (const claim of capacityClaims) {
    if (Number(claim[1]) !== salida.cupos) {
      errors.push(`copy contiene una cantidad de cupos o personas distinta de ${salida.cupos}`)
      break
    }
  }

  if (
    salida.sena_usd !== null
    && salida.sena_usd !== salida.precio_usd
    && priceClaims.some(claim => normalizedDigits(claim[1]).replace(',', '.') === String(salida.sena_usd))
    && !/\bseña\b/iu.test(copy)
  ) {
    errors.push('copy presenta la seña como si fuera el precio total')
  }
  return errors
}

function validateRelativeDate(copy: string, salida: Salida, publicationDate?: string): string[] {
  if (!RELATIVE_DATE_PATTERN.test(copy)) return []
  if (!publicationDate) return ['copy usa una fecha relativa sin fecha de publicación']
  const publication = new Date(`${publicationDate.slice(0, 10)}T12:00:00Z`)
  const start = new Date(`${salida.fecha_inicio.slice(0, 10)}T12:00:00Z`)
  const days = Math.round((start.getTime() - publication.getTime()) / 86_400_000)
  if (/\bmañana\b/iu.test(copy) && days !== 1) return ['"mañana" no coincide con la fecha real de la salida']
  if (/\beste sábado\b/iu.test(copy) && (start.getUTCDay() !== 6 || days < 0 || days > 6)) {
    return ['"este sábado" no coincide con la fecha real de la salida']
  }
  if (/\beste finde\b/iu.test(copy) && (!([0, 6].includes(start.getUTCDay())) || days < 0 || days > 6)) {
    return ['"este finde" no coincide con la fecha real de la salida']
  }
  return []
}

export function validateVideoFamily4Copy({
  copy,
  datoDuro,
  salida,
  publicationDate,
  canalesHabilitados,
}: {
  copy: string
  datoDuro: string
  salida: Salida
  publicationDate?: string
  canalesHabilitados: string[]
}): string[] {
  const errors: string[] = []
  const normalizedCopy = comparable(copy)
  const verifiedIdentity = [salida.destino, salida.nombre]
    .filter(Boolean)
    .flatMap(s => s!.split(/(?:—|-|,)/)) // Split by dashes or commas to extract just the location
    .map(comparable)
    .filter(s => s.length >= 3)
  if (!verifiedIdentity.some(value => normalizedCopy.includes(value))) {
    errors.push(`copy no identifica el destino o nombre real de la salida (buscado: ${verifiedIdentity.join(' o ')})`)
  }
  if (!CONVOCATION_PATTERN.test(copy)) errors.push('copy no contiene un verbo o pregunta de convocatoria')
  if (!CTA_PATTERN.test(copy)) errors.push('copy no contiene un CTA concreto')
  if (!datoDuro.trim()) errors.push('dato_duro no puede estar vacío')
  if (!includesVerifiedHardDatum(datoDuro, salida)) {
    errors.push('dato_duro no contiene precio, fecha o cupos verificables')
  }
  if (ANY_HARD_DATUM_PATTERN.test(copy) || includesVerifiedHardDatum(copy, salida)) {
    errors.push('copy duplica el dato duro o contiene otro dato comercial; debe vivir únicamente en dato_duro')
  }
  if (/\bwhatsapp\b/iu.test(copy) && !canalesHabilitados.some(channel => /whatsapp/iu.test(channel))) {
    errors.push('copy usa WhatsApp pero el canal no está habilitado')
  }
  if (/\b(?:por mp|mensaje privado)\b/iu.test(copy) && !canalesHabilitados.some(channel => /(?:mp|instagram|mensaje privado)/iu.test(channel))) {
    errors.push('copy usa MP pero el canal no está habilitado')
  }
  const completeText = `${copy}\n${datoDuro}`
  if (/\b(?:últimos cupos|últimos lugares|se agota|sólo hoy|solo hoy)\b/iu.test(completeText)) {
    errors.push('copy inventa urgencia o disponibilidad')
  }
  if (/\btodo incluido\b/iu.test(completeText) && !/\btodo incluido\b/iu.test(salida.que_incluye ?? '')) {
    errors.push('copy afirma "todo incluido" sin fuente literal')
  }
  errors.push(...validateCommercialNumbers(completeText, salida))
  errors.push(...validateRelativeDate(completeText, salida, publicationDate))
  return errors
}
