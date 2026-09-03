export function generateEngagementDescription(params: {
  destino?: string | null
  mainText?: string | null
  secondaryText?: string | null
  hashtags: string
}): string {
  const keyword = params.destino 
    ? params.destino.replace(/^(?:el|la|los|las)\s+/i, '').split(/[,–—-]/)[0].trim().toLocaleUpperCase('es-AR').replace(/\bCHALTEN\b/g, 'CHALTÉN') 
    : 'INFO'
  
  const cta = `Comentá ${keyword} y te enviamos toda la información.`
  
  const parts = [params.mainText, params.secondaryText]
    .filter(Boolean)
    .map(p => p!.trim().replace(/[.]+$/, ''))
    
  let text = parts.join(' · ')
  if (!text) {
    text = `Conocé ${params.destino || 'nuestra próxima salida'} desde adentro.`
  }
  
  // Enforce a safe maximum for the core engaging text before CTA to prevent overflow.
  if (text.length > 200) {
    text = text.slice(0, 197) + '...'
  }
  
  return `${text}.\n\n${cta}\n\n${params.hashtags}`.trim()
}

/**
 * Truncates a description safely to respect character limits (like TikTok's via Zernio),
 * ensuring that the final CTA and hashtags are preserved at the bottom.
 */
export function enforceCharacterLimit(description: string | null, limit: number = 400): string | null {
  if (!description || description.length <= limit) return description
  
  const paragraphs = description.split('\n\n')
  
  // If the description has only one block or is unexpectedly structured, just cut it directly.
  if (paragraphs.length <= 2) {
    return description.slice(0, Math.max(0, limit - 3)) + '...'
  }
  
  const ctaAndHashtags = paragraphs.slice(-2).join('\n\n')
  const remainingLimit = limit - ctaAndHashtags.length - 7 // 7 for "...\n\n"
  
  if (remainingLimit <= 50) {
    // If we don't have enough room for the body, just truncate the whole thing safely
    return description.slice(0, Math.max(0, limit - 3)) + '...'
  }
  
  const body = paragraphs.slice(0, -2).join('\n\n')
  return `${body.slice(0, remainingLimit)}...\n\n${ctaAndHashtags}`
}
