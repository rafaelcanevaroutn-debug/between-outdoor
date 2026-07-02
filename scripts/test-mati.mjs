/**
 * Script de diagnóstico para la integración con Mati.
 * Testea cada paso del flujo de templates y generación de carruseles.
 *
 * Uso:
 *   node scripts/test-mati.mjs                          → diagnóstico completo
 *   node scripts/test-mati.mjs --onboarding             → llama al endpoint de onboarding real
 *   node scripts/test-mati.mjs --carrusel               → llama al endpoint de carrusel real
 *   node scripts/test-mati.mjs --cliente "Nombre"       → usa cliente específico
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

// ─── Colores ──────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
}
const ok   = (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`)
const fail = (msg) => console.log(`  ${C.red}✗${C.reset} ${msg}`)
const warn = (msg) => console.log(`  ${C.yellow}⚠${C.reset} ${msg}`)
const info = (msg) => console.log(`  ${C.cyan}→${C.reset} ${msg}`)
const sep  = (title) => console.log(`\n${C.bold}${C.cyan}── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}${C.reset}`)

// ─── Leer .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) { fail('.env.local no encontrado'); process.exit(1) }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && !process.env[key]) process.env[key] = val
  }
}

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const runOnboarding = args.includes('--onboarding')
const runCarrusel   = args.includes('--carrusel')
const clienteIdx    = args.indexOf('--cliente')
const clienteArg    = clienteIdx !== -1 ? args[clienteIdx + 1] : null

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stripExtension(name) {
  return name.replace(/\.hbs$/i, '')
}

function stripCacheBust(url) {
  return url ? url.split('?')[0] : url
}

function buildSkillPayload(branding, profile) {
  const cliente = branding?.mati_cliente_id || profile?.company_name || profile?.full_name || 'cliente'
  const payload = {
    cliente,
    templates_elegidos: (branding?.templates_elegidos ?? []).map(stripExtension),
  }
  if (branding?.logo_url) payload.logo_url = stripCacheBust(branding.logo_url)
  return payload
}

function buildCarruselPayload(cliente, overrides = {}) {
  const payload = {
    cliente,
    tema:   overrides.tema   ?? 'destinos',
    angulo: overrides.angulo ?? 'Test de integración',
    slides: [
      { n_slide: 1, rol: 'portada',    texto_principal: 'TEST PLATAFORMA',    indicacion_imagen: 'Foto de montaña con luz dorada' },
      { n_slide: 2, rol: 'desarrollo', texto_principal: 'Segundo slide test',  texto_apoyo: 'Apoyo opcional', indicacion_imagen: 'Grupo en ruta' },
      { n_slide: 3, rol: 'desarrollo', texto_principal: 'Tercer slide test',   indicacion_imagen: 'Equipo en cumbre' },
      { n_slide: 4, rol: 'cierre',     texto_principal: 'Escribinos hoy',      indicacion_imagen: 'Paisaje panorámico' },
    ],
  }
  if (overrides.carpeta) payload.carpeta = overrides.carpeta
  return payload
}

async function callMati(url, payload, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)

  try {
    const res  = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal })
    const body = await res.text()
    let parsed = null
    try { parsed = JSON.parse(body) } catch {}
    return { status: res.status, ok: res.ok, body, parsed }
  } catch (err) {
    if (err.name === 'AbortError') return { status: null, ok: false, body: null, error: 'TIMEOUT (30s)' }
    return { status: null, ok: false, body: null, error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv()

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════╗`)
  console.log(`║     DIAGNÓSTICO INTEGRACIÓN MATI — Between Outdoor    ║`)
  console.log(`╚══════════════════════════════════════════════════════╝${C.reset}\n`)

  // ── 1. Variables de entorno ─────────────────────────────────────────────────
  sep('1. Variables de entorno')

  const matiUrl   = process.env.MATI_SKILL_URL?.trim()
  const matiToken = process.env.MATI_SKILL_TOKEN?.trim()
  const recursosFolderId = process.env.DRIVE_RECURSOS_FOLDER_ID?.trim()

  if (matiUrl)   ok(`MATI_SKILL_URL = ${matiUrl}`)
  else           fail('MATI_SKILL_URL no configurada — las llamadas a Mati van a fallar')

  if (matiToken) ok(`MATI_SKILL_TOKEN = ***${matiToken.slice(-4)}`)
  else           warn('MATI_SKILL_TOKEN vacío — sin autenticación (OK si Mati no requiere auth)')

  if (recursosFolderId) ok(`DRIVE_RECURSOS_FOLDER_ID = ${recursosFolderId}`)
  else                  warn('DRIVE_RECURSOS_FOLDER_ID no configurado — el selector de templates no va a funcionar')

  // ── 2. Derivar URLs de Mati ─────────────────────────────────────────────────
  sep('2. URLs derivadas de MATI_SKILL_URL')

  if (matiUrl) {
    const matiBase         = matiUrl.replace(/\/api\/[^/]+$/, '')
    const onboardingUrl    = matiUrl
    const carruselUrl      = `${matiBase}/api/generar-carrusel`

    info(`Base URL:           ${matiBase}`)
    info(`Onboarding:         ${onboardingUrl}`)
    info(`Generar carrusel:   ${carruselUrl}`)

    const derivedOk = matiUrl.includes('/api/')
    if (derivedOk) ok('La URL tiene formato /api/<endpoint> — derivación correcta')
    else           warn('La URL no tiene /api/<endpoint> — la derivación de /api/generar-carrusel puede ser incorrecta')
  } else {
    fail('Sin URL — saltando')
  }

  // ── 3. Archivos de OAuth Drive ──────────────────────────────────────────────
  sep('3. Credenciales Drive (OAuth)')

  const oauthPath = path.join(ROOT, 'oauth-credentials.json')
  const tokenPath = path.join(ROOT, 'token.json')

  if (fs.existsSync(oauthPath)) ok('oauth-credentials.json presente')
  else                           fail('oauth-credentials.json no encontrado — Drive no va a funcionar')

  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
    const expiry = token.expiry_date ? new Date(token.expiry_date) : null
    if (expiry && expiry < new Date()) warn(`token.json expirado el ${expiry.toISOString()} — puede necesitar refresh`)
    else ok(`token.json presente${expiry ? ` (expira ${expiry.toLocaleDateString('es-AR')})` : ''}`)
  } else {
    fail('token.json no encontrado — Drive no va a funcionar')
  }

  // ── 4. Simulación de payload de onboarding ──────────────────────────────────
  sep('4. Payload de onboarding (/api/onboarding-cliente)')

  const mockBranding = {
    mati_cliente_id:   clienteArg ?? 'Caminantes de montaña',
    company_name:      null,
    full_name:         null,
    color_primario:    '#34D17E',
    color_secundario:  '#0A0F0A',
    color_fondo:       '#111A11',
    color_texto:       '#F0FFF4',
    font_title:        'Montserrat',
    font_body:         'Inter',
    logo_url:          'https://khmdhgivxnzvnftsdvsb.supabase.co/storage/v1/object/public/logos/test/logo.png?t=1234567890',
    templates_elegidos: ['main.hbs', 'brand_guidelines_2.hbs'],
  }

  const mockProfile = { company_name: 'Caminantes de montaña', full_name: 'Juan Pérez' }
  const onboardingPayload = buildSkillPayload(mockBranding, mockProfile)

  console.log('\n  Payload que se mandaría:')
  console.log(JSON.stringify(onboardingPayload, null, 4).split('\n').map(l => '  ' + l).join('\n'))

  // Validaciones del payload
  if (!onboardingPayload.cliente || onboardingPayload.cliente === 'cliente')
    warn('cliente está vacío o es genérico — Mati no va a poder identificar la carpeta')
  else
    ok(`cliente = "${onboardingPayload.cliente}"`)

  if (onboardingPayload.templates_elegidos.length === 0)
    warn('templates_elegidos vacío — Mati no va a copiar ningún template a la carpeta del cliente')
  else {
    const hasExtension = onboardingPayload.templates_elegidos.some(t => t.endsWith('.hbs'))
    if (hasExtension) fail('templates_elegidos tiene extensiones .hbs — Mati espera sin extensión')
    else ok(`templates_elegidos = [${onboardingPayload.templates_elegidos.join(', ')}] — sin extensión ✓`)
  }

  if (onboardingPayload.logo_url) {
    const hasCacheBust = onboardingPayload.logo_url.includes('?')
    if (hasCacheBust) warn(`logo_url tiene query string — puede romper la descarga: ${onboardingPayload.logo_url}`)
    else ok(`logo_url limpia: ${onboardingPayload.logo_url}`)
  }

  // ── 5. Simulación de payload de carrusel ────────────────────────────────────
  sep('5. Payload de generación (/api/generar-carrusel)')

  const cliente = clienteArg ?? onboardingPayload.cliente
  const carruselPayload = buildCarruselPayload(cliente)

  console.log('\n  Payload que se mandaría:')
  console.log(JSON.stringify(carruselPayload, null, 4).split('\n').map(l => '  ' + l).join('\n'))

  ok(`cliente = "${carruselPayload.cliente}" — debe coincidir con el del onboarding`)
  ok(`slides = ${carruselPayload.slides.length} slides`)

  // ── 6. Llamada real al onboarding ───────────────────────────────────────────
  if (runOnboarding && matiUrl) {
    sep('6. Llamada REAL a /api/onboarding-cliente')

    warn('Esto va a crear/actualizar la carpeta del cliente en Drive en Mati')
    console.log('\n  Enviando...')

    const realPayload = {
      cliente:            clienteArg ?? 'TEST-Between-Outdoor',
      templates_elegidos: ['main'],
    }
    info(`cliente = "${realPayload.cliente}"`)

    const result = await callMati(matiUrl, realPayload, matiToken)

    if (result.error) {
      fail(`Error: ${result.error}`)
    } else {
      console.log(`\n  HTTP ${result.status}:`)
      if (result.ok) {
        ok('Respuesta OK')
        if (result.parsed?.drive_folder_id) ok(`drive_folder_id = ${result.parsed.drive_folder_id}`)
        else warn('Sin drive_folder_id en la respuesta')
      } else {
        fail(`HTTP ${result.status}`)
        console.log('  Body:', result.body?.slice(0, 500))
        if (result.status === 400) info('400 → revisar campos del payload')
        if (result.status === 404) info('404 → el endpoint /api/onboarding-cliente no existe o la URL está mal')
        if (result.status >= 500) info('5xx → error del servidor de Mati')
      }
    }
  } else if (runOnboarding) {
    fail('No se puede llamar al onboarding: MATI_SKILL_URL no configurada')
  }

  // ── 7. Llamada real al generador de carrusel ────────────────────────────────
  if (runCarrusel && matiUrl) {
    const matiBase    = matiUrl.replace(/\/api\/[^/]+$/, '')
    const carruselUrl = `${matiBase}/api/generar-carrusel`

    sep('7. Llamada REAL a /api/generar-carrusel')
    warn('Esto va a generar un carrusel de prueba en Drive en Mati')
    console.log('\n  Enviando...')

    const realPayload = buildCarruselPayload(clienteArg ?? 'TEST-Between-Outdoor')
    info(`cliente = "${realPayload.cliente}"`)
    info(`slides = ${realPayload.slides.length}`)

    const result = await callMati(carruselUrl, realPayload, matiToken)

    if (result.error) {
      fail(`Error: ${result.error}`)
    } else {
      console.log(`\n  HTTP ${result.status}:`)
      if (result.ok) {
        ok('Respuesta OK')
        if (result.parsed?.drive_folder_id) ok(`drive_folder_id = ${result.parsed.drive_folder_id}`)
        else warn('Sin drive_folder_id en la respuesta')
        if (result.parsed?.details) info(`Detalles: ${JSON.stringify(result.parsed.details)}`)
      } else {
        fail(`HTTP ${result.status}`)
        console.log('  Body:', result.body?.slice(0, 800))
        if (result.status === 404) info('404 → cliente no existe en Drive (hay que correr el onboarding primero)')
        if (result.status === 400) info('400 → revisar estructura de slides o campos requeridos')
        if (result.status >= 500) info('5xx → error del servidor de Mati')
      }
    }
  } else if (runCarrusel) {
    fail('No se puede llamar al carrusel: MATI_SKILL_URL no configurada')
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────
  sep('Resumen de posibles problemas')

  const issues = []

  if (!matiUrl) issues.push('MATI_SKILL_URL no configurada')
  if (!recursosFolderId) issues.push('DRIVE_RECURSOS_FOLDER_ID no configurado — selector de templates no funciona')
  if (!fs.existsSync(oauthPath)) issues.push('oauth-credentials.json faltante')
  if (!fs.existsSync(tokenPath)) issues.push('token.json faltante')

  if (issues.length === 0) {
    ok('Sin problemas de configuración detectados')
  } else {
    issues.forEach(i => fail(i))
  }

  console.log(`\n  ${C.gray}Para llamadas reales:`)
  console.log(`  node scripts/test-mati.mjs --onboarding --cliente "Nombre del cliente"`)
  console.log(`  node scripts/test-mati.mjs --carrusel   --cliente "Nombre del cliente"${C.reset}\n`)
}

main().catch(err => { console.error('Error fatal:', err); process.exit(1) })
