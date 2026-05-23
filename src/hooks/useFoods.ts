import { useCallback, useMemo } from 'react'
import { addFood, deleteFood, updateFood, watchFoods } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { useWatch } from '@/hooks/useWatch'
import type { Food } from '@/types/domain'

export function useFoods() {
  const { user } = useAuth()
  const fallback = useMemo<Food[]>(() => [], [])
  const subscribe = useCallback((uid: string, next: (data: Food[], error: Error | null) => void) => {
    return watchFoods(uid, ({ data, error }) => next(data, error))
  }, [])

  return {
    ...useWatch(fallback, subscribe),
    add: (food: Omit<Food, 'id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Sign in required')
      return addFood(user.uid, food)
    },
    update: (id: string, partial: Partial<Omit<Food, 'id'>>) => {
      if (!user) throw new Error('Sign in required')
      return updateFood(user.uid, id, partial)
    },
    remove: (id: string) => {
      if (!user) throw new Error('Sign in required')
      return deleteFood(user.uid, id)
    },
  }
}
