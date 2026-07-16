import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface NagerHoliday {
  date: string
  name: string
  countryCode: string
  nationalHoliday?: boolean
  holidayTypes?: string[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

  const body = await request.json()
  const country = String(body.country ?? 'AR').trim().toUpperCase()
  const year = Number(body.year ?? new Date().getFullYear())

  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: 'country debe ser un código ISO de 2 letras' }, { status: 400 })
  }
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  const apiUrl = `https://date.nager.at/api/v4/Holidays/${country}/${year}`
  const response = await fetch(apiUrl, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) {
    return NextResponse.json({ error: `No se pudieron obtener feriados: HTTP ${response.status}` }, { status: 502 })
  }

  const holidays = await response.json() as NagerHoliday[]
  if (!Array.isArray(holidays)) {
    return NextResponse.json({ error: 'Respuesta inválida del proveedor de feriados' }, { status: 502 })
  }

  const officialReference = country === 'AR' ? 'https://www.argentina.gob.ar/feriados' : null
  const rows = holidays
    .filter(item => item.date && item.name)
    .map(item => ({
      pais: country,
      fecha: item.date,
      nombre: item.name,
      tipo: item.holidayTypes?.join(', ') || (item.nationalHoliday ? 'Public' : null),
      fuente: officialReference ? `${apiUrl} | ${officialReference}` : apiUrl,
      updated_at: new Date().toISOString(),
    }))

  const admin = createAdminClient()
  const { error } = await admin.from('feriados').upsert(rows, { onConflict: 'pais,fecha,nombre' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, country, year, imported: rows.length })
}
