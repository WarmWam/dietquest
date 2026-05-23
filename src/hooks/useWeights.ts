import { useCallback, useMemo } from 'react'
import { watchWeights } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { WeightLog } from '@/types/domain'

export function useWeights(daysBack = 30) {
  const fallback = useMemo<WeightLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: WeightLog[], error: Error | null) => void) => {
    return watchWeights(uid, daysBack, ({ data, error }) => next(data, error))
  }, [daysBack])

  return useWatch(fallback, subscribe)
}
