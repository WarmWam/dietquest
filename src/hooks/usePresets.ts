import { useCallback, useMemo } from 'react'
import { markPresetUsed, watchPresets } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { MealPreset } from '@/types/domain'

export function usePresets() {
  const { user } = useAuth()
  const fallback = useMemo<MealPreset[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: MealPreset[], error: Error | null) => void) => {
    return watchPresets(uid, ({ data, error }) => next(data, error))
  }, [])

  return {
    ...useWatch(fallback, subscribe),
    markUsed: (presetId: string) => {
      if (!user) throw new Error('Sign in required')
      return markPresetUsed(user.uid, presetId)
    },
  }
}
