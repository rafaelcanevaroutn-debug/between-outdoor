import type { SupabaseClient } from '@supabase/supabase-js'

export async function claimBatchIndex(
  supabase: SupabaseClient,
  userId: string,
  formato: string,
): Promise<number> {
  const normalizedFormat = formato.trim()
  if (!normalizedFormat) throw new Error('El formato del contador de lote no puede estar vacío')

  const { data, error } = await supabase.rpc('claim_batch_rotation_index', {
    p_user_id: userId,
    p_formato: normalizedFormat,
  })
  if (error) throw new Error(`No se pudo reservar el índice de lote: ${error.message}`)

  const batchIndex = typeof data === 'number' ? data : Number(data)
  if (!Number.isSafeInteger(batchIndex) || batchIndex < 0) {
    throw new Error('La base devolvió un índice de lote inválido')
  }
  return batchIndex
}

export function getRotatedBatchItem<T>(
  items: readonly T[],
  batchIndex: number,
  itemIndex = 0,
): T {
  if (items.length === 0) throw new Error('La rotación de lote requiere al menos un elemento')
  if (!Number.isSafeInteger(batchIndex) || batchIndex < 0) throw new Error('batchIndex inválido')
  if (!Number.isSafeInteger(itemIndex) || itemIndex < 0) throw new Error('itemIndex inválido')
  return items[(batchIndex + itemIndex) % items.length]
}
