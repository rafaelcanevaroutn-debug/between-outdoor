import type { DiaItinerario } from '@/types'

export interface ItineraryGroup {
  label: string
  dias: DiaItinerario[]
}

export interface ItineraryDayLoad {
  requiredItems: number
  textLength: number
}

interface GroupingPlan {
  groups: DiaItinerario[][]
  requiredCost: number
  textCost: number
  oversizedGroups: number
  imbalanceCost: number
}

function isConsecutive(days: DiaItinerario[]): boolean {
  return days.every((day, index) => index === 0 || day.numero === days[index - 1].numero + 1)
}

function normalizedLoad(load: ItineraryDayLoad): ItineraryDayLoad {
  return {
    requiredItems: Number.isFinite(load.requiredItems) ? Math.max(0, load.requiredItems) : 0,
    textLength: Number.isFinite(load.textLength) ? Math.max(0, load.textLength) : 0,
  }
}

function isBetterPlan(candidate: GroupingPlan, current: GroupingPlan | null): boolean {
  if (!current) return true
  if (candidate.requiredCost !== current.requiredCost) return candidate.requiredCost < current.requiredCost
  if (candidate.textCost !== current.textCost) return candidate.textCost < current.textCost
  if (candidate.oversizedGroups !== current.oversizedGroups) return candidate.oversizedGroups < current.oversizedGroups
  return candidate.imbalanceCost < current.imbalanceCost
}

function groupLabel(days: DiaItinerario[]): string {
  const first = days[0].numero
  const last = days.at(-1)!.numero
  return first === last ? `DÍA ${first}` : `DÍAS ${first}–${last}`
}

export function groupItineraryDaysByLoad(
  days: DiaItinerario[],
  maxGroups: number,
  getDayLoad: (day: DiaItinerario) => ItineraryDayLoad,
): ItineraryGroup[] {
  if (days.length === 0) return []
  if (!Number.isInteger(maxGroups) || maxGroups < 1) throw new Error('Itinerario requiere al menos un slide de recorrido')

  const groupCount = Math.min(days.length, maxGroups)
  const maxGroupSize = Math.ceil(days.length / groupCount)
  const loads = days.map(day => normalizedLoad(getDayLoad(day)))
  const memo = new Map<string, GroupingPlan | null>()

  function solve(dayIndex: number, groupsRemaining: number): GroupingPlan | null {
    if (groupsRemaining === 0) {
      return dayIndex === days.length
        ? { groups: [], requiredCost: 0, textCost: 0, oversizedGroups: 0, imbalanceCost: 0 }
        : null
    }

    const key = `${dayIndex}:${groupsRemaining}`
    if (memo.has(key)) return memo.get(key) ?? null

    let best: GroupingPlan | null = null
    // Ante un empate, conservar el día temprano solo y desplazar la agrupación hacia adelante.
    for (let size = 1; size <= maxGroupSize; size++) {
      const remainingDays = days.length - (dayIndex + size)
      const remainingGroups = groupsRemaining - 1
      if (remainingDays < remainingGroups || remainingDays > remainingGroups * maxGroupSize) continue

      const groupedDays = days.slice(dayIndex, dayIndex + size)
      if (groupedDays.length !== size || !isConsecutive(groupedDays)) continue

      const tail = solve(dayIndex + size, remainingGroups)
      if (!tail) continue

      const compressionFactor = size - 1
      const groupedLoad = loads.slice(dayIndex, dayIndex + size)
      const candidate: GroupingPlan = {
        groups: [groupedDays, ...tail.groups],
        requiredCost: tail.requiredCost
          + compressionFactor * groupedLoad.reduce((total, load) => total + load.requiredItems, 0),
        textCost: tail.textCost
          + compressionFactor * groupedLoad.reduce((total, load) => total + load.textLength, 0),
        oversizedGroups: tail.oversizedGroups + (size > 2 ? 1 : 0),
        imbalanceCost: tail.imbalanceCost + compressionFactor ** 2,
      }
      if (isBetterPlan(candidate, best)) best = candidate
    }

    memo.set(key, best)
    return best
  }

  const plan = solve(0, groupCount)
  if (!plan) throw new Error('No se puede agrupar el itinerario sin combinar días no consecutivos')

  return plan.groups.map(groupedDays => ({
    label: groupLabel(groupedDays),
    dias: groupedDays,
  }))
}
