import { useAuth } from '@/hooks/useAuth'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/data/defaults'
import { calculateDailyTargets } from '@/lib/nutrition'
import { upsertUser } from '@/lib/db'
import type { UserProfile } from '@/types/domain'

export function useOnboarding() {
  const { user } = useAuth()

  async function completeOnboarding(profile: UserProfile = DEFAULT_PROFILE) {
    if (!user) throw new Error('Sign in required')
    const targets = calculateDailyTargets({
      sex: profile.sex,
      age: profile.age,
      heightCm: profile.height_cm,
      weightKg: profile.weight_start_kg,
    })

    await upsertUser(user.uid, {
      id: user.uid,
      email: user.email ?? '',
      display_name: user.displayName ?? user.email ?? 'DietQuest',
      profile,
      settings: {
        ...DEFAULT_SETTINGS,
        ...targets,
      },
    })
  }

  return { completeOnboarding }
}
