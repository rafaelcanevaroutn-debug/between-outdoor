import type { ClientOnboarding, Niche, Salida } from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import { buildClientBlock, buildSalidaBlock } from '@/lib/generators/shared-prompt-blocks'
import { extractVideoJson } from '@/lib/generators/video-generation-shared'
import { normalizeListicleItems } from './video-family-2-contract.ts'
import { comparableVideoText } from './video-verified-places.ts'
import { validateBannerFieldList } from './banner-text-limits.ts'
import {
  bannerMolde1ItemCandidates,
  MAX_BANNER_ITEMS,
  MIN_BANNER_ITEMS,
} from './banner-molde-1-items-contract.ts'

// Items de Molde 1 — mismo mecanismo de lista cerrada que ya usa Familia 2a
// (video-familia-2.ts/video-family-2-contract.ts: listicleCandidatePlaces):
// Gemini no redacta texto libre, elige y copia exacto de una lista de
// lugares verificados. Único ajuste: el tope es 2-3 (spec de Molde 1), no
// 4-5 como 2a, y el filtro de longitud usa el cap de banner por ancho
// (parámetro), no WINDOW_MAX_CHARACTERS de video.

const MAX_GENERATION_ATTEMPTS = 2

function resolveItemCount(candidateCount: number): number {
  return Math.max(0, Math.min(candidateCount, MAX_BANNER_ITEMS))
}

export interface GenerateBannerMolde1ItemsParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  itemMaxCharacters: number
}

function buildPrompt(
  candidates: string[],
  itemCount: number,
  p: GenerateBannerMolde1ItemsParams,
  correction?: string,
): string {
  return `${buildClientBlock(p.clientName, p.clientOnboarding, p.salida)}

${buildSalidaBlock(p.salida, p.clientOnboarding)}

=== LUGARES VERIFICADOS DISPONIBLES ===
${candidates.map(value => `- ${value}`).join('\n')}
Elegí exactamente ${itemCount} de esta lista para "items". Copialos EXACTAMENTE como están (mismo texto, mismas mayúsculas y tildes) — mismo mecanismo que ya usa Familia 2a. No inventes lugares fuera de esta lista, no los combines ni les agregues datos, no los numeres.

=== LÍMITE DURO ===
Cada ítem ya entra en ${p.itemMaxCharacters} caracteres — la lista de arriba está pre-filtrada.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nRehacé la selección corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "items": ["lugar elegido de la lista, copiado tal cual", "otro lugar elegido de la lista"]
}`
}

function isExactCandidateMatch(item: string, candidates: string[]): boolean {
  const normalized = comparableVideoText(item)
  return candidates.some(candidate => comparableVideoText(candidate) === normalized)
}

export interface GenerateBannerMolde1ItemsResult {
  items: string[]
  inputTokens: number
  outputTokens: number
}

export async function generateBannerMolde1Items(
  p: GenerateBannerMolde1ItemsParams,
): Promise<GenerateBannerMolde1ItemsResult> {
  const candidateValues = bannerMolde1ItemCandidates(p.salida, p.itemMaxCharacters)
    .map(place => place.value)
  const itemCount = resolveItemCount(candidateValues.length)
  if (itemCount < MIN_BANNER_ITEMS) {
    throw new Error(`Molde 1 requiere al menos ${MIN_BANNER_ITEMS} lugares verificados de hasta ${p.itemMaxCharacters} caracteres; esta salida tiene ${candidateValues.length}`)
  }

  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(candidateValues, itemCount, p, correction),
      `banner-molde-1-items[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (!Array.isArray(raw.items)) throw new Error('items no es un array')
      const items = normalizeListicleItems(raw.items)

      const errors: string[] = []
      if (items.length !== itemCount) {
        errors.push(`items debe tener exactamente ${itemCount} elementos; se recibieron ${items.length}`)
      }
      for (const [index, item] of items.entries()) {
        if (!isExactCandidateMatch(item, candidateValues)) {
          errors.push(`item ${index + 1} no coincide exactamente con un lugar de la lista verificada`)
        }
      }
      const lengthViolations = validateBannerFieldList(items, p.itemMaxCharacters)
        .some(validation => validation.violations.length > 0)
      if (lengthViolations) errors.push(`algún item supera ${p.itemMaxCharacters} caracteres`)

      if (errors.length > 0) {
        correction = errors.join('; ')
        throw new Error(correction)
      }

      return { items, inputTokens: totalInputTokens, outputTokens: totalOutputTokens }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[BANNER/MOLDE-1-ITEMS] intento ${attempt} rechazado: ${message}`)
    }
  }

  // Fallback determinístico con los lugares verificados de la salida
  const fallbackItems = candidateValues.slice(0, itemCount)
  return { items: fallbackItems, inputTokens: totalInputTokens, outputTokens: totalOutputTokens }
}
