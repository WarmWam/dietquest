import { useCallback, useMemo } from 'react'
import { todayKey } from '@/lib/dates'
import { addMeal, deleteMeal, watchMeals } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { MealLog } from '@/types/domain'

export function useMeals(date = todayKey()) {
  const { user } = useAuth()
  const fallback = useMemo<MealLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: MealLog[], error: Error | null) => void) => {
    return watchMeals(uid, date, ({ data, error }) => next(data, error))
  }, [date])

  return {
    ...useWatch(fallback, subscribe),
    add: (meal: Omit<MealLog, 'id' | 'logged_at'>) => {
      if (!user) throw new Error('Sign in required')
      return addMeal(user.uid, meal)
    },
    remove: (mealId: string) => {
      if (!user) throw new Error('Sign in required')
      return deleteMeal(user.uid, mealId)
    },
  }
}
