import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Parsea una fecha ISO "YYYY-MM-DD" como fecha local (evita el corrimiento UTC).
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Formatea el rango de fechas de una salida de forma legible.
 * - Salida de un día (inicio === fin): "domingo 29 de junio de 2026"
 * - Mismo mes:  "viernes 3 al domingo 5 de julio de 2026"
 * - Meses distintos: "viernes 27 de junio al domingo 6 de julio de 2026"
 */
export function formatFechaSalida(fecha_inicio: string, fecha_fin: string): string {
  const inicio = parseLocalDate(fecha_inicio)
  const fin    = parseLocalDate(fecha_fin)

  if (fecha_inicio === fecha_fin) {
    return format(inicio, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  }

  const mismoMes = inicio.getMonth() === fin.getMonth() && inicio.getFullYear() === fin.getFullYear()

  if (mismoMes) {
    return `${format(inicio, "EEEE d", { locale: es })} al ${format(fin, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}`
  }

  return `${format(inicio, "EEEE d 'de' MMMM", { locale: es })} al ${format(fin, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}`
}
