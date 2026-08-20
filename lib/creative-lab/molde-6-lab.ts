import {CREATIVE_TEMPLATE_BRANDING_TOKENS, type CreativeTemplateContract} from './template-contract.ts'

export const MOLDE_6_CREATIVE_CONTRACT: CreativeTemplateContract = {
  template_id: 'banner_molde_6_creative',
  version: '1.0.0',
  piece_type: 'banner',
  mold_type: 6,
  dimensions: {width: 1080, height: 1350},
  variant: 'adaptive',
  slots: {
    marca: {type: 'text', required: true, max_chars: 32},
    logo: {type: 'image_url', required: true},
    bg_image: {type: 'image_url', required: true},
    mensaje: {type: 'text', required: true, max_chars: 80},
    convocatoria: {type: 'text', required: true, max_chars: 60},
  },
  branding_tokens: [...CREATIVE_TEMPLATE_BRANDING_TOKENS],
}

export const MOLDE_6_CREATIVE_BRIEF = `Diseñá un banner editorial premium de comunidad outdoor. No promociona una salida concreta: una frase aspiracional humana es protagonista y una convocatoria abierta invita a sumarse. La fotografía debe transmitir pertenencia y movimiento compartido. Formato vertical 1080×1350.`

export const MOLDE_6_CREATIVE_BRAND_GUIDELINES = `Identidad contemporánea, emocional y sobria; evitar clichés motivacionales, badges, urgencia comercial y recursos decorativos genéricos. Preservar el logo y trabajar con aire, fotografía y tipografía mediante tokens.`

export const MOLDE_6_CREATIVE_RUBRIC = `Evaluar emoción sin cliché, jerarquía entre mensaje y convocatoria, legibilidad, integración de fotografía y logo, personalidad editorial y robustez con textos máximos. Rechazar si parece publicidad de una salida, si la convocatoria compite con el mensaje o si la foto queda anulada por overlays.`

export const MOLDE_6_MOCK_TEXT = {
  marca: 'CAMINANTES VIAJES',
  mensaje: 'Hay caminos que se vuelven inolvidables cuando los compartimos.',
  convocatoria: 'Sumate a una comunidad que elige caminar junta.',
} as const

export const MOLDE_6_CREATIVE_SKELETON = `<style data-template-css>
.slide{position:relative;width:1080px;height:1350px;overflow:hidden;box-sizing:border-box;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}
.message{font-family:var(--font-title)}
</style><main class="slide"><img class="background" data-slot="bg_image" alt=""><header class="brand"><img class="logo" data-slot="logo" alt=""><p data-slot="marca"></p></header><section class="content"><h1 class="message" data-slot="mensaje"></h1><p class="invitation" data-slot="convocatoria"></p></section></main>`
