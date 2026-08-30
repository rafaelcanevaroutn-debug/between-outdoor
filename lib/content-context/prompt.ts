import type { Salida } from '@/types'
import { getContentContextDefinitions, resolveContentContextTags } from './registry.ts'

export function buildSalidaContentContextPrompt(
  salida: Pick<Salida, 'context_tags' | 'zona_geografica'>,
): string {
  const definitions = getContentContextDefinitions(resolveContentContextTags(salida))
  if (!definitions.length) return ''
  return [
    '=== CONTEXTO EDITORIAL DE ESTA SALIDA ===',
    'Estas etiquetas fueron seleccionadas para esta salida. Tienen prioridad sobre ejemplos genéricos del nicho y controlan copy, música y dirección temática.',
    ...definitions.map(tag => `- ${tag.label} [${tag.dimension}]. Usá: ${tag.copySignals.join(', ')}. Evitá: ${tag.avoidSignals.join(', ')}.`),
    'Combiná las etiquetas entre sí. No conviertas una sola etiqueta en todo el argumento y no agregues elementos que no estén verificados en los datos de la salida.',
  ].join('\n')
}
