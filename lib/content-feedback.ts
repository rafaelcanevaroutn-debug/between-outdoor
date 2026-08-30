import type { FeedbackScope } from '@/types'

export interface FeedbackReferences {
  piece_id?: string | null
  family_key?: string | null
  generator_key?: string | null
  run_id?: string | null
}

/**
 * Cada scope de feedback exige su referencia correspondiente — mismo check
 * que la constraint de la migración 038, validado antes acá para devolver
 * un error claro en vez de dejar que falle la base.
 */
export function missingReferenceFieldForScope(scope: FeedbackScope, refs: FeedbackReferences): string | null {
  const requiredField: Record<FeedbackScope, keyof FeedbackReferences> = {
    pieza: 'piece_id',
    familia: 'family_key',
    motor: 'generator_key',
    run: 'run_id',
  }
  const field = requiredField[scope]
  return refs[field] ? null : field
}
