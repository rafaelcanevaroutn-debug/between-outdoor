import {MOLDE_1_CREATIVE_CONTRACT} from './molde-1-lab.ts'
import {MOLDE_3_CREATIVE_CONTRACT} from './molde-3-lab.ts'
import {MOLDE_5_CREATIVE_CONTRACT} from './molde-5-lab.ts'
import type {CreativeTemplateContract} from './template-contract.ts'

function personalBrandContract(
  contract: CreativeTemplateContract,
  templateId: string,
): CreativeTemplateContract {
  return {
    ...contract,
    template_id: templateId,
    slots: {
      ...contract.slots,
      // Renzo + Franco es una dupla/marca personal. El diseño debe funcionar
      // con nombre tipográfico y no exigir un isotipo inexistente.
      logo: {type: 'image_url', required: false},
    },
  }
}

export const CARIBE_SOCIAL_MINIMAL_CONTRACT = personalBrandContract(
  MOLDE_1_CREATIVE_CONTRACT,
  'banner_molde_1_caribe_social_minimal',
)

export const CARIBE_EDITORIAL_COMERCIAL_CONTRACT = personalBrandContract(
  MOLDE_3_CREATIVE_CONTRACT,
  'banner_molde_3_caribe_editorial_comercial',
)

export const CARIBE_FICHA_ORGANICA_CONTRACT = personalBrandContract(
  MOLDE_5_CREATIVE_CONTRACT,
  'banner_molde_5_caribe_ficha_organica',
)

export const CARIBE_SOCIAL_MINIMAL_HTML = `<style data-template-css>
*{box-sizing:border-box}.slide{position:relative;width:1080px;height:1350px;overflow:hidden;background:var(--brand-bg);color:var(--brand-text);font-family:var(--font-body);border-color:var(--brand-primary);outline-color:var(--brand-secondary)}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,9,.05) 0%,rgba(3,8,9,.02) 38%,rgba(3,8,9,.56) 100%)}
.brand{position:absolute;z-index:2;top:64px;left:64px;right:64px;display:flex;align-items:center;justify-content:center;gap:18px}.brand img{width:auto;height:46px;max-width:230px;object-fit:contain}.brand p{margin:0;color:var(--brand-text);font:700 20px/1 var(--font-body);letter-spacing:.18em;text-transform:uppercase;text-shadow:0 2px 18px rgba(0,0,0,.45)}
.content{position:absolute;z-index:2;left:72px;right:72px;bottom:76px;text-align:center;text-shadow:0 3px 22px rgba(0,0,0,.72)}
.place{max-width:930px;margin:0 auto;color:var(--brand-text);font:800 102px/.9 var(--font-title);letter-spacing:-.055em;text-wrap:balance;text-transform:uppercase}.date{margin:24px 0 0;font:700 25px/1 var(--font-body);letter-spacing:.16em;text-transform:uppercase}.copy{max-width:760px;margin:30px auto 0;font:500 37px/1.08 var(--font-body);letter-spacing:-.025em;text-wrap:balance}.details{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:14px 22px;margin:30px auto 0;color:var(--brand-text);font:650 19px/1.2 var(--font-body);letter-spacing:.06em;text-transform:uppercase}.details span:not(:empty)+span:not(:empty)::before{content:'·';margin-right:22px;color:var(--brand-primary)}
p[data-slot]:empty,span[data-slot]:empty{display:none}
</style><main class="slide"><img class="photo" data-slot="bg_image" alt=""><div class="shade"></div><header class="brand"><img data-slot="logo" alt=""><p data-slot="marca"></p></header><section class="content"><h1 class="place" data-slot="lugar"></h1><p class="date" data-slot="fecha"></p><p class="copy" data-slot="copy"></p><div class="details"><span data-slot="item_1"></span><span data-slot="item_2"></span><span data-slot="item_3"></span></div></section></main>`

