import { useAuth } from '@/hooks/useAuth'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/data/defaults'
import { calculateBmr, defaultSugarTarget } from '@/lib/nutrition'
import { upsertUser } from '@/lib/db'
import type { UserProfile } from '@/types/domain'

export function useOnboarding() {
  const { user } = useAuth()

  async function completeOnboarding(profile: UserProfile = DEFAULT_PROFILE) {
    if (!user) throw new Error('Sign in required')
    
    const bmr = calculateBmr({
      sex: profile.sex,
      weightKg: profile.weight_start_kg,
      heightCm: profile.height_cm,
      age: profile.age,
    })
    const tdee = Math.round(bmr * 1.5)
    
    const now = new Date()
    const diffMonths = Math.max(
      3,
      (profile.target_date.getFullYear() - now.getFullYear()) * 12 +
        profile.target_date.getMonth() -
        now.getMonth()
    )
    const dailyDeficit = ((profile.weight_start_kg - profile.weight_target_kg) * 7700) / (diffMonths * 30)
    const dailyKcal = Math.max(1200, Math.round(tdee - dailyDeficit))
    const dailyProtein = Math.round(profile.weight_target_kg * 1.8)

    await upsertUser(user.uid, {
      id: user.uid,
      email: user.email ?? '',
      display_name: user.displayName ?? user.email ?? 'DietQuest',
      profile,
      settings: {
        ...DEFAULT_SETTINGS,
        daily_kcal_target: dailyKcal,
        daily_protein_target: dailyProtein,
        daily_sugar_target: defaultSugarTarget(profile.sex),
      },
    })
  }

  return { completeOnboarding }
}
