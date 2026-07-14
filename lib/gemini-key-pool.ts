/**
 * Shim de key única — reemplaza el pool de rotación (free tier).
 * Billing activo desde 2026-07-10: una sola GEMINI_API_KEY paga.
 */
import { GoogleGenAI } from '@google/genai'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (client) return client
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('[GEMINI] Falta GEMINI_API_KEY en .env.local — la app no puede arrancar sin ella.')
  client = new GoogleGenAI({ apiKey: key })
  console.log('[KEY POOL] Key única paga inicializada.')
  return client
}

export interface ActiveClient {
  client: GoogleGenAI
  label:  string
}

/** Devuelve la key única paga. Lanza si GEMINI_API_KEY no está configurada. */
export function getActiveClient(): ActiveClient {
  return { client: getClient(), label: 'key única' }
}

/** No-op: con key paga no hay rotación. Interfaz mantenida para compatibilidad. */
export function markCurrentExhausted(): boolean {
  console.warn('[KEY POOL] 429 recibido — key paga, sin rotación. El caller reintentará con backoff.')
  return true
}

/** Siempre disponible con key paga. */
export function getPoolStatus(): string {
  return '1/1 key paga'
}
