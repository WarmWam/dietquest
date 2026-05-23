import type { Sex } from '@/types/domain'

export function calculateBmr({ sex, weightKg, heightCm, age }: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'female') return Math.round(base - 161)
  return Math.round(base + 5)
}

export function calculateDailyTargets({ sex, weightKg, heightCm, age }: { sex: Sex; weightKg: number; heightCm: number; age: number }) {
  const bmr = calculateBmr({ sex, weightKg, heightCm, age })
  const tdee = Math.round(bmr * 1.45)
  return {
    daily_kcal_target: Math.max(1500, tdee - 500),
    daily_protein_target: Math.round(weightKg * 1.75),
  }
}
