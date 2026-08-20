import {CREATIVE_TEMPLATE_BRANDING_TOKENS, type CreativeTemplateContract} from './template-contract.ts'

export const MOLDE_5_CREATIVE_CONTRACT: CreativeTemplateContract = {
  template_id: 'banner_molde_5_agencia', version: '1.0.0', piece_type: 'banner', mold_type: 5,
  dimensions: {width: 1080, height: 1350}, variant: 'adaptive',
  slots: {
    marca: {type: 'text', required: true, max_chars: 32}, logo: {type: 'image_url', required: true}, bg_image: {type: 'image_url', required: true},
    lugar: {type: 'text', required: true, max_chars: 40}, fecha: {type: 'text', required: true, max_chars: 28}, noches: {type: 'text', required: true, max_chars: 18},
    alojamiento: {type: 'text', required: true, max_chars: 40}, regimen: {type: 'text', required: true, max_chars: 32}, precio: {type: 'text', required: false, max_chars: 28},
    incluye_1: {type: 'text', required: true, max_chars: 22}, incluye_1_icon: {type: 'text', required: true, max_chars: 16},
    incluye_2: {type: 'text', required: false, max_chars: 22}, incluye_2_icon: {type: 'text', required: false, max_chars: 16},
    incluye_3: {type: 'text', required: false, max_chars: 22}, incluye_3_icon: {type: 'text', required: false, max_chars: 16},
    incluye_4: {type: 'text', required: false, max_chars: 22}, incluye_4_icon: {type: 'text', required: false, max_chars: 16}, cta: {type: 'text', required: true, max_chars: 32},
  }, branding_tokens: [...CREATIVE_TEMPLATE_BRANDING_TOKENS],
}
export const MOLDE_5_CREATIVE_BRIEF = 'Flyer de agencia premium con destino, fechas, noches, alojamiento, régimen e incluidos verificados. Los valores *_icon son claves semánticas para iconografía determinística; nunca deben mostrarse como palabras.'
export const MOLDE_5_CREATIVE_RUBRIC = 'Rechazar si imita un paquete low-cost, inventa servicios, muestra las claves de ícono o no funciona cuando hay entre uno y cuatro incluidos.'
export const MOLDE_5_MOCK_TEXT = {marca: 'CAMINANTES VIAJES', lugar: 'RIVIERA MAYA', fecha: '8 AL 15 DE MARZO', noches: '8 NOCHES', alojamiento: 'HOTEL 4 ESTRELLAS', regimen: 'DESAYUNO + ALL INCLUSIVE', precio: 'DESDE USD 2.900', incluye_1: 'AÉREOS', incluye_1_icon: 'aereos', incluye_2: 'TRASLADOS', incluye_2_icon: 'traslados', incluye_3: 'ASISTENCIA', incluye_3_icon: 'asistencia', incluye_4: 'ALOJAMIENTO', incluye_4_icon: 'alojamiento', cta: 'PEDÍ EL ITINERARIO'} as const
export const MOLDE_5_CREATIVE_SKELETON = `<style data-template-css>.slide{position:relative;width:1080px;height:1350px;overflow:hidden;box-sizing:border-box;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1,.price{font-family:var(--font-title)}[data-icon-key] svg{width:32px;height:32px}</style><main class="slide"><img data-slot="bg_image" alt=""><header><img data-slot="logo" alt=""><p data-slot="marca"></p></header><section><h1 data-slot="lugar"></h1><p data-slot="fecha"></p><p data-slot="noches"></p><p data-slot="alojamiento"></p><p data-slot="regimen"></p><div><span data-slot="incluye_1"></span><span data-icon-key data-slot="incluye_1_icon"></span><span data-slot="incluye_2"></span><span data-icon-key data-slot="incluye_2_icon"></span><span data-slot="incluye_3"></span><span data-icon-key data-slot="incluye_3_icon"></span><span data-slot="incluye_4"></span><span data-icon-key data-slot="incluye_4_icon"></span></div><p class="price" data-slot="precio"></p><p data-slot="cta"></p></section></main>`
