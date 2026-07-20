const ITINERARY_FORBIDDEN_COPY = /(?:^|[^\p{L}\p{N}_])((?:[uú]nic[oa]s?|incre[ií]bles?|inolvidables?|[eé]pic[oa]s?)|(?:recargar\s+energ[ií]as?)|(?:vale\s+la\s+pena))(?![\p{L}\p{N}_])/iu

export function findForbiddenItineraryCopy(value: string): string | null {
  return value.match(ITINERARY_FORBIDDEN_COPY)?.[1] ?? null
}

export function normalizeItineraryCopy(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function itineraryAngleMatchesCover(angle: string, cover: string): boolean {
  const normalizedAngle = normalizeItineraryCopy(angle)
  return normalizedAngle.length > 0 && normalizedAngle === normalizeItineraryCopy(cover)
}
