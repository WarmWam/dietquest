import { create } from 'zustand'
import type { User as FirebaseUser } from 'firebase/auth'
import { logout, signInGoogle, watchAuth } from '@/lib/auth'

type AuthState = {
  user: FirebaseUser | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {
    set({ error: null })
    try {
      await signInGoogle()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to sign in' })
    }
  },
  signOut: async () => {
    set({ error: null })
    await logout()
  },
}))

watchAuth((user) => {
  useAuthStore.setState({ user, loading: false, error: null })
})
