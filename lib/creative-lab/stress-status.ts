export interface CreativeStressState {
  stress_tested_at?: string | null
  stress_test_passed?: boolean | null
  stress_test_error?: string | null
}

export function buildCreativeStressResult(params: {ok: boolean; error?: string; testedAt?: string}): Required<CreativeStressState> {
  return {
    stress_tested_at: params.testedAt ?? new Date().toISOString(),
    stress_test_passed: params.ok,
    stress_test_error: params.ok ? null : (params.error?.trim() || 'La prueba de textos extremos falló'),
  }
}

export function creativeTemplateApprovalBlocker(state: CreativeStressState): string | null {
  if (!state.stress_tested_at) return 'Falta ejecutar la prueba de textos extremos'
  if (!state.stress_test_passed) return state.stress_test_error?.trim() || 'La prueba de textos extremos no fue superada'
  return null
}
