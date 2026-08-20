import {CREATIVE_TEMPLATE_BRANDING_TOKENS, type CreativeTemplateContract} from './template-contract.ts'

export const MOLDE_2_CREATIVE_CONTRACT: CreativeTemplateContract = {
  template_id: 'banner_molde_2_creative',
  version: '1.0.0',
  piece_type: 'banner',
  mold_type: 2,
  dimensions: {width: 1080, height: 1350},
  variant: 'adaptive',
  slots: {
    marca: {type: 'text', required: true, max_chars: 32},
    logo: {type: 'image_url', required: true},
    bg_image: {type: 'image_url', required: true},
    lugar: {type: 'text', required: true, max_chars: 40},
    fecha: {type: 'text', required: true, max_chars: 28},
    ficha_1: {type: 'text', required: true, max_chars: 32},
    ficha_2: {type: 'text', required: true, max_chars: 32},
    ficha_3: {type: 'text', required: true, max_chars: 32},
    ficha_4: {type: 'text', required: false, max_chars: 32},
    ficha_5: {type: 'text', required: false, max_chars: 32},
    ficha_6: {type: 'text', required: false, max_chars: 32},
    cta: {type: 'text', required: true, max_chars: 40},
  },
  branding_tokens: [...CREATIVE_TEMPLATE_BRANDING_TOKENS],
}

export const MOLDE_2_CREATIVE_BRIEF = `Diseñá un banner editorial premium para una salida con ficha técnica. La fotografía y el destino deben abrir la lectura; fecha, tres a seis datos breves y CTA editorial forman un segundo nivel claro. Evitá una grilla de dashboard o tarjetas repetidas. Formato vertical 1080×1350.`

export const MOLDE_2_CREATIVE_BRAND_GUIDELINES = `Turismo premium contemporáneo, aire, proporción y jerarquía. La ficha debe sentirse como información de revista o bitácora, no como panel SaaS. El logo se conserva sin filtros ni deformación. Usar sólo tokens de color y fuente.`

export const MOLDE_2_CREATIVE_RUBRIC = `Evaluar jerarquía, legibilidad, contraste, ritmo editorial de la ficha, integración de foto y logo, robustez con seis datos y CTA visible sin dominar. Rechazar aspecto de dashboard, módulos repetitivos, texto sobre foto sin protección o datos técnicos que compitan con el destino.`

export const MOLDE_2_MOCK_TEXT = {
  marca: 'CAMINANTES VIAJES',
  lugar: 'RIVIERA MAYA',
  fecha: '8 AL 15 DE MARZO',
  ficha_1: 'DURACIÓN · 8 NOCHES',
  ficha_2: 'ALOJAMIENTO · INCLUIDO',
  ficha_3: 'TRASLADOS · INCLUIDOS',
  ficha_4: 'RÉGIMEN · MIXTO',
  ficha_5: 'SALIDA · GRUPAL',
  ficha_6: 'ASISTENCIA · INCLUIDA',
  cta: 'GUARDÁ ESTA SALIDA',
} as const

export const MOLDE_2_CREATIVE_SKELETON = `<style data-template-css>
.slide{position:relative;width:1080px;height:1350px;overflow:hidden;box-sizing:border-box;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}
.place{font-family:var(--font-title)}
</style><main class="slide"><img class="background" data-slot="bg_image" alt=""><header class="brand"><img class="logo" data-slot="logo" alt=""><p data-slot="marca"></p></header><section class="content"><h1 class="place" data-slot="lugar"></h1><p class="date" data-slot="fecha"></p><div class="facts"><p data-slot="ficha_1"></p><p data-slot="ficha_2"></p><p data-slot="ficha_3"></p><p data-slot="ficha_4"></p><p data-slot="ficha_5"></p><p data-slot="ficha_6"></p></div><p class="cta" data-slot="cta"></p></section></main>`
