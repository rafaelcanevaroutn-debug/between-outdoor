/**
 * Test de acceso a Google Drive con Service Account
 * Corre con: node scripts/test-drive.mjs
 */

import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const credentials = JSON.parse(readFileSync(join(ROOT, 'drive-credentials.json'), 'utf-8'))

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
})

const drive  = google.drive({ version: 'v3', auth })
const sheets = google.sheets({ version: 'v4', auth })

const SEP = '═'.repeat(60)
console.log(SEP)
console.log('TEST GOOGLE DRIVE — Service Account')
console.log(`Service Account: ${credentials.client_email}`)
console.log(SEP)

// ── 1. LEER: listar archivos/carpetas ─────────────────────────────
console.log('\n[1] Archivos compartidos con la service account:\n')

const listRes = await drive.files.list({
  pageSize: 20,
  fields: 'files(id, name, mimeType, modifiedTime)',
  orderBy: 'modifiedTime desc',
})

const files = listRes.data.files ?? []
const folders  = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder')
const spreads  = files.filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet')

console.log(`  Total archivos visibles: ${files.length}`)
console.log(`  Carpetas: ${folders.length}`)
console.log(`  Hojas de cálculo: ${spreads.length}`)

folders.forEach(f => console.log(`    📁 ${f.name}  (${f.id})`))
spreads.forEach(f => console.log(`    📊 ${f.name}  (${f.id})`))

// ── 2. ESCRIBIR EN CARPETA COMPARTIDA ────────────────────────────
if (folders.length > 0) {
  const testFolder = folders[0]
  console.log(`\n[2] Test escritura en carpeta compartida: "${testFolder.name}"\n`)

  try {
    const createRes = await drive.files.create({
      requestBody: {
        name: `between-test-${Date.now()}.txt`,
        mimeType: 'text/plain',
        parents: [testFolder.id],
      },
      media: {
        mimeType: 'text/plain',
        body: `Test escritura Between Outdoor — ${new Date().toISOString()}`,
      },
      fields: 'id, name, webViewLink',
    })

    console.log(`  ✓ Archivo creado en carpeta compartida`)
    console.log(`  Nombre: ${createRes.data.name}`)
    console.log(`  ID: ${createRes.data.id}`)
    console.log(`  Link: ${createRes.data.webViewLink}`)

    // Limpieza
    await drive.files.delete({ fileId: createRes.data.id })
    console.log(`  ✓ Limpieza: archivo de prueba eliminado`)
  } catch (err) {
    console.error(`  ✗ Error escritura en carpeta: ${err.message}`)
  }
} else {
  console.log('\n[2] Sin carpetas compartidas para testear escritura')
}

// ── 3. LEER PLANILLA SHEETS ───────────────────────────────────────
if (spreads.length > 0) {
  const sheet = spreads[0]
  console.log(`\n[3] Leyendo planilla: "${sheet.name}" (${sheet.id})\n`)

  try {
    // Obtener metadata (nombres de hojas)
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheet.id })
    const sheetNames = meta.data.sheets?.map(s => s.properties?.title) ?? []
    console.log(`  Hojas encontradas: ${sheetNames.join(', ')}`)

    // Leer primeras 3 filas de la primera hoja
    const firstSheet = sheetNames[0]
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet.id,
      range: `${firstSheet}!A1:Z3`,
    })

    const rows = readRes.data.values ?? []
    if (rows.length === 0) {
      console.log('  (planilla vacía)')
    } else {
      console.log(`  Primeras ${rows.length} filas:`)
      rows.forEach((row, i) => {
        console.log(`    Fila ${i + 1}: ${row.slice(0, 5).join(' | ')}${row.length > 5 ? ` ... (+${row.length - 5} cols)` : ''}`)
      })
    }

    // ── 4. ESCRIBIR EN SHEETS ────────────────────────────────────
    console.log(`\n[4] Test escritura en planilla:\n`)

    // Buscar primera fila libre
    const allRows = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet.id,
      range: `${firstSheet}!A:A`,
    })
    const nextRow = (allRows.data.values?.length ?? 0) + 1

    const testValue = `Between-test ${new Date().toLocaleTimeString('es-AR')}`
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheet.id,
      range: `${firstSheet}!A${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[testValue, '(escritura de prueba — eliminar)']] },
    })

    console.log(`  ✓ Escritura en fila ${nextRow}: "${testValue}"`)

    // Borrar la fila de prueba
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheet.id,
      range: `${firstSheet}!A${nextRow}:Z${nextRow}`,
    })
    console.log(`  ✓ Limpieza: fila de prueba eliminada`)

  } catch (err) {
    console.error(`  ✗ Error con Sheets: ${err.message}`)
  }
} else {
  console.log('\n[3] Sin planillas compartidas')
}

// ── RESUMEN ────────────────────────────────────────────────────────
console.log(`\n${SEP}`)
console.log('RESUMEN FINAL:')
console.log(`  Drive - Lectura:  ${files.length > 0 ? '✓ OK' : '✗ Sin acceso'}`)
console.log(`  Drive - Escritura en carpeta: ver [2] arriba`)
console.log(`  Sheets - Lectura: ${spreads.length > 0 ? '✓ OK' : '✗ Sin planillas'}`)
console.log(`  Sheets - Escritura: ver [4] arriba`)
console.log(SEP)
