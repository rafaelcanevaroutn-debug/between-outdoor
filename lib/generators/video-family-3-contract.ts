import type { Salida, VideoFamilia3Subfamilia } from '@/types'

export interface VerifiedVideoPlace {
  value: string
  source: string
  order: number
}

function comparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/\s+/gu, ' ')
    .trim()
}

function uniquePlaces(places: VerifiedVideoPlace[]): VerifiedVideoPlace[] {
  const seen = new Set<string>()
  return places.filter(place => {
    const key = comparable(place.value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function verifiedVideoPlaces(salida: Salida): VerifiedVideoPlace[] {
  const places: VerifiedVideoPlace[] = []
  let order = 0

  if (salida.destino?.trim()) {
    places.push({ value: salida.destino.trim(), source: 'salida.destino', order: order++ })
  }

  for (const point of salida.puntos_interes ?? []) {
    const name = point.nombre?.trim()
    const location = point.ubicacion?.trim()
    if (name) places.push({ value: name, source: `puntos_interes:${name}`, order: order++ })
    if (location) places.push({ value: location, source: `ubicacion:${name || location}`, order: order++ })
    if (name && location) {
      places.push({ value: `${name}, ${location}`, source: `puntos_interes:${name}+ubicacion`, order: order - 2 })
      places.push({ value: `${name} — ${location}`, source: `puntos_interes:${name}+ubicacion`, order: order - 2 })
      places.push({ value: `${name}\n${location}`, source: `puntos_interes:${name}+ubicacion`, order: order - 2 })
    }
  }

  return uniquePlaces(places)
}

export function normalizeVideoFamily3Copy(
  subfamilia: VideoFamilia3Subfamilia,
  rawCopy: string,
): string {
  const lines = rawCopy
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  let copy = lines.join('\n').trim()

  if (subfamilia === '3b') {
    copy = copy
      .replace(/^pov\s*(?::|—|-)?\s*/iu, '')
      .trim()
    copy = `POV: ${copy}`
  }

  return copy
}

const COMMERCIAL_PATTERN = /\b(?:USD|ARS|precio|seña|cupos?|lugares disponibles|últimos lugares|reserv(?:á|a|ar)|inscrib(?:ite|irse|ir)|link en bio|coment(?:á|a)|mandanos? (?:un )?(?:dm|mensaje)|escribinos?|consultanos?)\b/iu
const DATE_PATTERN = /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|20\d{2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/iu
const THERAPY_ADVICE_PATTERN = /(?:dej[áa]\s+(?:la\s+)?terapia|no\s+necesit[áa]s?\s+(?:terapia|psic[oó]log[oa]|medicaci[oó]n)|(?:monta[ñn]a|viaje|salida|naturaleza).{0,35}(?:cura|sana|reemplaza|arregla).{0,25}(?:terapia|depresi[oó]n|ansiedad|vida|todo)|(?:terapia|psic[oó]log[oa]|medicaci[oó]n).{0,25}(?:se\s+reemplaza|no\s+sirve))/iu
const RISK_GLORIFICATION_PATTERN = /(?:sin\s+equipo|sin\s+seguridad|casi\s+morir|arriesg(?:ar|ando)\s+la\s+vida|si\s+no\s+casi\s+mor[ií]s|la\s+seguridad\s+es\s+para)/iu
const AUDIENCE_DIRECTED_3D_PATTERN = /(?:\bvos\b|¿\s*(?:te\s+gustar[ií]a|te\s+anim[aá]s|quer[eé]s|sab[ií]as\s+que)\b)/iu

function mentionsVerifiedPlace(copy: string, places: VerifiedVideoPlace[]): boolean {
  const normalizedCopy = comparable(copy)
  return places.some(place => {
    const value = comparable(place.value)
    return value.length >= 3 && normalizedCopy.includes(value)
  })
}

function validateLugarCopy(copy: string, places: VerifiedVideoPlace[]): string[] {
  const errors: string[] = []
  if (places.length === 0) return ['copy no tiene lugares verificados disponibles']

  const withoutPin = copy.replace(/\s*📍\s*$/u, '').trim()
  const routeParts = withoutPin.split(/\s*→\s*/u).map(part => part.trim()).filter(Boolean)

  if (routeParts.length > 1) {
    const atomicPlaces = places.filter(place => !/[,\n—]/u.test(place.value))
    const matched = routeParts.map(part => atomicPlaces.find(place => comparable(place.value) === comparable(part)))
    if (matched.some(place => !place)) {
      errors.push('copy contiene un lugar de ruta que no coincide con una fuente verificada')
      return errors
    }
    const orders = matched.map(place => place?.order ?? -1)
    if (orders.some((order, index) => index > 0 && order < orders[index - 1])) {
      errors.push('copy altera el orden verificado de la ruta')
    }
    return errors
  }

  if (!places.some(place => comparable(place.value) === comparable(withoutPin))) {
    errors.push('copy de Familia 3e no coincide exactamente con un lugar o ubicación verificada')
  }
  return errors
}

export function validateVideoFamily3Copy({
  subfamilia,
  copy,
  salida,
}: {
  subfamilia: VideoFamilia3Subfamilia
  copy: string
  salida: Salida
}): string[] {
  const errors: string[] = []
  const places = verifiedVideoPlaces(salida)

  if (COMMERCIAL_PATTERN.test(copy) || DATE_PATTERN.test(copy)) {
    errors.push('copy contiene un dato comercial, CTA o fecha prohibida')
  }

  if ((subfamilia === '3a' || subfamilia === '3b' || subfamilia === '3c') && mentionsVerifiedPlace(copy, places)) {
    errors.push(`copy de Familia ${subfamilia} menciona un destino o lugar verificado, pero debe ser atemporal`)
  }

  if (subfamilia === '3b' && !copy.startsWith('POV: ')) {
    errors.push('copy de Familia 3b debe empezar exactamente con "POV: "')
  }

  if (subfamilia === '3c') {
    if (THERAPY_ADVICE_PATTERN.test(copy)) {
      errors.push('copy convierte la autoironía sobre terapia en consejo o promesa de salud')
    }
    if (RISK_GLORIFICATION_PATTERN.test(copy)) {
      errors.push('copy glorifica una conducta peligrosa')
    }
  }

  if (subfamilia === '3d') {
    const lines = copy.split('\n')
    if (lines.length !== 2) errors.push('copy de Familia 3d debe tener exactamente una pregunta y una respuesta')
    if (!/^¿.+\?$/u.test(lines[0]?.trim() ?? '')) {
      errors.push('copy de Familia 3d debe empezar con una pregunta completa')
    }
    if (lines.length === 2 && !/^[^:]+:(?:\s*.+)?$/u.test(lines[1].trim())) {
      errors.push('respuesta de Familia 3d debe marcar el remate con dos puntos')
    }
    if (AUDIENCE_DIRECTED_3D_PATTERN.test(lines[0] ?? '')) {
      errors.push('pregunta de Familia 3d habla al espectador en vez de formular una auto-pregunta de una sola voz')
    }
  }

  if (subfamilia === '3e') {
    errors.push(...validateLugarCopy(copy, places))
  }

  return errors
}
