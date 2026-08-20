import {BANNER_MOLDE_1_CAPS} from '../banner-render-contract.ts'
import {CREATIVE_TEMPLATE_BRANDING_TOKENS, type CreativeTemplateContract} from './template-contract.ts'

export const MOLDE_1_CREATIVE_CONTRACT: CreativeTemplateContract = {
  template_id: 'banner_molde_1_creative',
  version: '1.0.0',
  piece_type: 'banner',
  mold_type: 1,
  dimensions: {width: 1080, height: 1350},
  variant: 'adaptive',
  slots: {
    marca: {type: 'text', required: true, max_chars: 32},
    logo: {type: 'image_url', required: true},
    bg_image: {type: 'image_url', required: true},
    lugar: {type: 'text', required: true, max_chars: BANNER_MOLDE_1_CAPS.lugar},
    fecha: {type: 'text', required: true, max_chars: BANNER_MOLDE_1_CAPS.fecha},
    copy: {type: 'text', required: true, max_chars: BANNER_MOLDE_1_CAPS.copy},
    item_1: {type: 'text', required: true, max_chars: BANNER_MOLDE_1_CAPS.item},
    item_2: {type: 'text', required: true, max_chars: BANNER_MOLDE_1_CAPS.item},
    item_3: {type: 'text', required: false, max_chars: BANNER_MOLDE_1_CAPS.item},
  },
  branding_tokens: [...CREATIVE_TEMPLATE_BRANDING_TOKENS],
}

export const MOLDE_1_CREATIVE_BRIEF = `Diseñá un banner editorial premium para una salida de turismo de aventura. El Molde 1 es una invitación mínima: lugar y fecha visibles, una frase breve sin precio ni urgencia comercial, y dos o tres detalles concretos. La fotografía debe dominar, con composición de revista, aire y jerarquía clara. El logo nunca se recrea ni se deforma. Formato vertical 1080×1350 para feed.`

export const MOLDE_1_CREATIVE_BRAND_GUIDELINES = `Dirección visual: turismo premium contemporáneo, editorial y humano; evitar el aspecto de plantilla genérica, gradientes estridentes, tarjetas SaaS y decoración gratuita. Usar los tokens de marca para todos los colores y fuentes. Debe funcionar con una foto real, incluso con zonas luminosas o complejas. Conservar márgenes seguros amplios.`

export const MOLDE_1_CREATIVE_RUBRIC = `Puntuar jerarquía, legibilidad, contraste, uso de espacio, integración de la fotografía, tratamiento exacto del logo, personalidad editorial y robustez ante textos máximos. Rechazar si parece una plantilla genérica, si algún texto compite con el lugar, si el logo queda sin aire o si los datos se apoyan sobre una zona de foto sin protección suficiente.`

export const MOLDE_1_MOCK_TEXT = {
  marca: 'CAMINANTES VIAJES',
  lugar: 'EL CHALTÉN',
  fecha: '15 AL 19 DE NOVIEMBRE',
  copy: 'Cinco días entre senderos, glaciares y montañas que no se olvidan.',
  item_1: 'Senderos del Fitz Roy',
  item_2: 'Grupo acompañado',
  item_3: 'Aventura en Patagonia',
  // SVG autocontenido y una imagen mínima determinística para preflight/tests.
  // El runner real reemplaza ambos por assets aprobados antes de gastar API.
  logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNDAiIGhlaWdodD0iODAiPjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iODAiIGZpbGw9IndoaXRlIi8+PHRleHQgeD0iMTIiIHk9IjUwIiBmb250LXNpemU9IjI4IiBmaWxsPSJibGFjayI+Q0FNSU5BTlRFUzwvdGV4dD48L3N2Zz4=',
  bg_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XhWvWQAAAABJRU5ErkJggg==',
} as const
