export interface CalendarOpportunitySalida {
  id: string
  nombre: string
  destino: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

export interface CalendarOpportunityHoliday {
  fecha: string
  nombre: string
  tipo?: string | null
}

export interface CalendarOpportunity {
  id: string
  type: 'fecha_especial' | 'mes' | 'proximas'
  title: string
  description: string
  actionLabel: string
  salidaIds: string[]
  holidayDates: string[]
}

interface BuildCalendarOpportunitiesInput {
  salidas: CalendarOpportunitySalida[]
  holidays: CalendarOpportunityHoliday[]
  today?: string
  windowDays?: number
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`)
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addDays(value: string, days: number): string {
  const date = utcDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return isoDate(date)
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && endA >= startB
}

function humanDate(value: string): string {
  const date = utcDate(value)
  return `${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]}`
}

function monthKey(value: string): string {
  return value.slice(0, 7)
}

function monthLabel(value: string): string {
  const date = utcDate(`${value}-01`)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function clusterHolidays(holidays: CalendarOpportunityHoliday[]): CalendarOpportunityHoliday[][] {
  const clusters: CalendarOpportunityHoliday[][] = []
  for (const holiday of holidays) {
    const current = clusters.at(-1)
    if (!current || holiday.fecha > addDays(current.at(-1)!.fecha, 1)) clusters.push([holiday])
    else current.push(holiday)
  }
  return clusters
}

export function buildCalendarOpportunities({
  salidas,
  holidays,
  today = new Date().toISOString().slice(0, 10),
  windowDays = 60,
}: BuildCalendarOpportunitiesInput): CalendarOpportunity[] {
  const windowEnd = addDays(today, windowDays)
  const future = [...new Map(salidas
    .filter(salida => salida.estado !== 'completada' && salida.fecha_fin >= today && salida.fecha_inicio <= windowEnd)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
    .map(salida => [salida.id, salida])).values()]
  if (future.length === 0) return []

  const relevantHolidays = holidays
    .filter(holiday => holiday.fecha >= today && holiday.fecha <= windowEnd)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const opportunities: CalendarOpportunity[] = []

  for (const cluster of clusterHolidays(relevantHolidays)) {
    const clusterStart = cluster[0].fecha
    const clusterEnd = cluster.at(-1)!.fecha
    const related = future.filter(salida => overlaps(salida.fecha_inicio, salida.fecha_fin, addDays(clusterStart, -2), addDays(clusterEnd, 2))).slice(0, 3)
    if (related.length === 0) continue
    const range = clusterStart === clusterEnd ? humanDate(clusterStart) : `${humanDate(clusterStart)} al ${humanDate(clusterEnd)}`
    const names = cluster.map(item => item.nombre).join(' + ')
    opportunities.push({
      id: `fecha:${clusterStart}:${related.map(item => item.id).join(',')}`,
      type: 'fecha_especial',
      title: `Se viene ${names}`,
      description: `${range}. ${related.length === 1 ? `Tenés ${related[0].nombre} cerca de esta fecha.` : `Tenés ${related.length} salidas relacionadas con esta fecha.`}`,
      actionLabel: 'Crear calendario para esta fecha',
      salidaIds: related.map(item => item.id),
      holidayDates: cluster.map(item => item.fecha),
    })
  }

  const byMonth = new Map<string, CalendarOpportunitySalida[]>()
  for (const salida of future) {
    const key = monthKey(salida.fecha_inicio)
    const items = byMonth.get(key) ?? []
    items.push(salida)
    byMonth.set(key, items)
  }
  for (const [key, items] of byMonth) {
    if (items.length < 2) continue
    const selected = items.slice(0, 3)
    opportunities.push({
      id: `mes:${key}`,
      type: 'mes',
      title: `Tenés ${items.length} salidas en ${monthLabel(key)}`,
      description: items.length > 3 ? 'Seleccionamos las 3 fechas más cercanas; podés cambiarlas antes de generar.' : 'Podés mostrarlas juntas en un calendario mensual.',
      actionLabel: `Crear calendario de ${MONTHS[utcDate(`${key}-01`).getUTCMonth()]}`,
      salidaIds: selected.map(item => item.id),
      holidayDates: [],
    })
  }

  const closest = future.slice(0, 3)
  opportunities.push({
    id: 'proximas',
    type: 'proximas',
    title: 'Calendario de próximas salidas',
    description: `Mostrá ${closest.length === 1 ? 'tu próxima fecha disponible' : `tus ${closest.length} salidas más cercanas`} aunque no coincidan con un feriado.`,
    actionLabel: 'Crear calendario de próximas salidas',
    salidaIds: closest.map(item => item.id),
    holidayDates: [],
  })

  const priority = { fecha_especial: 0, mes: 1, proximas: 2 }
  return opportunities
    .sort((a, b) => priority[a.type] - priority[b.type])
    .slice(0, 3)
}
