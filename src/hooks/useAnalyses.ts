import { useCallback, useMemo } from 'react'
import { watchAnalyses } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { HealthAnalysis } from '@/types/domain'

export function useAnalyses() {
  const fallback = useMemo<HealthAnalysis[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: HealthAnalysis[], error: Error | null) => void) => {
    return watchAnalyses(uid, ({ data, error }) => next(data, error))
  }, [])

  return useWatch(fallback, subscribe)
}
