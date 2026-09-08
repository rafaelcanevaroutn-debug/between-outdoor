export function generateEngagementDescription(params: {
  destino?: string | null
  fechaInicio?: string | null
  tipoViaje?: string | null
  mainText?: string | null
  secondaryText?: string | null
  hashtags: string
  isFamily3?: boolean
  organicDescription?: string | null
  isVideo?: boolean
  videoCopy?: string | null
  isCarousel?: boolean
}): string {
  const keyword = params.destino 
    ? params.destino.replace(/^(?:el|la|los|las)\s+/i, '').split(/[,–—-]/)[0].trim().toLocaleUpperCase('es-AR').replace(/\bCHALTEN\b/g, 'CHALTÉN') 
    : 'INFO'
  
  const isGroup = params.tipoViaje === 'salida_recurrente' || params.tipoViaje === 'evento_local'
  const isInfo = keyword.toUpperCase() === 'INFO'
  const cta = isGroup
    ? (isInfo ? 'Comentá INFO para sumarte o unite al grupo con el link en la bio.' : `Comentá ${keyword} o unite al grupo con el link en la bio.`)
    : (isInfo ? 'Comentá INFO para recibir los detalles.' : `Comentá ${keyword} para recibir los detalles.`)
  
  const isVideoPiece = params.isVideo || Boolean(params.isFamily3) || Boolean(params.videoCopy)

  if (params.organicDescription?.trim()) {
    let text = params.organicDescription.trim()

    // Si la descripción orgánica incluye accidentalmente el copy del video, lo removemos para no repetir
    if (params.videoCopy) {
      const normalizedVideoCopy = params.videoCopy.trim().toLocaleLowerCase('es-AR')
      if (text.toLocaleLowerCase('es-AR').startsWith(normalizedVideoCopy)) {
        text = text.slice(params.videoCopy.length).replace(/^[\s.:·–—-]+/, '').trim()
      }
    }

    // Reemplazamos el placeholder [DESTINO] por la keyword real
    text = text.replace(/\[DESTINO\]/g, keyword)
    // Limpiamos redundancias tipo "Comentá INFO y te paso la info"
    text = cleanRedundantInfoPhrases(text, keyword)

    // Si el texto no incluye un CTA o invitación al final, lo agregamos
    if (!/coment[aá]|unite|escribinos|link\s+en\s+la\s+bio/i.test(text)) {
      text = `${text}\n\n${cta}`
    }

    return params.hashtags ? `${text}\n\n${params.hashtags}`.trim() : text
  }

  // Si es un video sin descripción orgánica de la IA, generamos una descripción complementaria
  // NUNCA repetimos el copy del video en el pie de foto
  if (isVideoPiece) {
    const complementaryText = isGroup
      ? (params.destino
          ? `Caminatas en grupo por ${params.destino} para conectar con la naturaleza, sumar movimiento y desconectar de la rutina.`
          : 'Caminatas en grupo para conectar con la naturaleza, sumar movimiento y desconectar de la rutina.')
      : (params.destino
          ? `Una experiencia para conocer los mejores rincones de ${params.destino} en grupo y con todo organizado.`
          : 'Una experiencia para recorrer la montaña en grupo y con todo organizado.')

    return `${complementaryText}\n\n${cta}\n\n${params.hashtags}`.trim()
  }

  // Para carruseles que necesitan una descripción complementaria como el resto de publicaciones
  if (params.isCarousel) {
    const hook = params.mainText ? params.mainText.trim().replace(/[.]+$/, '') : null
    const complementaryText = isGroup
      ? (params.destino
          ? `Caminatas en grupo por ${params.destino} para conectar con la naturaleza, sumar movimiento y desconectar de la rutina.`
          : 'Caminatas en grupo para conectar con la naturaleza, sumar movimiento y desconectar de la rutina.')
      : (params.destino
          ? `Deslizá para ver todos los detalles y el recorrido de nuestra próxima salida a ${params.destino}.`
          : 'Deslizá para ver todos los detalles y el recorrido de nuestra próxima salida.')

    const body = hook ? `${hook}.\n\n${complementaryText}` : complementaryText
    return `${body}\n\n${cta}\n\n${params.hashtags}`.trim()
  }
  
  // Para piezas estáticas / banners / carruseles promocionales
  const parts = [params.mainText, params.secondaryText]
    .filter(Boolean)
    .map(p => p!.trim().replace(/[.]+$/, ''))
    
  let text = parts.join(' · ')
  if (!text) {
    text = `Conocé ${params.destino || 'nuestra próxima salida'} desde adentro.`
  }
  
  return `${text}.\n\n${cta}\n\n${params.hashtags}`.trim()
}

