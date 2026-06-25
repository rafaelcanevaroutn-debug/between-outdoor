import { google } from 'googleapis'
import path from 'node:path'
import fs from 'node:fs'

const SHEET_ID = '11LCMiDz2_e__A4PorZimbZiZdB76c0uHpOd_y--sTEk'
const SHEET_NAME = 'Hoja 1'

function getAuth() {
  const credPath = path.join(process.cwd(), 'drive-credentials.json')
  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'))
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export interface SheetRowData {
  cliente:   string
  brand:     string
  mes:       string
  estado:    string
  carpeta:   string
  titulo:    string
  subtitulo: string
  bullets:   string
  cta:       string
  formato:   string
  slide1:    string
  slide2:    string
  slide3:    string
  slide4:    string
  slide5:    string
}

// Maps our internal field names to the exact header names Mati uses in the Sheet
const FIELD_TO_HEADER: Record<keyof SheetRowData, string> = {
  cliente:   'Cliente',
  brand:     'Brand',
  mes:       'Mes',
  estado:    'Estado',
  carpeta:   'Carpeta',
  titulo:    'Título',
  subtitulo: 'Subtítulo',
  bullets:   'Bullets',
  cta:       'CTA',
  formato:   'Formato',
  slide1:    'Slide 1',
  slide2:    'Slide 2',
  slide3:    'Slide 3',
  slide4:    'Slide 4',
  slide5:    'Slide 5',
}

export interface HeaderMapping {
  headers: string[]
  colIndex: Record<string, number>   // header name → 0-based column index
  fieldMapping: Record<string, { header: string; col: number } | null>  // our field → sheet col
}

/** Reads row 1 of the sheet and builds the column mapping by header name. */
export async function readSheetHeaders(): Promise<HeaderMapping> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  })

  const headers: string[] = (res.data.values?.[0] ?? []).map(String)

  const colIndex: Record<string, number> = {}
  headers.forEach((h, i) => { colIndex[h] = i })

  const fieldMapping: HeaderMapping['fieldMapping'] = {}
  for (const [field, header] of Object.entries(FIELD_TO_HEADER)) {
    const col = colIndex[header]
    fieldMapping[field] = col !== undefined ? { header, col } : null
  }

  return { headers, colIndex, fieldMapping }
}

/** Appends rows to the sheet using header-based column mapping. Never touches existing headers. */
export async function appendRowsToSheet(
  rows: SheetRowData[],
): Promise<{ written: number; firstRow: number; mapping: HeaderMapping }> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const mapping = await readSheetHeaders()
  const { headers, fieldMapping } = mapping

  if (headers.length === 0) {
    throw new Error('El Sheet no tiene encabezados en la fila 1. Pedile a Mati que agregue los headers primero.')
  }

  // Find the next empty row by checking column A
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  })
  const nextRow = (existing.data.values?.length ?? 0) + 1

  const values = rows.map(row => {
    const arr: string[] = new Array(headers.length).fill('')
    for (const [field, info] of Object.entries(fieldMapping)) {
      if (info !== null) {
        arr[info.col] = (row as unknown as Record<string, string>)[field] ?? ''
      }
    }
    return arr
  })

  const lastCol = String.fromCharCode(65 + headers.length - 1)  // e.g. 9 cols → 'I'
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A${nextRow}:${lastCol}${nextRow + rows.length - 1}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  })

  return { written: rows.length, firstRow: nextRow, mapping }
}
