import { useCallback, useMemo } from 'react'
import { todayKey } from '@/lib/dates'
import { addWater, watchWaterToday } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { WaterLog } from '@/types/domain'

export function useWater(date = todayKey()) {
  const { user } = useAuth()
  const fallback = useMemo<WaterLog[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: WaterLog[], error: Error | null) => void) => {
    return watchWaterToday(uid, date, ({ data, error }) => next(data, error))
  }, [date])
  const state = useWatch(fallback, subscribe)

  return {
    ...state,
    totalMl: state.data.reduce((sum, log) => sum + log.ml, 0),
    add: (ml: number) => {
      if (!user) throw new Error('Sign in required')
      return addWater(user.uid, date, ml)
    },
  }
}
