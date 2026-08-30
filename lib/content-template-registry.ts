import type {
  ContentProfileCode,
  ContentTemplate,
  ContentTemplateOverride,
  ContentTemplateRequirement,
  FormatoCarrusel,
  Salida,
  VideoKnowledgeFormat,
} from '@/types'
import type { PlannedDynamicWeeklySlot } from './calendar-format-plan.ts'
import {
  resolveBannerGeneratorMolde,
  resolveCarruselGeneratorFormat,
  resolveVideoGeneratorFormat,
} from './content-templates-generator-keys.ts'
import { resolveContentContextTags } from './content-context/registry.ts'

export interface RegistryTemplate extends ContentTemplate {
  verticals: string[]
  families: string[]
  requirements: ContentTemplateRequirement[]
  overrides: ContentTemplateOverride[]
}

export interface RecentTemplateUsage {
  templateId: string
  usedAt: string
}

export interface ContentTemplateSelection {
  templateId: string
  templateName: string
  generatorKey: string
  slotIndex: number
  fallbackToMain: boolean
  customRules: Record<string, unknown>
}

export interface ApplyRegistryResult {
  slots: PlannedDynamicWeeklySlot[]
  selections: Map<number, ContentTemplateSelection>
  warnings: string[]
}

function truthyInput(salida: Salida, inputKey: string): boolean {
  switch (inputKey) {
    case 'punto_encuentro': return Boolean(salida.punto_encuentro?.trim())
    case 'dias_semana': return Boolean(salida.dias_semana?.length)
    case 'hora_encuentro': return Boolean(salida.hora_encuentro?.trim())
    case 'puntos_interes_verificados': return Boolean(salida.puntos_interes?.length)
    case 'fotos':
    case 'carpeta_fotos': return Boolean(salida.carpeta_fotos_id)
    case 'videos':
    case 'carpeta_videos': return Boolean(salida.carpeta_videos_id)
    case 'itinerario': return Boolean(salida.itinerario?.trim() || salida.itinerario_dias?.length)
    case 'precio': return Number(salida.precio_usd) > 0
    case 'cupos': return Number(salida.cupos) > 0
    case 'fecha_inicio': return Boolean(salida.fecha_inicio)
    case 'context_tags': return resolveContentContextTags(salida).length > 0
    default: {
      const value = (salida as unknown as Record<string, unknown>)[inputKey]
      return Array.isArray(value) ? value.length > 0 : Boolean(value)
    }
  }
}

function requirementsSatisfied(template: RegistryTemplate, salida: Salida): boolean {
  return template.requirements
    .filter(requirement => requirement.required)
    .every(requirement => truthyInput(salida, requirement.input_key))
}

function activeOverride(
  template: RegistryTemplate,
  salidaId: string,
  today: string,
): ContentTemplateOverride | null {
  const current = template.overrides.filter(override => (
    (!override.vigente_desde || override.vigente_desde <= today)
    && (!override.vigente_hasta || override.vigente_hasta >= today)
  ))
  return current.find(override => override.salida_id === salidaId)
    ?? current.find(override => override.salida_id === null)
    ?? null
}

function currentFamily(slot: PlannedDynamicWeeklySlot): string | null {
  if (slot.formatoContenido === 'video') return slot.videoSubfamilia ?? null
  if (slot.formatoContenido === 'carrusel') return slot.formatoCarrusel ?? null
  if (slot.formatoContenido === 'banner') return slot.bannerMolde ? `molde_${slot.bannerMolde}` : null
  return null
}

function templateTypeMatchesSlot(template: RegistryTemplate, slot: PlannedDynamicWeeklySlot): boolean {
  if (slot.formatoContenido === 'banner') return template.type === 'banner' || template.type === 'flyer'
  return template.type === slot.formatoContenido
}

function generatorIsValid(template: RegistryTemplate): boolean {
  if (template.type === 'video') return resolveVideoGeneratorFormat(template.generator_key) !== null
  if (template.type === 'carrusel') return resolveCarruselGeneratorFormat(template.generator_key) !== null
  return resolveBannerGeneratorMolde(template.generator_key) !== null
}

function usedWithinWindow(template: RegistryTemplate, recent: RecentTemplateUsage[], today: string): boolean {
  if (template.repeat_guard_window <= 0) return false
  const threshold = new Date(`${today}T12:00:00Z`)
  threshold.setUTCDate(threshold.getUTCDate() - template.repeat_guard_window * 7)
  return recent.some(item => item.templateId === template.id && new Date(item.usedAt).getTime() >= threshold.getTime())
}

function weightedPick(templates: RegistryTemplate[], seed: number): RegistryTemplate | null {
  const weighted = templates
    .map(template => ({ template, weight: Math.max(0, Number(template.rotation_weight) || 0) }))
    .filter(item => item.weight > 0)
    .sort((left, right) => left.template.id.localeCompare(right.template.id))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return null
  let cursor = ((seed % total) + total) % total
  for (const item of weighted) {
    if (cursor < item.weight) return item.template
    cursor -= item.weight
  }
  return weighted.at(-1)?.template ?? null
}

