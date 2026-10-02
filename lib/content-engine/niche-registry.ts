import type { Vertical, Niche } from '../../types'
import { turismoAventuraConfig } from './niches/turismo-aventura.ts'
import { montanismoConfig } from './niches/montanismo.ts'
import { trekkingConfig } from './niches/trekking.ts'

export interface NicheConfiguration {
  id: string
  prompts: Record<Vertical, string>
  
  domain_knowledge?: string[] // Contexto del escenario
  subtypes?: string[]
  criticalFacts?: string[]
  buyerQuestions?: string[]
  editorialPillars?: string[]
  assetRequirements?: string[]
  
  antipatterns: string[]
  examples: Array<{ contexto: string; copy_ideal: string }>
}

const REGISTRY: Record<string, NicheConfiguration> = {
  'turismo_aventura': turismoAventuraConfig,
  'montañismo': montanismoConfig,
  'trekking': trekkingConfig
}

export function getNicheConfig(niche: string): NicheConfiguration {
  return REGISTRY[niche] || REGISTRY['turismo_aventura']
}
