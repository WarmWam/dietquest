import { useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import { watchUser } from '@/lib/db'
import type { User } from '@/types/domain'

type UserHookState = {
  user: ReturnType<typeof useAuth>['user']
  profile: User | null
  loading: boolean
  exists: boolean
  error: Error | null
}

export function useUser(): UserHookState {
  const { user } = useAuth()
  const fallback = useMemo<User | null>(() => null, [])
  const subscribe = useCallback((uid: string, next: (data: User | null, error: Error | null) => void) => watchUser(uid, ({ data, error }) => next(data, error)), [])
  const { data: profile, loading, error } = useWatch(fallback, subscribe)

  return { user, profile, loading, exists: Boolean(profile), error }
}
