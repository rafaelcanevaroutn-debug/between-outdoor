import type { VideoKnowledgeFormat } from '@/types'
import { VIDEO_SUBFAMILIES } from './video-generation-dispatch.ts'
import {readVideoVisualContract} from './video-visual-contract.ts'

export interface VideoApprovalSourceRow {
  titulo: string | null
  subtitulo: string | null
  bullets: string[] | null
  cta: string | null
  generation_metadata: unknown
}

export type ApprovedVideoContractResult =
  | {
      ok: true
      subfamilia: VideoKnowledgeFormat
      contract: Record<string, unknown>
    }
  | { ok: false; error: string }

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function rebuildApprovedVideoContract(
  row: VideoApprovalSourceRow,
): ApprovedVideoContractResult {
  const metadata = objectValue(row.generation_metadata)
  if (metadata?.video_motor !== 'familias') {
    return { ok: false, error: 'La pieza usa el motor legacy o no declara el motor de familias' }
  }
  const subfamiliaRaw = metadata?.video_subfamilia
  if (typeof subfamiliaRaw !== 'string' || !VIDEO_SUBFAMILIES.has(subfamiliaRaw as VideoKnowledgeFormat)) {
    return { ok: false, error: 'La pieza no declara una subfamilia de video válida' }
  }
  const subfamilia = subfamiliaRaw as VideoKnowledgeFormat

  const original = objectValue(metadata?.video_contract) ?? {}
  const visualContract = readVideoVisualContract(original.visual_contract)
  const preserveVisualContract = (contract: Record<string, unknown>): Record<string, unknown> =>
    visualContract ? {...contract, visual_contract: visualContract} : contract
  const typographyId = nonEmptyString(original.tipografia_id)
  const duration = original.duracion_estimada_segundos
  if (!typographyId || typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return { ok: false, error: 'La pieza no conserva tipografía y duración válidas del contrato original' }
  }

  if (subfamilia === '5') {
    const lugar = nonEmptyString(original.lugar)
    const rawData = original.datos
    if (!lugar || !Array.isArray(rawData)) {
      return { ok: false, error: 'Familia 5 requiere lugar y datos estructurados antes de aprobar' }
    }
    const datos = rawData.map(item => {
      const datum = objectValue(item)
      const etiqueta = nonEmptyString(datum?.etiqueta)
      const valor = nonEmptyString(datum?.valor)
      return etiqueta && valor ? { etiqueta, valor } : null
    })
    if (datos.length < 3 || datos.some(datum => !datum)) {
      return { ok: false, error: 'Familia 5 requiere al menos tres datos estructurados válidos' }
    }
    const subtitle = nonEmptyString(original.subtitle)
    return {
      ok: true,
      subfamilia,
      contract: preserveVisualContract({
        lugar,
        ...(subtitle ? { subtitle } : {}),
        datos,
        tipografia_id: typographyId,
        duracion_estimada_segundos: duration,
      }),
    }
  }

  if (subfamilia === '1a') {
    const discurso = nonEmptyString(row.titulo)
    if (!discurso) return { ok: false, error: 'Familia 1a requiere un discurso antes de aprobar' }
    return {
      ok: true,
      subfamilia,
      contract: preserveVisualContract({
        discurso,
        tipografia_id: typographyId,
        duracion_estimada_segundos: duration,
      }),
    }
  }

  if (subfamilia === '1c') {
    return {
      ok: true,
      subfamilia,
      contract: preserveVisualContract({
        tipografia_id: typographyId,
        duracion_estimada_segundos: duration,
      }),
    }
  }

  const title = nonEmptyString(row.titulo)
  if (!title) return { ok: false, error: 'El texto principal aprobado no puede estar vacío' }

  if (subfamilia === '2a') {
    const items = (row.bullets ?? []).map(value => value.trim()).filter(Boolean)
    const cta = nonEmptyString(row.cta)
    if (items.length === 0 || !cta) {
      return { ok: false, error: 'Listicle requiere items y CTA antes de aprobar' }
    }
    return {
      ok: true,
      subfamilia,
      contract: preserveVisualContract({
        titulo: title,
        items,
        cta,
        tipografia_id: typographyId,
        duracion_estimada_segundos: duration,
      }),
    }
  }

  // 2c (Consejos) tiene el mismo shape de contrato que 2a — Mati confirmó
  // que el mecanismo de render es idéntico a nivel de estructura de datos
  // (secuencia de ventanas que se reemplazan); el progress indicator
  // (1/3, 2/3...) es solo visual del template, no cambia lo que mandamos.
  if (subfamilia === '2c') {
    const items = (row.bullets ?? []).map(value => value.trim()).filter(Boolean)
    const cta = nonEmptyString(row.cta)
    if (items.length === 0 || !cta) {
      return { ok: false, error: 'Consejos requiere items y CTA antes de aprobar' }
    }
    return {
      ok: true,
      subfamilia,
      contract: preserveVisualContract({
        titulo: title,
        items,
        cta,
        tipografia_id: typographyId,
        duracion_estimada_segundos: duration,
      }),
    }
  }

  if (subfamilia === '2b') {
    const desarrollo = (row.bullets ?? []).map(value => value.trim()).filter(Boolean)
    if (desarrollo.length === 0) {
      return { ok: false, error: 'Storytelling requiere desarrollo antes de aprobar' }
    }
    const cierre = nonEmptyString(row.cta)
    return {
      ok: true,
      subfamilia,
      contract: preserveVisualContract({
        apertura: title,
        desarrollo,
        ...(cierre ? { cierre } : {}),
        tipografia_id: typographyId,
        duracion_estimada_segundos: duration,
      }),
    }
  }

  if (subfamilia === '4') {
    if (!nonEmptyString(original.dato_duro)) {
      return { ok: false, error: 'La pieza comercial usa el contrato anterior; regenerala para separar dato_duro' }
    }
    const hardDatum = nonEmptyString(row.subtitulo)
    if (!hardDatum) return { ok: false, error: 'Familia 4 requiere un dato duro antes de aprobar' }
    const layout = original.layout === 'local_fixed_info' ? 'local_fixed_info' : null
    const items = (row.bullets ?? []).map(value => value.trim()).filter(Boolean)
    const cta = nonEmptyString(row.cta)
    if (layout && !cta) return { ok: false, error: 'El video informativo local requiere CTA antes de aprobar' }
    return {
      ok: true,
      subfamilia,
      contract: preserveVisualContract({
        copy: title,
        dato_duro: hardDatum,
        ...(layout ? { layout } : {}),
        ...(items.length > 0 ? { items } : {}),
        ...(cta ? { cta } : {}),
        tipografia_id: typographyId,
        duracion_estimada_segundos: duration,
      }),
    }
  }

  return {
    ok: true,
    subfamilia: subfamilia as VideoKnowledgeFormat,
    contract: preserveVisualContract({
      copy: title,
      tipografia_id: typographyId,
      duracion_estimada_segundos: duration,
    }),
  }
}
