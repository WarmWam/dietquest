import { create } from 'zustand'
import type { MealType, MealPreset } from '@/types/domain'

interface MealDraftState {
  mealType: MealType
  selectedPreset: MealPreset | null
  setMealType: (type: MealType) => void
  setSelectedPreset: (preset: MealPreset | null) => void
  reset: () => void
}

export const useMealDraft = create<MealDraftState>((set) => ({
  mealType: 'breakfast',
  selectedPreset: null,
  setMealType: (mealType) => set({ mealType }),
  setSelectedPreset: (selectedPreset) => set({ selectedPreset }),
  reset: () => set({ mealType: 'breakfast', selectedPreset: null }),
}))
export default useMealDraft
