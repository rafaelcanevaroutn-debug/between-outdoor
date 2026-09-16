export function generateContextualHashtags(destino?: string | null, zonaGeografica?: string | null, tags?: string[] | null): string {
  const hashtags = new Set<string>()
  const sanitizeForHashtag = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  }

  if (destino) {
    const cleanDest = sanitizeForHashtag(destino)
    if (cleanDest) hashtags.add(`#${cleanDest}`)
  }
  if (zonaGeografica) {
    const cleanZone = sanitizeForHashtag(zonaGeografica.split('/')[0] || '')
    if (cleanZone && cleanZone.toLowerCase() !== 'sinzona') hashtags.add(`#${cleanZone}`)
  }
  if (tags) {
    tags.forEach(tag => {
      const lower = tag.toLowerCase()
      if (lower.includes('playa') || lower.includes('caribe')) hashtags.add('#Playa')
      if (lower.includes('montaña') || lower.includes('trekking')) hashtags.add('#Trekking')
      if (lower.includes('nieve') || lower.includes('esqui')) hashtags.add('#Nieve')
      if (lower.includes('ciudad') || lower.includes('urbano')) hashtags.add('#CityTrip')
      if (lower.includes('naturaleza')) hashtags.add('#Naturaleza')
      if (lower.includes('relax')) hashtags.add('#Relax')
      if (lower.includes('cultura')) hashtags.add('#Cultura')
    })
  }
  return Array.from(hashtags).join(' ')
}
