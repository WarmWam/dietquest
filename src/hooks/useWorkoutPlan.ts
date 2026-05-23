import { useCallback, useMemo } from 'react'
import { deleteWorkoutPlan, upsertWorkoutPlan, watchMonthWorkoutPlans, watchWorkoutPlan } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { WorkoutPlan } from '@/types/domain'

export function useWorkoutPlan(date: string) {
  const { user } = useAuth()
  const fallback = useMemo<WorkoutPlan | null>(() => null, [])
  const subscribe = useCallback((uid: string, next: (data: WorkoutPlan | null, error: Error | null) => void) => {
    return watchWorkoutPlan(uid, date, ({ data, error }) => next(data, error))
  }, [date])

  return {
    ...useWatch(fallback, subscribe),
    save: (plan: WorkoutPlan) => {
      if (!user) throw new Error('Sign in required')
      return upsertWorkoutPlan(user.uid, plan)
    },
    remove: () => {
      if (!user) throw new Error('Sign in required')
      return deleteWorkoutPlan(user.uid, date)
    },
  }
}

export function useMonthWorkoutPlans(monthKey: string) {
  const fallback = useMemo<WorkoutPlan[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: WorkoutPlan[], error: Error | null) => void) => {
    return watchMonthWorkoutPlans(uid, monthKey, ({ data, error }) => next(data, error))
  }, [monthKey])

  return useWatch(fallback, subscribe)
}
