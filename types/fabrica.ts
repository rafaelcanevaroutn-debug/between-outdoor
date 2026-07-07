export type Ratio = '4:5'
export type SlotType = 'text' | 'image' | 'image[]'

export interface TemplateSlot {
  type: SlotType
  max?: number
}

export interface Layer {
  element: string
  bind?: string | Record<string, string>
  x?: number
  y?: number
  w?: number
  h?: number
  rot?: number
  z?: number
  token?: string
  size?: number
  color_mode?: 'tint' | 'fixed'
}

export interface DBElement {
  id: string
  kind: 'structural' | 'ornamental'
  type: string
  species_name: string | null
  region_id: string | null
  component_key: string | null
  asset_url: string | null
  color_mode: 'tint' | 'fixed'
  color_map: Record<string, string>      // { "--var": "tokenRole" | "#hex" }
  props_schema: Record<string, unknown>
  preview_url: string | null
  tags: string[]
  description: string | null
  archived_at: string | null
}

export interface TemplateComposition {
  template_id: string
  region: string
  canvas: { ratio: Ratio; w: number; h: number }
  slots: Record<string, TemplateSlot>
  layers: Layer[]
}

export interface RegionTokens {
  [role: string]: string
}

export interface DBToken {
  id: string
  region_id: string
  category: string
  role: string
  value: string
}

export interface DBRegion {
  id: string
  slug: string
  name: string
  mood: string | null
}

export interface DBTemplate {
  id: string
  name: string
  archetype: string
  region_id: string | null
  composition: TemplateComposition
}

export type MockData = Record<string, string | string[]>
