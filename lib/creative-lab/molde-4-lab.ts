import {CREATIVE_TEMPLATE_BRANDING_TOKENS, type CreativeTemplateContract} from './template-contract.ts'

export const MOLDE_4_CREATIVE_CONTRACT: CreativeTemplateContract = {
  template_id: 'banner_molde_4_calendario', version: '2.0.0', piece_type: 'banner', mold_type: 4,
  dimensions: {width: 1080, height: 1350}, variant: 'adaptive',
  slots: {
    marca: {type: 'text', required: true, max_chars: 32}, logo: {type: 'image_url', required: true}, bg_image: {type: 'image_url', required: true},
    titulo: {type: 'text', required: true, max_chars: 36},
    salida_1_lugar: {type: 'text', required: true, max_chars: 32}, salida_1_fecha: {type: 'text', required: true, max_chars: 24},
    salida_1_precio: {type: 'text', required: true, max_chars: 24},
    salida_2_lugar: {type: 'text', required: true, max_chars: 32}, salida_2_fecha: {type: 'text', required: true, max_chars: 24},
    salida_2_precio: {type: 'text', required: true, max_chars: 24},
    salida_3_lugar: {type: 'text', required: false, max_chars: 32}, salida_3_fecha: {type: 'text', required: false, max_chars: 24},
    salida_3_precio: {type: 'text', required: false, max_chars: 24},
    salida_4_lugar: {type: 'text', required: false, max_chars: 32}, salida_4_fecha: {type: 'text', required: false, max_chars: 24},
    salida_4_precio: {type: 'text', required: false, max_chars: 24},
    cta: {type: 'text', required: true, max_chars: 32},
  }, branding_tokens: [...CREATIVE_TEMPLATE_BRANDING_TOKENS],
}
export const MOLDE_4_CREATIVE_BRIEF = 'Banner de agenda con dos a cuatro próximas salidas verificadas. Debe leerse como cartelera editorial de viajes, no como tabla o dashboard. Cada destino, fecha y precio forma una unidad comercial escaneable.'
export const MOLDE_4_CREATIVE_RUBRIC = 'Evaluar lectura rápida, jerarquía común, funcionamiento con dos y cuatro filas y ausencia de confusión entre destino, fecha y precio.'
export const MOLDE_4_MOCK_TEXT = {marca: 'CAMINANTES VIAJES', titulo: 'PRÓXIMAS SALIDAS', salida_1_lugar: 'EL CHALTÉN', salida_1_fecha: '15 DE NOVIEMBRE', salida_1_precio: 'DESDE USD 890', salida_2_lugar: 'TILCARA', salida_2_fecha: '6 DE DICIEMBRE', salida_2_precio: 'USD 420', salida_3_lugar: 'BARILOCHE', salida_3_fecha: '17 DE ENERO', salida_3_precio: 'USD 610', salida_4_lugar: 'USHUAIA', salida_4_fecha: '8 DE FEBRERO', salida_4_precio: 'DESDE USD 1.200', cta: 'ELEGÍ TU PRÓXIMO VIAJE'} as const
export const MOLDE_4_CREATIVE_SKELETON = `<style data-template-css>.slide{position:relative;width:1080px;height:1350px;overflow:hidden;box-sizing:border-box;color:var(--brand-text);background:var(--brand-bg);border-color:var(--brand-primary);outline-color:var(--brand-secondary);font-family:var(--font-body)}h1,.place{font-family:var(--font-title)}</style><main class="slide"><img data-slot="bg_image" alt=""><header><img data-slot="logo" alt=""><p data-slot="marca"></p></header><h1 data-slot="titulo"></h1><section><article><p class="place" data-slot="salida_1_lugar"></p><p data-slot="salida_1_fecha"></p><p data-slot="salida_1_precio"></p></article><article><p class="place" data-slot="salida_2_lugar"></p><p data-slot="salida_2_fecha"></p><p data-slot="salida_2_precio"></p></article><article><p class="place" data-slot="salida_3_lugar"></p><p data-slot="salida_3_fecha"></p><p data-slot="salida_3_precio"></p></article><article><p class="place" data-slot="salida_4_lugar"></p><p data-slot="salida_4_fecha"></p><p data-slot="salida_4_precio"></p></article></section><p data-slot="cta"></p></main>`
