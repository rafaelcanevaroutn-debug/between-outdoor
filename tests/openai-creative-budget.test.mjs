import test from 'node:test'
import assert from 'node:assert/strict'
import {OpenAICreativeBudget, OpenAICreativeBudgetExceededError, estimateOpenAIInputTokens, openAICreativeBudgetFromEnv} from '../lib/creative-lab/openai-budget.ts'

const pricing = {model: 'creative-model', inputUsdPerMillion: 2, outputUsdPerMillion: 8}

test('reserva antes de la llamada y liquida el costo exacto reportado', () => {
  const budget = new OpenAICreativeBudget({limitUsd: 2, pricing})
  const reservation = budget.reserve({model: 'creative-model', estimatedInputTokens: 10_000, maxOutputTokens: 20_000})
  assert.equal(budget.snapshot().reservedUsd, 0.18)
  const usage = budget.settle(reservation, {inputTokens: 4_000, outputTokens: 1_000})
  assert.equal(usage.costUsd, 0.016)
  assert.deepEqual(budget.snapshot(), {limitUsd: 2, spentUsd: 0.016, reservedUsd: 0, remainingUsd: 1.984, responses: 1, inputTokens: 4000, outputTokens: 1000})
})

test('rechaza modelo distinto para no aplicar tarifas incorrectas', () => {
  const budget = new OpenAICreativeBudget({limitUsd: 2, pricing})
  assert.throws(() => budget.reserve({model: 'otro-modelo', estimatedInputTokens: 1, maxOutputTokens: 1}), /No hay pricing verificado/u)
})

test('no permite reservar por encima del tope acumulado', () => {
  const budget = new OpenAICreativeBudget({limitUsd: 0.10, pricing})
  budget.reserve({model: 'creative-model', estimatedInputTokens: 1_000, maxOutputTokens: 10_000})
  assert.throws(
    () => budget.reserve({model: 'creative-model', estimatedInputTokens: 1_000, maxOutputTokens: 10_000}),
    OpenAICreativeBudgetExceededError,
  )
})

test('la estimación de entrada incluye bytes completos y margen conservador', () => {
  const value = {texto: 'Montaña 🏔️'}
  assert.equal(estimateOpenAIInputTokens(value) >= new TextEncoder().encode(JSON.stringify(value)).byteLength + 1024, true)
})

test('configura tope de USD 2 por defecto pero exige tarifas explícitas', () => {
  const budget = openAICreativeBudgetFromEnv({
    OPENAI_CREATIVE_MODEL: 'creative-model',
    OPENAI_CREATIVE_INPUT_USD_PER_1M: '2',
    OPENAI_CREATIVE_OUTPUT_USD_PER_1M: '8',
  })
  assert.equal(budget.snapshot().limitUsd, 2)
  assert.throws(() => openAICreativeBudgetFromEnv({OPENAI_CREATIVE_MODEL: 'creative-model'}), /OPENAI_CREATIVE_INPUT_USD_PER_1M/u)
  const verified = openAICreativeBudgetFromEnv({OPENAI_CREATIVE_MODEL: 'gpt-5.6-luna'})
  assert.deepEqual(verified.pricing, {model: 'gpt-5.6-luna', inputUsdPerMillion: 0.2, outputUsdPerMillion: 1.2})
})

test('permite configurar un tope menor o mayor desde entorno', () => {
  const budget = openAICreativeBudgetFromEnv({
    OPENAI_CREATIVE_MODEL: 'creative-model',
    OPENAI_CREATIVE_BUDGET_USD: '1.25',
    OPENAI_CREATIVE_INPUT_USD_PER_1M: '2',
    OPENAI_CREATIVE_OUTPUT_USD_PER_1M: '8',
  })
  assert.equal(budget.snapshot().limitUsd, 1.25)
})

test('reanuda un checkpoint conservando gasto y tokens acumulados', () => {
  const budget = openAICreativeBudgetFromEnv({
    OPENAI_CREATIVE_MODEL: 'creative-model',
    OPENAI_CREATIVE_BUDGET_USD: '2',
    OPENAI_CREATIVE_INPUT_USD_PER_1M: '2',
    OPENAI_CREATIVE_OUTPUT_USD_PER_1M: '8',
  }, {spentUsd: 0.25, responses: 2, inputTokens: 1000, outputTokens: 500})
  assert.deepEqual(budget.snapshot(), {
    limitUsd: 2,
    spentUsd: 0.25,
    reservedUsd: 0,
    remainingUsd: 1.75,
    responses: 2,
    inputTokens: 1000,
    outputTokens: 500,
  })
  assert.throws(() => new OpenAICreativeBudget({
    limitUsd: 2,
    pricing,
    initialUsage: {spentUsd: 2.01, responses: 1, inputTokens: 1, outputTokens: 1},
  }), /gasto inicial/u)
})
