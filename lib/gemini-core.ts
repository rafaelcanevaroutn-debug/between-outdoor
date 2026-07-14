/**
 * Shared Gemini retry logic — usado por gemini.ts y los generators individuales.
 */
import { getActiveClient, getPoolStatus } from '@/lib/gemini-key-pool'

const BACKOFF_DELAYS_MS = [2000, 4000, 8000]

function is503(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes('"code":503') || msg.includes('UNAVAILABLE')
}

function is429(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes('"code":429') || msg.includes('RESOURCE_EXHAUSTED')
}

export interface TrackedResult {
  text:         string
  inputTokens:  number
  outputTokens: number
}

export async function generateWithRetryTracked(prompt: string, label: string): Promise<TrackedResult> {
  const { client } = getActiveClient()
  console.log(`[GEMINI] ${getPoolStatus()} — label: ${label}`)

  for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt++) {
    try {
      const result = await client.models.generateContent({
        model:    'gemini-2.5-flash',
        contents: prompt,
      })
      return {
        text:         result.text ?? '',
        inputTokens:  result.usageMetadata?.promptTokenCount     ?? 0,
        outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
      }
    } catch (error) {
      const isLast = attempt === BACKOFF_DELAYS_MS.length

      if (is429(error)) {
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error(`[GEMINI] 429 en ${label} (intento ${attempt + 1}): ${errMsg.slice(0, 200)}`)
        if (isLast) throw new Error(`[GEMINI] 429 persistente tras ${attempt + 1} intentos en "${label}" — revisá cuotas o límites de la key paga.`)
        const delay = BACKOFF_DELAYS_MS[attempt]
        console.warn(`[GEMINI] Reintentando en ${delay / 1000}s...`)
        await new Promise(res => setTimeout(res, delay))
        continue
      }

      if (is503(error)) {
        if (isLast) throw error
        const delay = BACKOFF_DELAYS_MS[attempt]
        console.warn(`[GEMINI] ⚠ 503 en ${label} — reintento ${attempt + 1}/3 en ${delay / 1000}s...`)
        await new Promise(res => setTimeout(res, delay))
        continue
      }

      throw error
    }
  }

  // Inalcanzable, pero satisface el type checker
  throw new Error(`[GEMINI] generateWithRetryTracked salió del loop inesperadamente — label: ${label}`)
}

export async function generateWithRetry(prompt: string, label: string): Promise<string> {
  return (await generateWithRetryTracked(prompt, label)).text
}
