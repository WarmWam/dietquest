import type { Sex, WeightLog } from '@/types/domain'
import { KCAL_PER_KG, maintenanceKcal } from '@/lib/nutrition'

// Per-day energy in/out used to project the "calculated" weight line.
export type DayEnergy = { intakeKcal: number; exerciseKcal: number }

// Number of whole days between two YYYY-MM-DD keys (b - a).
function dayDiff(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime()
  const db = new Date(`${b}T00:00:00`).getTime()
  return Math.round((db - da) / 86_400_000)
}

// Produce a value for each date in `dates` from sparse actual entries:
//   - exact entry           → that value
//   - between two entries    → linear interpolation by day index
//   - after the last entry   → carry the last value forward
//   - before the first entry → null (line hasn't started yet)
export function buildActualWeightSeries(
  entries: WeightLog[],
  dates: string[],
): (number | null)[] {
  const sorted = [...entries]
    .filter((e) => e.weight_kg > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  if (sorted.length === 0) return dates.map(() => null)

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  return dates.map((date) => {
    if (date < first.date) return null
    if (date >= last.date) return last.weight_kg

    // Find the bracketing entries [lo, hi] with lo.date <= date < hi.date
    let lo = sorted[0]
    let hi = sorted[sorted.length - 1]
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].date <= date && date < sorted[i + 1].date) {
        lo = sorted[i]
        hi = sorted[i + 1]
        break
      }
    }
    if (lo.date === date) return lo.weight_kg
    const span = dayDiff(lo.date, hi.date)
    if (span <= 0) return lo.weight_kg
    const t = dayDiff(lo.date, date) / span
    return Number((lo.weight_kg + (hi.weight_kg - lo.weight_kg) * t).toFixed(2))
  })
}

// Project the "calculated" weight via energy balance:
//   day 0           = startWeight
//   day i (i >= 1)  = prev + (prevIntake - maintenance(prevWeight, prevExercise)) / 7700
// Days with no intake logged contribute no change (treated as maintenance)
// so the line stays flat instead of diving toward zero.
export function buildCalculatedWeightSeries({
  dates,
  startWeightKg,
  sex,
  heightCm,
  age,
  energyByDate,
}: {
  dates: string[]
  startWeightKg: number
  sex: Sex
  heightCm: number
  age: number
  energyByDate: Map<string, DayEnergy>
}): number[] {
  if (dates.length === 0) return []
  const out: number[] = []
  let running = startWeightKg
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      out.push(Number(running.toFixed(2)))
      continue
    }
    const prevDate = dates[i - 1]
    const prev = energyByDate.get(prevDate)
    if (prev && prev.intakeKcal > 0) {
      const maint = maintenanceKcal({
        sex,
        weightKg: running,
        heightCm,
        age,
        exerciseKcal: prev.exerciseKcal,
      })
      running += (prev.intakeKcal - maint) / KCAL_PER_KG
    }
    out.push(Number(running.toFixed(2)))
  }
  return out
}