export const CARIBE_EDITORIAL_COMERCIAL_HTML = `<style data-template-css>
*{box-sizing:border-box}.slide{position:relative;width:1080px;height:1350px;overflow:hidden;background:var(--brand-bg);color:var(--brand-text);font-family:var(--font-body);border-color:var(--brand-primary);outline-color:var(--brand-secondary)}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,9,.15),rgba(3,8,9,0) 30%,rgba(3,8,9,.12) 50%,rgba(3,8,9,.76) 100%)}
.brand{position:absolute;z-index:2;top:62px;left:68px;right:68px;display:flex;align-items:center;justify-content:space-between}.brand img{width:auto;height:44px;max-width:220px;object-fit:contain}.brand p{margin:0 auto;color:var(--brand-text);font:700 19px/1 var(--font-body);letter-spacing:.16em;text-transform:uppercase;text-shadow:0 2px 16px rgba(0,0,0,.6)}
.content{position:absolute;z-index:2;left:70px;right:70px;bottom:66px;text-align:center;text-shadow:0 3px 22px rgba(0,0,0,.76)}
.place{max-width:930px;margin:0 auto;color:var(--brand-text);font:750 98px/.92 var(--font-title);letter-spacing:-.052em;text-wrap:balance;text-transform:uppercase}.date{margin:20px 0 0;font:700 23px/1 var(--font-body);letter-spacing:.15em;text-transform:uppercase}
.price{margin:34px auto 0;color:var(--brand-text);font:800 46px/1 var(--font-title);letter-spacing:-.025em}.commercial{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px 20px;max-width:900px;margin:22px auto 0;font:650 18px/1.25 var(--font-body);letter-spacing:.035em}.commercial span:not(:empty)+span:not(:empty)::before{content:'·';margin-right:20px;color:var(--brand-primary)}
.cta{display:inline-block;margin:30px 0 0;color:var(--brand-text);font:800 20px/1 var(--font-body);letter-spacing:.08em;text-transform:uppercase;border-bottom:3px solid var(--brand-secondary);padding-bottom:8px}
p[data-slot]:empty,span[data-slot]:empty{display:none}
</style><main class="slide"><img class="photo" data-slot="bg_image" alt=""><div class="veil"></div><header class="brand"><img data-slot="logo" alt=""><p data-slot="marca"></p></header><section class="content"><h1 class="place" data-slot="lugar"></h1><p class="date" data-slot="fecha"></p><p class="price" data-slot="precio"></p><div class="commercial"><span data-slot="reserva"></span><span data-slot="financiacion"></span><span data-slot="disponibilidad"></span></div><p class="cta" data-slot="cta"></p></section></main>`

