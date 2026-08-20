import type {Salida, VideoTypographyId} from '@/types'
import {createBanner4Content, type Banner4ContentContract} from './banner-content.ts'
import {verifiedScheduleDeparture} from './banner-moldes-commercial.ts'
import {validateBannerMolde4Copy} from './banner-molde-4-contract.ts'

/**
 * Generador determinístico de agenda. No llama a modelos: cada mini-bloque se
 * deriva literalmente de una Salida y luego vuelve a validarse contra ella.
 */
export function generateBannerMolde4Copy(params: {
  salidas: Salida[]
  titulo?: string
  cta?: string
  typographyId: VideoTypographyId
}): Banner4ContentContract {
  const content = createBanner4Content({
    titulo: params.titulo ?? 'Próximas salidas',
    salidas: params.salidas.map(verifiedScheduleDeparture),
    cta: params.cta ?? 'Elegí tu próximo viaje',
    typographyId: params.typographyId,
  })
  const errors = validateBannerMolde4Copy({content, salidas: params.salidas})
  if (errors.length > 0) throw new Error(errors.join('; '))
  return content
}
