import { useCallback, useMemo } from 'react'
import { todayKey } from '@/lib/dates'
import { watchAnalysisUsage } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { AnalysisUsage } from '@/types/domain'

export function useAnalysisUsage(date = todayKey()) {
  const fallback = useMemo<AnalysisUsage[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: AnalysisUsage[], error: Error | null) => void) => {
    return watchAnalysisUsage(uid, date, ({ data, error }) => next(data, error))
  }, [date])

  return useWatch(fallback, subscribe)
}
