import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MOCK_USER } from '@/lib/mock'
import type { User } from '@/types/domain'

type AuthState = {
  user: User | null
  onboarded: boolean
  signInMock: () => void
  signOut: () => void
  completeOnboarding: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      onboarded: false,
      signInMock: () => set({ user: MOCK_USER }),
      signOut: () => set({ user: null, onboarded: false }),
      completeOnboarding: () => set({ onboarded: true, user: MOCK_USER }),
    }),
    {
      name: 'dietquest-auth',
    },
  ),
)
