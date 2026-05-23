import { useCallback, useMemo } from 'react'
import { watchWorkouts } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { WorkoutLog } from '@/types/domain'

export function useWorkouts(daysBack = 30) {
  const fallback = useMemo<WorkoutLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: WorkoutLog[], error: Error | null) => void) => {
    return watchWorkouts(uid, daysBack, ({ data, error }) => next(data, error))
  }, [daysBack])

  return useWatch(fallback, subscribe)
}
