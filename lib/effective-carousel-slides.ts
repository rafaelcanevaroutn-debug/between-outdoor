import type {SlideCarrusel} from '@/types'

export function effectiveCarouselSlideCount(slides: SlideCarrusel[], renderedCount = 0): number {
  return Math.max(slides.length, renderedCount)
}

/**
 * Refleja en la UI las fotos que el motor agrega para cumplir el mínimo.
 * Las inserta antes del cierre para conservar el mismo orden que el render final.
 */
export function effectiveCarouselSlides(slides: SlideCarrusel[], renderedCount = 0): SlideCarrusel[] {
  const targetCount = effectiveCarouselSlideCount(slides, renderedCount)
  if (targetCount <= slides.length) return slides

  const result = slides.map(slide => ({...slide}))
  const closingIndex = result.at(-1)?.rol === 'cierre' ? result.length - 1 : result.length
  const missingCount = targetCount - result.length
  const photoSlides: SlideCarrusel[] = Array.from({length: missingCount}, () => ({
    n_slide: 0,
    rol: 'foto',
    tipo: 'foto',
    texto_principal: null,
    texto_apoyo: null,
    indicacion_imagen: 'Foto seleccionada del material de la salida.',
  }))

  result.splice(closingIndex, 0, ...photoSlides)
  return result.map((slide, index) => ({...slide, n_slide: index + 1}))
}
