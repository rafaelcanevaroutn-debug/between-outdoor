import type { ClientOnboarding, DiaSemana, Salida } from '@/types'

function campaignContext(value: ClientOnboarding['campaign_context'] | null | undefined) {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const text = (key: string): string | null => typeof raw[key] === 'string' && raw[key].trim()
    ? raw[key].trim()
    : null
  const days = Array.isArray(raw.dias_confirmados)
    ? raw.dias_confirmados.filter((day): day is DiaSemana => typeof day === 'string')
    : []
  const horarios_confirmados = Array.isArray(raw.horarios_confirmados)
    ? raw.horarios_confirmados.filter((time): time is string => typeof time === 'string')
    : []
  return {
    point: text('punto_encuentro'),
    frequencyConfirmed: raw.frecuencia_confirmada === true,
    days,
    horarios_confirmados,
  }
}

/**
 * The meeting point is logistics, not a destination. Every generator uses this
 * one source of truth so it never prints a bare point without day and hour.
 */
export interface RecurringMeetingDetails {
  point: string | null
  days: DiaSemana[]
  time: string | null
  complete: boolean
  daysLabel: string | null
  compactDaysLabel: string | null
  label: string | null
  visualItems: string[]
}

const DAY_LABELS: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miércoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sábado: 'Sábado', domingo: 'Domingo',
}

const SHORT_DAY_LABELS: Record<DiaSemana, string> = {
  lunes: 'LUN', martes: 'MAR', miércoles: 'MIÉ', jueves: 'JUE',
  viernes: 'VIE', sábado: 'SÁB', domingo: 'DOM',
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/gu, ' ').trim()
  return normalized || null
}

function uniqueDays(value: readonly DiaSemana[] | null | undefined): DiaSemana[] {
  return [...new Set((value ?? []).filter((day): day is DiaSemana => day in DAY_LABELS))]
}

function normalizeTime(value: string | null | undefined): string | null {
  const time = clean(value)
  return time ? time.slice(0, 5) : null
}

export function resolveRecurringMeetingDetails(
  onboarding: ClientOnboarding | null,
  salida: Pick<Salida, 'tipo_viaje' | 'punto_encuentro' | 'dias_semana' | 'hora_encuentro'>,
): RecurringMeetingDetails {
  if (salida.tipo_viaje !== 'salida_recurrente') {
    return { point: null, days: [], time: null, complete: false, daysLabel: null, compactDaysLabel: null, label: null, visualItems: [] }
  }

  const campaign = campaignContext(onboarding?.campaign_context)
  const point = clean(campaign.point) ?? clean(salida.punto_encuentro)
  const campaignDays = campaign.frequencyConfirmed ? uniqueDays(campaign.days) : []
  const days = campaignDays.length > 0 ? campaignDays : uniqueDays(salida.dias_semana)
  const time = normalizeTime(campaign.horarios_confirmados?.[0]) ?? normalizeTime(salida.hora_encuentro)
  const complete = Boolean(point && days.length > 0 && time)
  if (!complete) {
    return { point, days, time, complete: false, daysLabel: null, compactDaysLabel: null, label: null, visualItems: [] }
  }

  const daysLabel = days.map(day => DAY_LABELS[day]).join(' · ')
  const compactDaysLabel = days.map(day => SHORT_DAY_LABELS[day]).join(' · ')
  return {
    point,
    days,
    time,
    complete: true,
    daysLabel,
    compactDaysLabel,
    label: `📍 ${point} · 🗓️ ${daysLabel} · ⏰ ${time}`,
    visualItems: [`🗓️ ${compactDaysLabel}`, `⏰ ${time}`, `📍 ${point}`],
  }
}
