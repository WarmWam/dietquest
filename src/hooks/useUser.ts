import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
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
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [exists, setExists] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      setExists(false)
      setError(null)
      return undefined
    }

    setLoading(true)
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        setExists(snapshot.exists())
        setProfile(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as User) : null)
        setLoading(false)
        setError(null)
      },
      (nextError) => {
        setError(nextError)
        setLoading(false)
      },
    )
  }, [user])

  return { user, profile, loading, exists, error }
}
