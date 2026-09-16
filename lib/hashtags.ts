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
      // Caribe/Playa
      if (lower.includes('playa') || lower.includes('caribe') || lower.includes('arena') || lower.includes('vacaciones')) {
        hashtags.add('#playa')
        hashtags.add('#arena')
        hashtags.add('#vacaciones')
      }
      // Patagonia/Nieve/Montaña
      if (lower.includes('montaña') || lower.includes('trekking') || lower.includes('nieve') || lower.includes('esqui') || lower.includes('patagonia') || lower.includes('sur')) {
        hashtags.add('#trekking')
        hashtags.add('#turismoaventura')
        hashtags.add('#viajes')
      }
      // Otros
      if (lower.includes('ciudad') || lower.includes('urbano')) hashtags.add('#citytrip')
      if (lower.includes('naturaleza')) hashtags.add('#naturaleza')
      if (lower.includes('relax')) hashtags.add('#relax')
      if (lower.includes('cultura')) hashtags.add('#cultura')
    })
  }
  return Array.from(hashtags).join(' ')
}
