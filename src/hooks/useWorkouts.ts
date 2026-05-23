import { useCallback, useMemo } from 'react'
import { addWorkout, watchWorkouts } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { WorkoutLog } from '@/types/domain'

export function useWorkouts(daysBack = 30) {
  const { user } = useAuth()
  const fallback = useMemo<WorkoutLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: WorkoutLog[], error: Error | null) => void) => {
    return watchWorkouts(uid, daysBack, ({ data, error }) => next(data, error))
  }, [daysBack])

  return {
    ...useWatch(fallback, subscribe),
    add: (workout: Omit<WorkoutLog, 'id'>) => {
      if (!user) throw new Error('Sign in required')
      return addWorkout(user.uid, workout)
    },
  }
}
