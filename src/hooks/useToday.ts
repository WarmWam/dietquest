import { useCallback, useMemo } from 'react'
import { todayKey } from '@/lib/dates'
import { watchDayTotals } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { DayTotals } from '@/types/domain'

const emptyTotals: DayTotals = {
  date: todayKey(),
  totals: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, water_ml: 0 },
  habits: { water_done: false, walk_done: false, sleep_on_time: false },
}

export function useToday(date = todayKey()) {
  const fallback = useMemo<DayTotals>(() => ({ ...emptyTotals, date }), [date])
  const subscribe = useCallback((uid: string, next: (data: DayTotals, error: Error | null) => void) => {
    return watchDayTotals(uid, date, ({ data, error }) => next(data ?? fallback, error))
  }, [date, fallback])

  return useWatch(fallback, subscribe)
}
