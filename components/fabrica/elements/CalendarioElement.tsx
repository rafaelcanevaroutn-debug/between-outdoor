'use client'

const MES_MAP: Record<string, number> = {
  ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5,
  JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11,
}
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface CalendarioData {
  mes?: string
  dias_activos?: string
}

interface CalendarioElementProps {
  data: CalendarioData | string | null
  tokenValue?: string
  w?: number
}

export default function CalendarioElement({ data, tokenValue, w }: CalendarioElementProps) {
  const resolved: CalendarioData = typeof data === 'string'
    ? { mes: data }
    : (data as CalendarioData) ?? {}

  const mesNombre = (resolved.mes ?? 'JULIO').toUpperCase().trim()
  const mesIdx = MES_MAP[mesNombre] ?? new Date().getMonth()
  const year = new Date().getFullYear()

  const activeDays = new Set(
    (resolved.dias_activos ?? '')
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n))
  )

  // First day of month (0=Sun → convert to Mon-based)
  const firstDay = new Date(year, mesIdx, 1).getDay()
  const startOffset = (firstDay + 6) % 7  // Mon=0
  const daysInMonth = new Date(year, mesIdx + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const accent = tokenValue ?? '#E8A04A'

  return (
    <div style={{ width: w ?? 900, fontFamily: 'system-ui, sans-serif' }}>
      {/* Month name */}
      <div style={{
        color: accent,
        fontSize: 52,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 32,
      }}>
        {mesNombre}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 12 }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{
            textAlign: 'center',
            color: 'rgba(242,232,212,0.45)',
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: '0.1em',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, idx) => {
          const isActive = day !== null && activeDays.has(day)
          return (
            <div
              key={idx}
              style={{
                textAlign: 'center',
                padding: '10px 0',
                borderRadius: 8,
                fontSize: 30,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#110D06' : day ? 'rgba(242,232,212,0.6)' : 'transparent',
                backgroundColor: isActive ? accent : 'transparent',
              }}
            >
              {day ?? ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
