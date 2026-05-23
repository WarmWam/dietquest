import { useCallback, useMemo } from 'react'
import { todayKey } from '@/lib/dates'
import { watchMeals } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { MealLog } from '@/types/domain'

export function useMeals(date = todayKey()) {
  const fallback = useMemo<MealLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: MealLog[], error: Error | null) => void) => {
    return watchMeals(uid, date, ({ data, error }) => next(data, error))
  }, [date])

  return useWatch(fallback, subscribe)
}
