import type { Sex } from '@/types/domain'

export function calculateBmr({ sex, weightKg, heightCm, age }: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'female') return Math.round(base - 161)
  return Math.round(base + 5)
}

// Daily added-sugar ceiling (AHA): men ~36g (9 tsp), women ~25g (6 tsp).
// "other" sits in the middle.
export function defaultSugarTarget(sex: Sex): number {
  if (sex === 'female') return 25
  if (sex === 'male') return 36
  return 30
}

export function calculateDailyTargets({ sex, weightKg, heightCm, age }: { sex: Sex; weightKg: number; heightCm: number; age: number }) {
  const bmr = calculateBmr({ sex, weightKg, heightCm, age })
  const tdee = Math.round(bmr * 1.45)
  return {
    daily_kcal_target: Math.max(1500, tdee - 500),
    daily_protein_target: Math.round(weightKg * 1.75),
    daily_sugar_target: defaultSugarTarget(sex),
  }
}

// kcal per kg of body fat — standard energy-balance constant.
export const KCAL_PER_KG = 7700

// Sedentary base multiplier on BMR. Exercise is logged separately as
// kcal_burned and added on top, so we use the low (sedentary) factor here
// to avoid double-counting activity.
export const SEDENTARY_FACTOR = 1.2

// Maintenance kcal for a given day = BMR(that day's weight) * sedentary
// factor + whatever exercise was actually logged that day.
export function maintenanceKcal({
  sex,
  weightKg,
  heightCm,
  age,
  exerciseKcal,
}: {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
  exerciseKcal: number
}): number {
  const bmr = calculateBmr({ sex, weightKg, heightCm, age })
  return bmr * SEDENTARY_FACTOR + Math.max(0, exerciseKcal)
}
