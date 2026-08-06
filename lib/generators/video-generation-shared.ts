export interface RawVideoResponse {
  [key: string]: unknown
  tipografia_id?: unknown
  duracion_estimada_segundos?: unknown
}

export function extractVideoJson(text: string): RawVideoResponse {
  const clean = text.replace(/```json\n?/giu, '').replace(/```\n?/gu, '').trim()
  const match = clean.match(/\{[\s\S]*\}/u)
  if (!match) throw new Error('La respuesta no contiene un objeto JSON')
  const parsed = JSON.parse(match[0]) as RawVideoResponse
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('La respuesta JSON no es un objeto')
  }
  return parsed
}

export function uniqueVideoTypographyIds(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}

export function resolveVideoTypography(raw: unknown, allowedIds: string[]): string {
  if (allowedIds.length === 0) {
    throw new Error('Se requiere al menos una tipografía habilitada')
  }
  const requested = typeof raw === 'string' ? raw.trim() : ''
  return allowedIds.includes(requested) ? requested : allowedIds[0]
}
