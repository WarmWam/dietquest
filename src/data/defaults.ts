import type { MealPreset, UserProfile, UserSettings } from '@/types/domain'

export const DEFAULT_PROFILE: UserProfile = {
  sex: 'male',
  age: 31,
  height_cm: 169,
  weight_start_kg: 80,
  weight_target_kg: 65,
  target_date: new Date('2026-11-15'),
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'auto',
  accent: 'aurora',
  daily_kcal_target: 1950,
  daily_protein_target: 140,
}

export const DEFAULT_BREAKFAST: MealPreset = {
  id: 'regular-breakfast',
  name: 'Whey + 2 eggs + banana',
  tag: 'Breakfast regular',
  meal_type: 'breakfast',
  icon: 'DQ',
  items: [
    { name: 'Whey BAAM', portion: 1, unit: 'scoop', kcal: 120, protein_g: 24, carb_g: 3, fat_g: 1 },
    { name: 'Boiled eggs', portion: 2, unit: 'eggs', kcal: 140, protein_g: 13, carb_g: 1, fat_g: 10 },
    { name: 'Banana', portion: 1, unit: 'medium', kcal: 90, protein_g: 1, carb_g: 23, fat_g: 0 },
  ],
  total_kcal: 350,
  total_protein_g: 38,
}

export const PLAN_SECTIONS = [
  {
    title: 'Breakfast',
    icon: 'AM',
    items: ['Whey + 2 eggs + banana', 'Overnight oats + Greek yogurt', 'Toast + avocado + 2 eggs'],
  },
  {
    title: 'Lunch',
    icon: 'NO',
    items: ['Chicken breast + brown rice + salad', 'Fish + riceberry + vegetables', 'Boat noodles half portion'],
  },
  {
    title: 'Dinner',
    icon: 'PM',
    items: ['Grilled fish + vegetables', 'Steak + potatoes', 'Air-fried tofu + bok choy'],
  },
  {
    title: 'Workout templates',
    icon: 'WK',
    items: ['Incline walk 45 minutes', 'Bodyweight circuit', 'Easy recovery walk'],
  },
]