function applyGenerator(slot: PlannedDynamicWeeklySlot, template: RegistryTemplate): PlannedDynamicWeeklySlot | null {
  if (template.metadata?.preserve_slot_family === true) return slot
  if (template.type === 'video') {
    const videoSubfamilia = resolveVideoGeneratorFormat(template.generator_key) as VideoKnowledgeFormat | null
    return videoSubfamilia ? { ...slot, videoSubfamilia } : null
  }
  if (template.type === 'carrusel') {
    const formatoCarrusel = resolveCarruselGeneratorFormat(template.generator_key) as FormatoCarrusel | null
    return formatoCarrusel ? { ...slot, formatoCarrusel } : null
  }
  const bannerMolde = resolveBannerGeneratorMolde(template.generator_key)
  return bannerMolde ? { ...slot, bannerMolde } : null
}

/**
 * Aplica la biblioteca encima del plan existente. Si la tabla está vacía,
 * una clave es inválida, falta un requisito o un override deshabilita la
 * pieza, el slot original queda intacto.
 */
export function applyContentTemplateRegistry(params: {
  slots: PlannedDynamicWeeklySlot[]
  templates: RegistryTemplate[]
  salidasById: Map<string, Salida>
  profile: ContentProfileCode
  rotationIndex: number
  today: string
  recentUsage?: RecentTemplateUsage[]
}): ApplyRegistryResult {
  const selections = new Map<number, ContentTemplateSelection>()
  const warnings: string[] = []
  const recentUsage = params.recentUsage ?? []
  const selectedThisRun = new Set<string>()

  const slots = params.slots.map(slot => {
    const salida = slot.salidaId ? params.salidasById.get(slot.salidaId) : null
    if (!salida) return slot
    const family = currentFamily(slot)
    const contextKeys = new Set([
      params.profile,
      salida.tipo_viaje,
      ...resolveContentContextTags(salida),
    ])

    const candidates = params.templates.filter(template => {
      if (template.status !== 'productiva' || template.is_main_default) return false
      if (!templateTypeMatchesSlot(template, slot) || !generatorIsValid(template)) return false
      const override = activeOverride(template, salida.id, params.today)
      if (template.metadata?.client_scoped === true && !override) return false
      if (override?.enabled === false) return false
      if (template.verticals.length > 0 && !template.verticals.some(key => contextKeys.has(key))) return false
      const overrideFamilies = Array.isArray(override?.custom_rules?.families)
        ? override.custom_rules.families.filter((key): key is string => typeof key === 'string')
        : []
      const effectiveFamilies = overrideFamilies.length > 0 ? overrideFamilies : template.families
      if (effectiveFamilies.length > 0 && (!family || !effectiveFamilies.includes(family))) return false
      return !usedWithinWindow(template, recentUsage, params.today)
    })

    // Si hay más de un diseño compatible, agotamos la variedad de la semana
    // antes de repetir. Cuando sólo existe uno, se conserva como fallback
    // válido para no dejar el slot sin pieza.
    // Una selección explícita del estudio del cliente debe gobernar el slot.
    // Los templates globales sólo participan cuando no existe una asignación
    // compatible del cliente; de otro modo podían ganar por peso/orden y hacer
    // que la interfaz guardara una cosa mientras el render usaba otra.
    const clientCandidates = candidates.filter(template => (
      template.metadata?.client_scoped === true
      && activeOverride(template, salida.id, params.today)?.enabled === true
    ))
    const prioritizedCandidates = clientCandidates.length > 0 ? clientCandidates : candidates
    const unusedCandidates = prioritizedCandidates.filter(template => !selectedThisRun.has(template.id))
    const picked = weightedPick(
      unusedCandidates.length > 0 ? unusedCandidates : prioritizedCandidates,
      params.rotationIndex + slot.index,
    )
    const pickedOverride = picked ? activeOverride(picked, salida.id, params.today) : null
    let selected = picked
    let fallbackToMain = false
    if (selected && !requirementsSatisfied(selected, salida)) {
      warnings.push(`Slot ${slot.index}: ${selected.generator_key} no cumple requisitos; se intenta main default.`)
      selected = null
    }

    if (!selected && picked) {
      selected = params.templates.find(template => (
        template.is_main_default
        && template.status === 'productiva'
        && templateTypeMatchesSlot(template, slot)
        && generatorIsValid(template)
        && activeOverride(template, salida.id, params.today)?.enabled !== false
        && requirementsSatisfied(template, salida)
      )) ?? null
      fallbackToMain = Boolean(selected)
    }
    if (!selected) return slot

    const next = applyGenerator(slot, selected)
    if (!next) {
      warnings.push(`Slot ${slot.index}: generator_key inválido (${selected.generator_key}); se conserva el motor actual.`)
      return slot
    }
    const selectedOverride = selected.id === picked?.id ? pickedOverride : activeOverride(selected, salida.id, params.today)
    selections.set(slot.index, {
      templateId: selected.id,
      templateName: selected.name,
      generatorKey: selected.generator_key,
      slotIndex: slot.index,
      fallbackToMain,
      customRules: selectedOverride?.custom_rules ?? {},
    })
    selectedThisRun.add(selected.id)
    return next
  })

  return { slots, selections, warnings }
}
