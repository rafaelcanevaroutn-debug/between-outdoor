export interface OpenAICreativePricing {
  model: string
  inputUsdPerMillion: number
  outputUsdPerMillion: number
}

export interface OpenAICreativeUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
}

export interface OpenAICreativeBudgetSnapshot {
  limitUsd: number
  spentUsd: number
  reservedUsd: number
  remainingUsd: number
  responses: number
  inputTokens: number
  outputTokens: number
}

export class OpenAICreativeBudgetExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenAICreativeBudgetExceededError'
  }
}

interface Reservation {
  maximumCostUsd: number
}

function positiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} debe ser un número positivo`)
}

export class OpenAICreativeBudget {
  readonly pricing: OpenAICreativePricing
  readonly limitUsd: number
  private spentUsd = 0
  private reservedUsd = 0
  private responses = 0
  private inputTokens = 0
  private outputTokens = 0
  private nextReservationId = 1
  private readonly reservations = new Map<number, Reservation>()

  constructor(params: {limitUsd: number; pricing: OpenAICreativePricing}) {
    positiveFinite(params.limitUsd, 'El presupuesto')
    positiveFinite(params.pricing.inputUsdPerMillion, 'El precio de entrada')
    positiveFinite(params.pricing.outputUsdPerMillion, 'El precio de salida')
    if (!params.pricing.model.trim()) throw new Error('El modelo de pricing no puede estar vacío')
    this.limitUsd = params.limitUsd
    this.pricing = {...params.pricing, model: params.pricing.model.trim()}
  }

  reserve(params: {model: string; estimatedInputTokens: number; maxOutputTokens: number}): number {
    if (params.model !== this.pricing.model) {
      throw new Error(`No hay pricing verificado para ${params.model}; el presupuesto está configurado para ${this.pricing.model}`)
    }
    positiveFinite(params.estimatedInputTokens, 'Los tokens estimados de entrada')
    positiveFinite(params.maxOutputTokens, 'maxOutputTokens')
    const maximumCostUsd = this.cost(params.estimatedInputTokens, params.maxOutputTokens)
    const available = this.limitUsd - this.spentUsd - this.reservedUsd
    if (maximumCostUsd > available + Number.EPSILON) {
      throw new OpenAICreativeBudgetExceededError(
        `Presupuesto OpenAI insuficiente: la llamada podría costar USD ${maximumCostUsd.toFixed(4)} y quedan USD ${Math.max(0, available).toFixed(4)}`,
      )
    }
    const id = this.nextReservationId++
    this.reservations.set(id, {maximumCostUsd})
    this.reservedUsd += maximumCostUsd
    return id
  }

  settle(reservationId: number, usage: {inputTokens: number; outputTokens: number; totalTokens?: number}): OpenAICreativeUsage {
    const reservation = this.takeReservation(reservationId)
    if (!Number.isInteger(usage.inputTokens) || usage.inputTokens < 0 || !Number.isInteger(usage.outputTokens) || usage.outputTokens < 0) {
      this.chargeUnknown(reservation)
      throw new Error('OpenAI devolvió usage inválido; se reservó el costo máximo por seguridad')
    }
    const costUsd = this.cost(usage.inputTokens, usage.outputTokens)
    if (costUsd > reservation.maximumCostUsd + Number.EPSILON) {
      this.chargeUnknown(reservation)
      throw new OpenAICreativeBudgetExceededError('OpenAI reportó un uso mayor al máximo reservado; la tanda fue detenida')
    }
    this.spentUsd += costUsd
    this.responses++
    this.inputTokens += usage.inputTokens
    this.outputTokens += usage.outputTokens
    return {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens ?? usage.inputTokens + usage.outputTokens,
      costUsd,
    }
  }

  settleUnknown(reservationId: number): void {
    this.chargeUnknown(this.takeReservation(reservationId))
  }

  snapshot(): OpenAICreativeBudgetSnapshot {
    return {
      limitUsd: this.limitUsd,
      spentUsd: this.spentUsd,
      reservedUsd: this.reservedUsd,
      remainingUsd: Math.max(0, this.limitUsd - this.spentUsd - this.reservedUsd),
      responses: this.responses,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    }
  }

  private cost(inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1_000_000) * this.pricing.inputUsdPerMillion
      + (outputTokens / 1_000_000) * this.pricing.outputUsdPerMillion
  }

  private takeReservation(id: number): Reservation {
    const reservation = this.reservations.get(id)
    if (!reservation) throw new Error('Reserva de presupuesto inexistente o ya liquidada')
    this.reservations.delete(id)
    this.reservedUsd -= reservation.maximumCostUsd
    return reservation
  }

  private chargeUnknown(reservation: Reservation): void {
    this.spentUsd += reservation.maximumCostUsd
    this.responses++
  }
}

export function estimateOpenAIInputTokens(input: unknown): number {
  // Un token no puede representar más bytes que el payload UTF-8 completo.
  // Usar bytes + margen de protocolo sobreestima deliberadamente la entrada.
  return new TextEncoder().encode(JSON.stringify(input)).byteLength + 1_024
}

function requiredEnvNumber(value: string | undefined, name: string, fallback?: number): number {
  if ((!value || !value.trim()) && fallback !== undefined) return fallback
  const parsed = Number(value)
  positiveFinite(parsed, name)
  return parsed
}

const VERIFIED_PRICING: Record<string, {input: number; output: number}> = {
  // Snapshot verificado contra la ficha oficial del modelo al 2026-08-19.
  'gpt-5.6-luna': {input: 0.20, output: 1.20},
}

export function openAICreativeBudgetFromEnv(env: Record<string, string | undefined> = process.env): OpenAICreativeBudget {
  const model = env.OPENAI_CREATIVE_MODEL?.trim() ?? ''
  if (!model) throw new Error('OPENAI_CREATIVE_MODEL no está configurado')
  const verified = VERIFIED_PRICING[model]
  return new OpenAICreativeBudget({
    limitUsd: requiredEnvNumber(env.OPENAI_CREATIVE_BUDGET_USD, 'OPENAI_CREATIVE_BUDGET_USD', 2),
    pricing: {
      model,
      inputUsdPerMillion: requiredEnvNumber(env.OPENAI_CREATIVE_INPUT_USD_PER_1M, 'OPENAI_CREATIVE_INPUT_USD_PER_1M', verified?.input),
      outputUsdPerMillion: requiredEnvNumber(env.OPENAI_CREATIVE_OUTPUT_USD_PER_1M, 'OPENAI_CREATIVE_OUTPUT_USD_PER_1M', verified?.output),
    },
  })
}
