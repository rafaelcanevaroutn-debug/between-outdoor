import type {CreativeTemplateContract} from './template-contract.ts'

const SEEDS: Record<string, string> = {
  marca: 'CAMINANTES DE MONTAÑA',
  lugar: 'PARQUE NACIONAL LOS GLACIARES',
  fecha: '28 DICIEMBRE — 10 ENERO',
  copy: 'Una travesía entre senderos, glaciares y montañas para recordar.',
  cta: 'GUARDÁ ESTA TRAVESÍA PARA MÁS TARDE',
  mensaje: 'Hay caminos que se vuelven inolvidables cuando elegimos compartirlos.',
  convocatoria: 'Sumate a una comunidad que vuelve a encontrarse caminando.',
}

function stressText(name: string, maxChars: number): string {
  if (name.endsWith('_icon')) return ['aereos', 'traslados', 'asistencia', 'alojamiento'][Math.max(0, Number(name.match(/incluye_(\d+)/u)?.[1] ?? 1) - 1)] ?? 'guia'
  const seed = name.startsWith('ficha_')
    ? `DIFICULTAD ${name.slice('ficha_'.length)} · MEDIA INTERMEDIA`
    : name.startsWith('item_') ? 'Senderos entre bosques y glaciares'
      : name.includes('_lugar') ? 'PARQUE NACIONAL LOS GLACIARES'
        : name.includes('_fecha') ? '28 DICIEMBRE — 10 ENERO'
          : (SEEDS[name] ?? 'AVENTURA EN LA MONTAÑA')
  if (seed.length >= maxChars) return seed.slice(0, maxChars).trimEnd()
  let value = seed
  while (`${value} MONTAÑA`.length <= maxChars) value += ' MONTAÑA'
  return value
}

export function buildCreativeStressMockData(params: {
  contract: CreativeTemplateContract
  logoDataUrl: string
  backgroundDataUrl: string
}): Record<string, string> {
  const mockData: Record<string, string> = {}
  for (const [name, slot] of Object.entries(params.contract.slots)) {
    if (slot.type === 'image_url') {
      mockData[name] = name === 'logo' ? params.logoDataUrl : params.backgroundDataUrl
    } else {
      mockData[name] = stressText(name, slot.max_chars ?? 1)
    }
  }
  return mockData
}
