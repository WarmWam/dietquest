import { useCallback, useMemo } from 'react'
import { watchPresets } from '@/lib/db'
import { useWatch } from '@/hooks/useWatch'
import type { MealPreset } from '@/types/domain'

export function usePresets() {
  const fallback = useMemo<MealPreset[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: MealPreset[], error: Error | null) => void) => {
    return watchPresets(uid, ({ data, error }) => next(data, error))
  }, [])

  return useWatch(fallback, subscribe)
}
