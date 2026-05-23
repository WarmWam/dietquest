import { useCallback, useMemo } from 'react'
import { todayKey } from '@/lib/dates'
import { upsertSleep, watchSleep } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { SleepLog } from '@/types/domain'

export function useSleep(date = todayKey()) {
  const { user } = useAuth()
  const fallback = useMemo<SleepLog | null>(() => null, [])
  const subscribe = useCallback((uid: string, next: (data: SleepLog | null, error: Error | null) => void) => {
    return watchSleep(uid, date, ({ data, error }) => next(data, error))
  }, [date])

  return {
    ...useWatch(fallback, subscribe),
    upsert: (sleep: Omit<SleepLog, 'id'>) => {
      if (!user) throw new Error('Sign in required')
      return upsertSleep(user.uid, sleep)
    },
  }
}
