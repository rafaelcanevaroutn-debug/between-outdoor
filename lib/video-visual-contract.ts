import type {VideoKnowledgeFormat} from '@/types'

export const ADAPTIVE_VIDEO_TEMPLATE = 'TemplateAdaptiveTravel' as const

export type VideoVisualLanguage =
  | 'premium_editorial'
  | 'native_social'
  | 'editorial_information'

export type VideoPresentationMode =
  | 'fixed_full_clip'
  | 'sequenced_by_clip'
  | 'intro_then_clean'
  | 'clean_with_caption'

export type VideoVisualFormat =
  | 'destination_list'
  | 'short_itinerary'
  | 'editorial_reflection'
  | 'pov_punchline'
  | 'viral_statement'
  | 'geo_minimal'
  | 'direct_information'
  | 'evidence_education'

export type VideoFontProfile =
  | 'geo_luxury_micro'
  | 'destination_serif'
  | 'social_native'
  | 'condensed_editorial'
  | 'information_title'

export interface VideoVisualContractV2 {
  contract_version: 2
  template_id: typeof ADAPTIVE_VIDEO_TEMPLATE
  format: VideoVisualFormat
  visual_language: VideoVisualLanguage
  presentation_mode: VideoPresentationMode
  font_profile: VideoFontProfile
  typography: {
    primary_id: string
    secondary_id: string
    text_color: '#FFFFFF'
    max_lines: number
    contrast_policy: 'contrast_only'
  }
  layout: {
    zone: 'auto' | 'top' | 'center' | 'bottom'
    preferred_zones: Array<'top' | 'center' | 'bottom'>
    safe_margin_percent: number
  }
  assets: {
    scope: 'uploaded_material_only'
    exact_experience_requires_material: true
  }
  logo: {
    policy: 'adaptive_or_omit'
  }
  emoji: {
    policy: 'format_dependent'
  }
  seed: string
}

interface ResolveVideoVisualContractInput {
  subfamilia: VideoKnowledgeFormat
  typographyId: string
  secondaryTypographyId?: string | null
  seed: string
}

type AdaptiveRule = Pick<
  VideoVisualContractV2,
  'format' | 'visual_language' | 'presentation_mode' | 'font_profile'
> & {
  maxLines: number
  preferredZones: Array<'top' | 'center' | 'bottom'>
}

const RULES: Partial<Record<VideoKnowledgeFormat, AdaptiveRule>> = {
  '2a': {
    format: 'destination_list',
    visual_language: 'editorial_information',
    presentation_mode: 'sequenced_by_clip',
    font_profile: 'condensed_editorial',
    maxLines: 3,
    preferredZones: ['top', 'center', 'bottom'],
  },
  '2b': {
    format: 'short_itinerary',
    visual_language: 'editorial_information',
    presentation_mode: 'sequenced_by_clip',
    font_profile: 'information_title',
    maxLines: 3,
    preferredZones: ['center'],
  },
  '2c': {
    format: 'destination_list',
    visual_language: 'editorial_information',
    presentation_mode: 'sequenced_by_clip',
    font_profile: 'condensed_editorial',
    maxLines: 3,
    preferredZones: ['top', 'center', 'bottom'],
  },
  '3a': {
    format: 'editorial_reflection',
    visual_language: 'premium_editorial',
    presentation_mode: 'intro_then_clean',
    font_profile: 'destination_serif',
    maxLines: 4,
    preferredZones: ['center', 'top', 'bottom'],
  },
  '3b': {
    format: 'pov_punchline',
    visual_language: 'native_social',
    presentation_mode: 'fixed_full_clip',
    font_profile: 'social_native',
    maxLines: 4,
    preferredZones: ['top', 'center', 'bottom'],
  },
  '3c': {
    format: 'viral_statement',
    visual_language: 'native_social',
    presentation_mode: 'fixed_full_clip',
    font_profile: 'social_native',
    maxLines: 4,
    preferredZones: ['top', 'center', 'bottom'],
  },
  '3d': {
    format: 'viral_statement',
    visual_language: 'native_social',
    presentation_mode: 'fixed_full_clip',
    font_profile: 'social_native',
    maxLines: 4,
    preferredZones: ['center', 'top', 'bottom'],
  },
  '3e': {
    format: 'geo_minimal',
    visual_language: 'premium_editorial',
    presentation_mode: 'fixed_full_clip',
    font_profile: 'geo_luxury_micro',
    maxLines: 2,
    preferredZones: ['center'],
  },
  '4': {
    format: 'direct_information',
    visual_language: 'editorial_information',
    presentation_mode: 'fixed_full_clip',
    font_profile: 'information_title',
    maxLines: 3,
    preferredZones: ['center'],
  },
  '5': {
    format: 'evidence_education',
    visual_language: 'editorial_information',
    presentation_mode: 'sequenced_by_clip',
    font_profile: 'condensed_editorial',
    maxLines: 3,
    preferredZones: ['top', 'bottom', 'center'],
  },
}

