import { GoogleGenAI } from '@google/genai'

interface PoolEntry {
  client: GoogleGenAI
  keyIndex: number  // 1-based, para display
  exhausted: boolean
}

const pool: PoolEntry[] = []
let currentPos = 0
let initialized = false

function init(): void {
  if (initialized) return
  initialized = true

  // Carga GEMINI_API_KEY_1, _2, _3... hasta que no haya más
  let i = 1
  while (true) {
    const key = process.env[`GEMINI_API_KEY_${i}`]
    if (!key) break
    pool.push({ client: new GoogleGenAI({ apiKey: key }), keyIndex: i, exhausted: false })
    i++
  }

  // Fallback: GEMINI_API_KEY sin número (compatible con billing / key única)
  if (pool.length === 0) {
    const key = process.env.GEMINI_API_KEY
    if (key) pool.push({ client: new GoogleGenAI({ apiKey: key }), keyIndex: 1, exhausted: false })
  }

  if (pool.length === 0) {
    console.error('[KEY POOL] ✗ No se encontraron keys de Gemini en .env.local')
  } else {
    const keyList = pool.map(e => `key_${e.keyIndex}`).join(', ')
    console.log(`[KEY POOL] Pool inicializado — ${pool.length} key(s): ${keyList}`)
  }
}

export interface ActiveClient {
  client: GoogleGenAI
  label: string  // ej: "key 2/3"
}

export function getActiveClient(): ActiveClient | null {
  init()

  // Busca la primera key no agotada a partir de currentPos
  for (let i = 0; i < pool.length; i++) {
    const pos = (currentPos + i) % pool.length
    if (!pool[pos].exhausted) {
      currentPos = pos
      return {
        client: pool[pos].client,
        label: `key ${pool[pos].keyIndex}/${pool.length}`,
      }
    }
  }

  return null  // todas agotadas
}

// Marca la key actual como agotada y avanza al siguiente disponible.
// Devuelve true si hay una key disponible después de rotar.
export function markCurrentExhausted(): boolean {
  init()
  const current = pool[currentPos]
  if (!current) return false

  current.exhausted = true
  console.warn(`[KEY POOL] ⚠ Key ${current.keyIndex}/${pool.length} agotada (429) — rotando...`)

  // Avanza al siguiente disponible
  for (let i = 1; i <= pool.length; i++) {
    const next = (currentPos + i) % pool.length
    if (!pool[next].exhausted) {
      currentPos = next
      console.log(`[KEY POOL] → Usando ahora key ${pool[next].keyIndex}/${pool.length}`)
      return true
    }
  }

  console.error('[KEY POOL] ✗ Todas las keys están agotadas. Esperá el reset diario (medianoche PT) o reiniciá el servidor para resetear el pool.')
  return false
}

export function getPoolStatus(): string {
  init()
  const available = pool.filter(e => !e.exhausted).length
  return `${available}/${pool.length} keys disponibles`
}
