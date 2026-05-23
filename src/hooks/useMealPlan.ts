import { useCallback, useMemo } from 'react'
import { upsertMealPlan, watchMealPlan, watchMonthMealPlans } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import { emptyMealPlan, type MealPlan } from '@/types/domain'

export function useMealPlan(date: string) {
  const { user } = useAuth()
  const fallback = useMemo<MealPlan>(() => emptyMealPlan(date), [date])
  const subscribe = useCallback((uid: string, next: (data: MealPlan, error: Error | null) => void) => {
    return watchMealPlan(uid, date, ({ data, error }) => next(data, error))
  }, [date])

  return {
    ...useWatch(fallback, subscribe),
    save: (plan: MealPlan) => {
      if (!user) throw new Error('Sign in required')
      return upsertMealPlan(user.uid, plan)
    },
  }
}

export function useMonthMealPlans(monthKey: string) {
  const fallback = useMemo<MealPlan[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: MealPlan[], error: Error | null) => void) => {
    return watchMonthMealPlans(uid, monthKey, ({ data, error }) => next(data, error))
  }, [monthKey])

  return useWatch(fallback, subscribe)
}