const VISUAL_FORMATS: readonly VideoVisualFormat[] = [
  'destination_list',
  'short_itinerary',
  'editorial_reflection',
  'pov_punchline',
  'viral_statement',
  'geo_minimal',
  'direct_information',
  'evidence_education',
]
const VISUAL_LANGUAGES: readonly VideoVisualLanguage[] = [
  'premium_editorial',
  'native_social',
  'editorial_information',
]
const PRESENTATION_MODES: readonly VideoPresentationMode[] = [
  'fixed_full_clip',
  'sequenced_by_clip',
  'intro_then_clean',
  'clean_with_caption',
]
const FONT_PROFILES: readonly VideoFontProfile[] = [
  'geo_luxury_micro',
  'destination_serif',
  'social_native',
  'condensed_editorial',
  'information_title',
]
const LAYOUT_ZONES = ['auto', 'top', 'center', 'bottom'] as const

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export function supportsAdaptiveVideoTemplate(subfamilia: VideoKnowledgeFormat): boolean {
  return Boolean(RULES[subfamilia])
}

export function resolveVideoVisualContract(
  input: ResolveVideoVisualContractInput,
): VideoVisualContractV2 | null {
  const rule = RULES[input.subfamilia]
  if (!rule) return null
  const secondaryTypographyId = input.secondaryTypographyId?.trim()
    || (rule.font_profile === 'social_native' ? 'inter' : 'plex')

  return {
    contract_version: 2,
    template_id: ADAPTIVE_VIDEO_TEMPLATE,
    format: rule.format,
    visual_language: rule.visual_language,
    presentation_mode: rule.presentation_mode,
    font_profile: rule.font_profile,
    typography: {
      primary_id: input.typographyId,
      secondary_id: secondaryTypographyId,
      text_color: '#FFFFFF',
      max_lines: rule.maxLines,
      contrast_policy: 'contrast_only',
    },
    layout: {
      // Los rótulos geográficos son una firma visual, no texto adaptativo:
      // siempre forman un bloque centrado aunque la foto tenga otra zona libre.
      zone: rule.format === 'geo_minimal'
        || rule.format === 'direct_information'
        || rule.format === 'short_itinerary'
        ? 'center'
        : 'auto',
      preferred_zones: rule.preferredZones,
      safe_margin_percent: 7,
    },
    assets: {
      scope: 'uploaded_material_only',
      exact_experience_requires_material: true,
    },
    logo: {policy: 'adaptive_or_omit'},
    emoji: {policy: 'format_dependent'},
    seed: input.seed,
  }
}

export function readVideoVisualContract(value: unknown): VideoVisualContractV2 | null {
  if (!isObject(value)) return null
  const typography = isObject(value.typography) ? value.typography : null
  const layout = isObject(value.layout) ? value.layout : null
  const assets = isObject(value.assets) ? value.assets : null
  const logo = isObject(value.logo) ? value.logo : null
  const emoji = isObject(value.emoji) ? value.emoji : null
  if (
    value.contract_version !== 2
    || value.template_id !== ADAPTIVE_VIDEO_TEMPLATE
    || !VISUAL_FORMATS.includes(value.format as VideoVisualFormat)
    || !VISUAL_LANGUAGES.includes(value.visual_language as VideoVisualLanguage)
    || !PRESENTATION_MODES.includes(value.presentation_mode as VideoPresentationMode)
    || !FONT_PROFILES.includes(value.font_profile as VideoFontProfile)
    || typeof value.seed !== 'string'
    || !typography
    || typeof typography.primary_id !== 'string'
    || typeof typography.secondary_id !== 'string'
    || typography.text_color !== '#FFFFFF'
    || typeof typography.max_lines !== 'number'
    || typography.contrast_policy !== 'contrast_only'
    || !layout
    || !LAYOUT_ZONES.includes(layout.zone as typeof LAYOUT_ZONES[number])
    || !isStringArray(layout.preferred_zones)
    || layout.preferred_zones.some(zone => zone === 'auto' || !LAYOUT_ZONES.includes(zone as typeof LAYOUT_ZONES[number]))
    || typeof layout.safe_margin_percent !== 'number'
    || !assets
    || assets.scope !== 'uploaded_material_only'
    || assets.exact_experience_requires_material !== true
    || logo?.policy !== 'adaptive_or_omit'
    || emoji?.policy !== 'format_dependent'
  ) return null

  return value as unknown as VideoVisualContractV2
}