/**
 * Truncates a description safely to respect character limits,
 * ensuring that words are NEVER split in half and final CTA is prioritized.
 */
export function enforceCharacterLimit(description: string | null, limit: number = 280): string | null {
  if (!description || description.length <= limit) return description
  
  const paragraphs = description.split('\n\n').filter(p => p.trim().length > 0)
  
  if (paragraphs.length <= 1) {
    const slice = description.slice(0, Math.max(0, limit - 3))
    const atWord = slice.replace(/[,\s.:·–—]+\S*$/, '').trim()
    return atWord ? `${atWord}...` : description.slice(0, limit)
  }
  
  // Identificar hashtags y CTA
  const lastParagraph = paragraphs[paragraphs.length - 1]
  const hasHashtags = lastParagraph.startsWith('#')
  const hashtags = hasHashtags ? lastParagraph : null
  const cta = hasHashtags ? (paragraphs.length > 2 ? paragraphs[paragraphs.length - 2] : null) : lastParagraph

  // 1. Si quitando solo los hashtags entra en el límite, los omitimos
  const withoutHashtags = paragraphs.filter(p => p !== hashtags).join('\n\n')
  if (withoutHashtags.length <= limit) {
    return withoutHashtags
  }

  // 2. Si necesitamos recortar el cuerpo manteniendo el CTA
  if (cta) {
    const bodyParts = paragraphs.filter(p => p !== cta && p !== hashtags)
    const body = bodyParts.join('\n\n')
    const remainingForBody = limit - cta.length - 2 // 2 caracteres de '\n\n'

    // Solo mostramos cuerpo si hay espacio para una frase coherente (mínimo 25 caracteres)
    if (remainingForBody >= 25 && body.length > 0) {
      const slice = body.slice(0, remainingForBody - 3)
      const atWord = slice.replace(/[,\s.:·–—]+\S*$/, '').trim()
      if (atWord.length >= 15) {
        return `${atWord}...\n\n${cta}`
      }
    }

    // Si no entra el cuerpo de forma coherente, mostramos únicamente el CTA completo
    if (cta.length <= limit) {
      return cta
    }
  }

  // Fallback con corte limpio de palabra
  const slice = description.slice(0, Math.max(0, limit - 3))
  const atWord = slice.replace(/[,\s.:·–—]+\S*$/, '').trim()
  return atWord ? `${atWord}...` : description.slice(0, limit)
}

/**
 * Limpia frases redundantes generadas por la IA como "Comentá INFO y te paso la info".
 */
export function cleanRedundantInfoPhrases(text: string, keyword: string = 'INFO'): string {
  const isInfo = keyword.trim().toUpperCase() === 'INFO'
  
  // Replace "comentá INFO y te paso/pasamos/enviamos la info/información" with quotes, brackets, etc.
  const redundantInfoRegex = /(?:coment[aá]|escrib[ií]|mand[aá]|dej[aá])\s+["']?info["']?\s+y\s+te\s+(?:paso|pasamos|enviamos|mando|mandamos)\s+(?:toda\s+)?(?:la\s+)?(?:info|informaci[oó]n|todo)\.?/gi
  text = text.replace(redundantInfoRegex, 'Comentá INFO para sumarte.')

  // Replace generic "comentá <palabra> y te paso/pasamos la info"
  const genericInfoRegex = /(?:coment[aá]|escrib[ií]|mand[aá]|dej[aá])\s+["']?([^\s,"'.]+)["']?\s+y\s+te\s+(?:paso|pasamos|enviamos|mando|mandamos)\s+(?:toda\s+)?(?:la\s+)?(?:info|informaci[oó]n|todo)\.?/gi
  text = text.replace(genericInfoRegex, (_match, word) => {
    return word.toUpperCase() === 'INFO'
      ? 'Comentá INFO para sumarte.'
      : `Comentá ${word} para recibir los detalles.`
  })

  // Catch any lingering standalone "y te paso la info" / "y te pasamos la info"
  text = text.replace(/\by\s+te\s+(?:paso|pasamos|enviamos|mando|mandamos)\s+(?:toda\s+)?la\s+info\.?/gi, 'para recibir los detalles.')

  return text
}

