export interface BrandColors {
  color_primario: string
  color_secundario: string
  color_acento: string
  color_texto: string
  color_fondo: string
}

export interface BrandPaletteSuggestion {
  id: 'balanced' | 'dark' | 'bold'
  name: string
  description: string
  colors: BrandColors
  textContrast: number
}

interface Rgb {
  r: number
  g: number
  b: number
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function rgbToHex(color: Rgb): string {
  return `#${[color.r, color.g, color.b].map(value => clampChannel(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function hexToRgb(value: string): Rgb {
  const normalized = value.trim().replace(/^#/u, '')
  if (!/^[0-9a-f]{6}$/iu.test(normalized)) throw new Error(`Color inválido: ${value}`)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function mix(one: string, two: string, amountOfTwo: number): string {
  const a = hexToRgb(one)
  const b = hexToRgb(two)
  const amount = Math.max(0, Math.min(1, amountOfTwo))
  return rgbToHex({
    r: a.r * (1 - amount) + b.r * amount,
    g: a.g * (1 - amount) + b.g * amount,
    b: a.b * (1 - amount) + b.b * amount,
  })
}

function distance(one: string, two: string): number {
  const a = hexToRgb(one)
  const b = hexToRgb(two)
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}

function relativeLuminance(value: string): number {
  const {r, g, b} = hexToRgb(value)
  const channel = (raw: number) => {
    const normalized = raw / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function brandColorContrast(one: string, two: string): number {
  const a = relativeLuminance(one)
  const b = relativeLuminance(two)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function saturation({r, g, b}: Rgb): number {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max === min) return 0
  const lightness = (max + min) / 2
  return (max - min) / (1 - Math.abs(2 * lightness - 1))
}

function readableText(background: string): '#FAFAF7' | '#161915' {
  return brandColorContrast(background, '#161915') >= brandColorContrast(background, '#FAFAF7')
    ? '#161915'
    : '#FAFAF7'
}

function ensureAccentContrast(color: string, background: string, minimum = 3): string {
  if (brandColorContrast(color, background) >= minimum) return color
  const target = relativeLuminance(background) > 0.45 ? '#000000' : '#FFFFFF'
  for (let amount = 0.12; amount <= 0.84; amount += 0.12) {
    const candidate = mix(color, target, amount)
    if (brandColorContrast(candidate, background) >= minimum) return candidate
  }
  return readableText(background)
}

function distinctColor(colors: string[], base: string, fallback: string): string {
  return colors.find(color => distance(color, base) >= 72) ?? fallback
}

/**
 * Extrae colores dominantes de un buffer RGBA. Ignora transparencia y evita
 * que el blanco del lienzo opaque los colores reales del logotipo.
 */
export function extractDominantLogoColors(
  pixels: Uint8ClampedArray,
  options: {maxColors?: number; sampleStride?: number} = {},
): string[] {
  if (pixels.length % 4 !== 0) throw new Error('El buffer del logo no es RGBA')
  const maxColors = options.maxColors ?? 5
  const sampleStride = Math.max(1, Math.floor(options.sampleStride ?? 1))
  const buckets = new Map<string, {color: Rgb; count: number; score: number}>()

  for (let index = 0; index < pixels.length; index += 4 * sampleStride) {
    const alpha = pixels[index + 3] / 255
    if (alpha < 0.35) continue
    const color = {r: pixels[index], g: pixels[index + 1], b: pixels[index + 2]}
    const lightness = (Math.max(color.r, color.g, color.b) + Math.min(color.r, color.g, color.b)) / 510
    const chroma = saturation(color)
    const nearCanvas = chroma < 0.08 && (lightness > 0.94 || lightness < 0.035)
    if (nearCanvas) continue
    const quantized = {
      r: Math.min(255, Math.round(color.r / 24) * 24),
      g: Math.min(255, Math.round(color.g / 24) * 24),
      b: Math.min(255, Math.round(color.b / 24) * 24),
    }
    const key = `${quantized.r},${quantized.g},${quantized.b}`
    const visualWeight = alpha * (0.35 + chroma * 1.65) * (0.65 + (1 - Math.abs(lightness - 0.5)))
    const bucket = buckets.get(key) ?? {color: quantized, count: 0, score: 0}
    bucket.count += 1
    bucket.score += visualWeight
    buckets.set(key, bucket)
  }

  const ordered = [...buckets.values()].sort((a, b) => b.score - a.score || b.count - a.count)
  const selected: string[] = []
  for (const bucket of ordered) {
    const candidate = rgbToHex(bucket.color)
    if (selected.every(existing => distance(existing, candidate) >= 48)) selected.push(candidate)
    if (selected.length >= maxColors) break
  }
  return selected
}

export function buildBrandPaletteSuggestions(extractedColors: string[]): BrandPaletteSuggestion[] {
  const colors = extractedColors.filter(value => /^#[0-9a-f]{6}$/iu.test(value)).map(value => value.toUpperCase())
  const primary = colors[0] ?? '#3E5C48'
  const secondary = distinctColor(colors.slice(1), primary, mix(primary, '#FFFFFF', 0.38))
  const accentSource = distinctColor(colors.slice(2), primary, mix(primary, '#F4C95D', 0.55))

  const balancedBackground = mix(primary, '#FFFFFF', 0.95)
  const balancedText = readableText(balancedBackground)
  const balancedPrimary = ensureAccentContrast(primary, balancedBackground)
  const balancedAccent = ensureAccentContrast(accentSource, balancedBackground)

  const darkBackground = mix(primary, '#000000', 0.82)
  const darkText = readableText(darkBackground)
  const darkPrimary = ensureAccentContrast(primary, darkBackground)
  const darkSecondary = ensureAccentContrast(secondary, darkBackground)

  const boldBackground = accentSource
  const boldText = readableText(boldBackground)
  const boldPrimary = ensureAccentContrast(primary, boldBackground)

  const suggestions: BrandPaletteSuggestion[] = [
    {
      id: 'balanced',
      name: 'Equilibrada',
      description: 'La opción más segura para comunicar con claridad.',
      colors: {
        color_primario: balancedPrimary,
        color_secundario: ensureAccentContrast(secondary, balancedBackground),
        color_acento: balancedAccent,
        color_texto: balancedText,
        color_fondo: balancedBackground,
      },
      textContrast: brandColorContrast(balancedText, balancedBackground),
    },
    {
      id: 'dark',
      name: 'Oscura',
      description: 'Más cinematográfica, con contraste alto.',
      colors: {
        color_primario: darkPrimary,
        color_secundario: darkSecondary,
        color_acento: ensureAccentContrast(accentSource, darkBackground),
        color_texto: darkText,
        color_fondo: darkBackground,
      },
      textContrast: brandColorContrast(darkText, darkBackground),
    },
    {
      id: 'bold',
      name: 'Protagonista',
      description: 'Usa el color principal del logo como superficie.',
      colors: {
        color_primario: boldPrimary,
        color_secundario: ensureAccentContrast(secondary, boldBackground),
        color_acento: ensureAccentContrast(primary, boldBackground),
        color_texto: boldText,
        color_fondo: boldBackground,
      },
      textContrast: brandColorContrast(boldText, boldBackground),
    },
  ]

  return suggestions.map(suggestion => ({
    ...suggestion,
    textContrast: Math.round(suggestion.textContrast * 100) / 100,
  }))
}
