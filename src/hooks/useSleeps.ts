import { useCallback, useEffect, useState } from 'react'
import { daysAgoKey } from '@/lib/dates'
import { getSleepRange } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import type { SleepLog } from '@/types/domain'

export function useSleeps(daysBack: number) {
  const { user } = useAuth()
  const [data, setData] = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSleeps = useCallback(async () => {
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
      const result = await getSleepRange(user.uid, dates)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sleep logs'))
    } finally {
      setLoading(false)
    }
  }, [user, daysBack])

  useEffect(() => {
    void fetchSleeps()
  }, [fetchSleeps])

  return { data, loading, error, refetch: fetchSleeps }
}
