import { useCallback, useMemo } from 'react'
import { addWeight, watchWeights } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { WeightLog } from '@/types/domain'

export function useWeights(daysBack = 30) {
  const { user } = useAuth()
  const fallback = useMemo<WeightLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: WeightLog[], error: Error | null) => void) => {
    return watchWeights(uid, daysBack, ({ data, error }) => next(data, error))
  }, [daysBack])

  return {
    ...useWatch(fallback, subscribe),
    add: (weight: WeightLog) => {
      if (!user) throw new Error('Sign in required')
      return addWeight(user.uid, weight)
    },
  }
}
