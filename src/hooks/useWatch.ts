import { useEffect, useState } from 'react'
import type { Unsubscribe } from 'firebase/firestore'
import { useAuth } from '@/hooks/useAuth'

export type HookState<T> = {
  data: T
  loading: boolean
  error: Error | null
}

export function useWatch<T>(fallback: T, subscribe: (uid: string, next: (data: T, error: Error | null) => void) => Unsubscribe): HookState<T> {
  const { user } = useAuth()
  const [data, setData] = useState<T>(fallback)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      setData(fallback)
      setLoading(false)
      setError(null)
      return undefined
    }

    setLoading(true)
    const unsubscribe = subscribe(user.uid, (nextData, nextError) => {
      setData(nextData)
      setError(nextError)
      setLoading(false)
    })

    return unsubscribe
  }, [fallback, subscribe, user])

  return { data, loading, error }
}
