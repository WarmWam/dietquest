import { useCallback, useEffect, useState } from 'react'
import { getDayTotalsRange } from '@/lib/db'
import { daysAgoKey } from '@/lib/dates'
import { useAuth } from '@/hooks/useAuth'
import type { DayTotals } from '@/types/domain'

/**
 * Fetches DayTotals for the last N days (including today).
 * Returns an array of DayTotals ordered oldest → newest.
 * Unlike useWatch, this is a one-shot fetch (not realtime).
 */
export function useDayTotals(daysBack: number) {
  const { user } = useAuth()
  const [data, setData] = useState<DayTotals[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchDays = useCallback(async () => {
    if (!user) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const dates: string[] = []
      for (let i = daysBack - 1; i >= 0; i--) {
        dates.push(daysAgoKey(i))
      }
      const result = await getDayTotalsRange(user.uid, dates)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch day totals'))
    } finally {
      setLoading(false)
    }
  }, [user, daysBack])

  useEffect(() => {
    void fetchDays()
  }, [fetchDays])

  return { data, loading, error, refetch: fetchDays }
}
