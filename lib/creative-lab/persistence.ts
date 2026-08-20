import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '../supabase/admin.ts'
import type { CreativeLabStoredCandidate } from './batch.ts'
import type { CreativeTemplateContract } from './template-contract.ts'

export interface CreativeCandidatePersistenceOptions {
  contract: CreativeTemplateContract
  sourceModel: string
  createdBy?: string | null
  parentTemplateId?: string | null
  client?: SupabaseClient
  storePreview?: (input: {
    templateId: string
    version: string
    png: Uint8Array
  }) => Promise<string>
  removePreview?: (previewId: string) => Promise<void>
  runId?: string
}

function slugifyCandidateName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 60)

  return slug || 'candidate'
}

export function buildCreativeTemplateInsert(
  candidate: CreativeLabStoredCandidate,
  options: Omit<CreativeCandidatePersistenceOptions, 'client' | 'storePreview'>,
  previewDriveFileId: string | null = null,
  previewStoragePath: string | null = null,
  templateIdOverride?: string,
) {
  const { contract } = options
  const runSuffix = options.runId ? `-${slugifyCandidateName(options.runId).slice(0, 20)}` : ''
  const templateId = templateIdOverride ?? `${contract.template_id}-${slugifyCandidateName(candidate.name)}${runSuffix}`

  return {
    template_id: templateId,
    version: contract.version,
    piece_type: contract.piece_type,
    mold_type: contract.mold_type ?? null,
    width: contract.dimensions.width,
    height: contract.dimensions.height,
    variant: contract.variant,
    status: 'experimental' as const,
    slots_schema: contract.slots,
    branding_tokens: contract.branding_tokens,
    html_template: candidate.html,
    preview_drive_file_id: previewDriveFileId,
    preview_storage_path: previewStoragePath,
    source_model: options.sourceModel,
    critique_summary: JSON.stringify({
      rationale: candidate.rationale,
      verdict: candidate.critique.verdict,
      issues: candidate.critique.issues,
    }),
    parent_template_id: options.parentTemplateId ?? null,
    created_by: options.createdBy ?? null,
  }
}

/** Adapta la salida del loop creativo al callback `persist` de runCreativeLabBatch. */
export function createCreativeCandidatePersister(options: CreativeCandidatePersistenceOptions) {
  const client = options.client ?? createAdminClient()
  let candidateSequence = 0

  return async (candidate: CreativeLabStoredCandidate): Promise<{ id: string }> => {
    const runSuffix = options.runId ? `-${slugifyCandidateName(options.runId).slice(0, 20)}` : ''
    const sequence = String(++candidateSequence).padStart(2, '0')
    const templateId = `${options.contract.template_id}-${slugifyCandidateName(candidate.name)}${runSuffix}-${sequence}`
    let previewStoragePath: string | null = null
    const previewDriveFileId = options.storePreview
      ? await options.storePreview({
        templateId,
        version: options.contract.version,
        png: candidate.previewPng,
      })
      : null

    if (!options.storePreview) {
      previewStoragePath = `${templateId}/${options.contract.version}.png`
      const {error: uploadError} = await client.storage
        .from('creative-template-previews')
        .upload(previewStoragePath, candidate.previewPng, {contentType: 'image/png', upsert: false})
      if (uploadError) throw new Error(`No se pudo guardar el PNG de ${candidate.name}: ${uploadError.message}`)
    }

    const insert = buildCreativeTemplateInsert(candidate, options, previewDriveFileId, previewStoragePath, templateId)
    const { data, error } = await client
      .from('template_library')
      .insert(insert)
      .select('id')
      .single()

    if (error || !data) {
      if (previewStoragePath) await client.storage.from('creative-template-previews').remove([previewStoragePath])
      if (previewDriveFileId && options.removePreview) await options.removePreview(previewDriveFileId)
      throw new Error(`No se pudo guardar el candidato ${candidate.name}: ${error?.message ?? 'sin respuesta'}`)
    }

    return { id: data.id as string }
  }
}
