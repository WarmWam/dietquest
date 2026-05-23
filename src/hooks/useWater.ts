import { useCallback, useMemo } from 'react'
import { todayKey } from '@/lib/dates'
import { watchWaterToday } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { WaterLog } from '@/types/domain'

export function useWater(date = todayKey()) {
  const fallback = useMemo<WaterLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: WaterLog[], error: Error | null) => void) => {
    return watchWaterToday(uid, date, ({ data, error }) => next(data, error))
  }, [date])
  const state = useWatch(fallback, subscribe)

  return {
    ...state,
    totalMl: state.data.reduce((sum, log) => sum + log.ml, 0),
  }
}
