import { create } from 'zustand'
import type { Sex } from '@/types/domain'

interface OnboardingDraftState {
  sex: Sex
  age: number
  height_cm: number
  weight_start_kg: number
  weight_target_kg: number
  target_months: number
  setSex: (sex: Sex) => void
  setAge: (age: number) => void
  setHeight: (height: number) => void
  setStartWeight: (weight: number) => void
  setTargetWeight: (weight: number) => void
  setTargetMonths: (months: number) => void
  reset: () => void
}

export const useOnboardingDraft = create<OnboardingDraftState>((set) => ({
  sex: 'male',
  age: 30,
  height_cm: 170,
  weight_start_kg: 80.0,
  weight_target_kg: 65.0,
  target_months: 6,
  setSex: (sex) => set({ sex }),
  setAge: (age) => set({ age }),
  setHeight: (height_cm) => set({ height_cm }),
  setStartWeight: (weight) =>
    set((state) => {
      const nextTarget = Math.min(state.weight_target_kg, weight - 1)
      return {
        weight_start_kg: weight,
        weight_target_kg: nextTarget,
      }
    }),
  setTargetWeight: (weight_target_kg) => set({ weight_target_kg }),
  setTargetMonths: (target_months) => set({ target_months }),
  reset: () =>
    set({
      sex: 'male',
      age: 30,
      height_cm: 170,
      weight_start_kg: 80.0,
      weight_target_kg: 65.0,
      target_months: 6,
    }),
}))
