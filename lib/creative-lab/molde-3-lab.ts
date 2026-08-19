import {CREATIVE_TEMPLATE_BRANDING_TOKENS, type CreativeTemplateContract} from './template-contract.ts'

export const MOLDE_3_CREATIVE_CONTRACT: CreativeTemplateContract = {
  template_id: 'banner_molde_3_comercial', version: '1.0.0', piece_type: 'banner', mold_type: 3,
  dimensions: {width: 1080, height: 1350}, variant: 'adaptive',
  slots: {
    marca: {type: 'text', required: true, max_chars: 32}, logo: {type: 'image_url', required: true}, bg_image: {type: 'image_url', required: true},
    lugar: {type: 'text', required: true, max_chars: 40}, fecha: {type: 'text', required: true, max_chars: 28},
    precio: {type: 'text', required: true, max_chars: 28}, reserva: {type: 'text', required: false, max_chars: 32},
    financiacion: {type: 'text', required: false, max_chars: 48}, disponibilidad: {type: 'text', required: false, max_chars: 32},
    cta: {type: 'text', required: true, max_chars: 32},
  }, branding_tokens: [...CREATIVE_TEMPLATE_BRANDING_TOKENS],
}
export const MOLDE_3_CREATIVE_BRIEF = 'Banner comercial premium de salida: destino y fotografía dominan; precio, reserva, financiación y disponibilidad son datos exactos, legibles y secundarios. No inventar descuentos, porcentajes ni urgencia.'
export const MOLDE_3_CREATIVE_RUBRIC = 'Rechazar si parece una placa de oferta genérica, si oculta condiciones, si precio/CTA tapan el destino o si un campo opcional vacío rompe el layout.'
export const MOLDE_3_MOCK_TEXT = {marca: 'CAMINANTES VIAJES', lugar: 'RIVIERA MAYA', fecha: '8 AL 15 DE MARZO', precio: 'DESDE USD 2.900', reserva: 'RESERVA CON USD 200', financiacion: 'HASTA 6 CUOTAS', disponibilidad: '8 CUPOS DISPONIBLES', cta: 'CONSULTÁ TU LUGAR'} as const
export const MOLDE_3_CREATIVE_SKELETON = `<style data-template-css>.slide{position:relative;width:1080px;height:1350px;overflow:hidden;box-sizing:border-box;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1,.price{font-family:var(--font-title)}</style><main class="slide"><img data-slot="bg_image" alt=""><header><img data-slot="logo" alt=""><p data-slot="marca"></p></header><section><h1 data-slot="lugar"></h1><p data-slot="fecha"></p><p class="price" data-slot="precio"></p><p data-slot="reserva"></p><p data-slot="financiacion"></p><p data-slot="disponibilidad"></p><p data-slot="cta"></p></section></main>`