export const CARIBE_FICHA_ORGANICA_HTML = `<style data-template-css>
*{box-sizing:border-box}.slide{position:relative;width:1080px;height:1350px;overflow:hidden;background:var(--brand-bg);color:var(--brand-text);font-family:var(--font-body);border-color:var(--brand-primary);outline-color:var(--brand-secondary)}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,8,9,.08) 0%,rgba(2,8,9,.03) 34%,rgba(2,8,9,.72) 100%)}
.brand{position:absolute;z-index:2;top:58px;left:64px;right:64px;display:flex;align-items:center;justify-content:center;gap:16px}.brand img{width:auto;height:42px;max-width:210px;object-fit:contain}.brand p{margin:0;color:var(--brand-text);font:750 18px/1 var(--font-body);letter-spacing:.16em;text-transform:uppercase;text-shadow:0 2px 15px rgba(0,0,0,.6)}
.content{position:absolute;z-index:2;left:62px;right:62px;bottom:55px;text-align:center;text-shadow:0 3px 20px rgba(0,0,0,.78)}
.place{max-width:940px;margin:0 auto;color:var(--brand-text);font:800 88px/.92 var(--font-title);letter-spacing:-.05em;text-transform:uppercase;text-wrap:balance}.date{margin:18px 0 0;font:700 22px/1 var(--font-body);letter-spacing:.14em;text-transform:uppercase}.stay{display:flex;justify-content:center;flex-wrap:wrap;gap:12px 20px;margin:26px auto 0;font:700 19px/1.2 var(--font-body);letter-spacing:.045em;text-transform:uppercase}.stay span:not(:empty)+span:not(:empty)::before{content:'·';margin-right:20px;color:var(--brand-primary)}
.includes{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:18px 24px;max-width:920px;margin:28px auto 0;padding-top:24px;border-top:1px solid color-mix(in srgb,var(--brand-text) 45%,transparent)}.include{display:flex;align-items:center;gap:8px;font:650 16px/1 var(--font-body);letter-spacing:.045em;text-transform:uppercase}.include [data-icon-key]{display:flex;width:24px;height:24px;color:var(--brand-secondary)}.include svg{width:24px;height:24px}
.price{margin:27px auto 0;font:800 36px/1 var(--font-title);letter-spacing:-.02em}.cta{display:inline-block;margin:22px 0 0;color:var(--brand-text);font:800 18px/1 var(--font-body);letter-spacing:.08em;text-transform:uppercase;border-bottom:3px solid var(--brand-primary);padding-bottom:7px}
p[data-slot]:empty,span[data-slot]:empty,[data-icon-key]:empty{display:none}.include:has(span:first-child:empty){display:none}
</style><main class="slide"><img class="photo" data-slot="bg_image" alt=""><div class="veil"></div><header class="brand"><img data-slot="logo" alt=""><p data-slot="marca"></p></header><section class="content"><h1 class="place" data-slot="lugar"></h1><p class="date" data-slot="fecha"></p><div class="stay"><span data-slot="noches"></span><span data-slot="alojamiento"></span><span data-slot="regimen"></span></div><div class="includes"><span class="include"><span data-slot="incluye_1"></span><span data-icon-key data-slot="incluye_1_icon"></span></span><span class="include"><span data-slot="incluye_2"></span><span data-icon-key data-slot="incluye_2_icon"></span></span><span class="include"><span data-slot="incluye_3"></span><span data-icon-key data-slot="incluye_3_icon"></span></span><span class="include"><span data-slot="incluye_4"></span><span data-icon-key data-slot="incluye_4_icon"></span></span></div><p class="price" data-slot="precio"></p><p class="cta" data-slot="cta"></p></section></main>`

export const ORGANIC_CARIBBEAN_TEMPLATES = [
  {
    key: 'social-minimal',
    label: 'Caribe · Postal orgánica',
    contract: CARIBE_SOCIAL_MINIMAL_CONTRACT,
    html: CARIBE_SOCIAL_MINIMAL_HTML,
    fontTitle: 'Inter' as const,
    mock: {
      marca: 'RENZO + FRANCO', lugar: 'CANCÚN, MÉXICO', fecha: '9—17 ENE 2027',
      copy: 'El plan que sí salió del chat.', item_1: 'Cancún', item_2: 'Playa del Carmen', item_3: 'Viaje grupal', logo: '',
    },
  },
  {
    key: 'editorial-comercial',
    label: 'Caribe · Comercial editorial',
    contract: CARIBE_EDITORIAL_COMERCIAL_CONTRACT,
    html: CARIBE_EDITORIAL_COMERCIAL_HTML,
    fontTitle: 'Inter' as const,
    mock: {
      marca: 'RENZO + FRANCO', lugar: 'CANCÚN', fecha: '9—17 ENE 2027', precio: 'DESDE USD 2.900',
      reserva: 'Reserva con USD 200', financiacion: 'Hasta 6 cuotas', disponibilidad: 'Cupos verificados', cta: 'Comentá MÉXICO', logo: '',
    },
  },
  {
    key: 'ficha-organica',
    label: 'Caribe · Flyer de experiencia',
    contract: CARIBE_FICHA_ORGANICA_CONTRACT,
    html: CARIBE_FICHA_ORGANICA_HTML,
    fontTitle: 'Inter' as const,
    mock: {
      marca: 'RENZO + FRANCO', lugar: 'CANCÚN + PLAYA DEL CARMEN', fecha: '9—17 ENE 2027',
      noches: '8 noches', alojamiento: 'Hotel verificado', regimen: 'Régimen mixto', precio: 'DESDE USD 2.900',
      incluye_1: 'Aéreos', incluye_1_icon: 'aereos', incluye_2: 'Traslados', incluye_2_icon: 'traslados',
      incluye_3: 'Asistencia', incluye_3_icon: 'asistencia', incluye_4: 'Alojamiento', incluye_4_icon: 'alojamiento',
      cta: 'Pedí el itinerario', logo: '',
    },
  },
] as const

