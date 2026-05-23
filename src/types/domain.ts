export type ThemeMode = 'light' | 'dark' | 'auto'
export type AccentName = 'aurora' | 'ember' | 'leaf' | 'ocean' | 'violet'
export type Sex = 'male' | 'female' | 'other'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MacroTotals = {
  kcal: number
  protein_g: number
  carb_g: number
  fat_g: number
  water_ml: number
}

export type UserProfile = {
  sex: Sex
  age: number
  height_cm: number
  weight_start_kg: number
  weight_target_kg: number
  target_date: Date
}

export type UserSettings = {
  theme: ThemeMode
  accent: AccentName
  daily_kcal_target: number
  daily_protein_target: number
  notifications?: {
    breakfast: boolean
    lunch: boolean
    water: boolean
    workout: boolean
    bedtime: boolean
  }
}

export type User = {
  id: string
  email: string
  display_name: string
  profile: UserProfile
  settings: UserSettings
}

export type DayTotals = {
  date: string
  totals: MacroTotals
  habits: {
    water_done: boolean
    walk_done: boolean
    sleep_on_time: boolean
  }
}

export type MealItem = {
  name: string
  portion: number
  unit?: string
  kcal: number
  protein_g: number
  carb_g: number
  fat_g: number
}

export type MealLog = {
  id: string
  date: string
  meal_type: MealType
  items: MealItem[]
  total_kcal: number
  total_protein_g: number
  total_carb_g: number
  total_fat_g: number
  logged_at: Date
}

export type MealPreset = {
  id: string
  name: string
  tag: string
  meal_type: MealType
  icon: string
  items: MealItem[]
  total_kcal: number
  total_protein_g: number
}

export type WeightLog = {
  date: string
  weight_kg: number
}

export type Fruit = {
  id: string
  name: string
  thaiName: string
  serving: string
  kcal: number
}

export type WaterLog = {
  id: string
  time: string
  ml: number
}

export type WorkoutLog = {
  id: string
  date: string
  type: 'incline_walk' | 'bodyweight' | 'other'
  duration_min: number
  incline_pct?: number
  speed_kmh?: number
  kcal_burned: number
  mood?: string
}

export type SleepLog = {
  id: string
  date: string
  bedtime: string
  wake_time: string
  duration_min: number
  quality_1_5: number
}

export type FoodCategory = 'food' | 'fruit' | 'com_food' | 'other'

export type Food = {
  id: string
  name: string
  category: FoodCategory
  portion_unit: string
  kcal_per_portion: number
  protein_g_per_portion: number
  created_at?: Date
  updated_at?: Date
}

export const FOOD_CATEGORIES: { id: FoodCategory; label: string; icon: string }[] = [
  { id: 'food', label: 'Food', icon: 'FD' },
  { id: 'fruit', label: 'Fruit', icon: 'FR' },
  { id: 'com_food', label: 'Com.Food', icon: 'CF' },
  { id: 'other', label: 'Other', icon: 'OT' },
]

// Map legacy category values (from earlier v1.1.0) to the simplified set
const LEGACY_CATEGORY_MAP: Record<string, FoodCategory> = {
  protein: 'food',
  carb: 'food',
  veggie: 'food',
  drink: 'other',
  snack: 'other',
}

export function normalizeFoodCategory(raw: unknown): FoodCategory {
  if (typeof raw !== 'string') return 'other'
  if (raw === 'food' || raw === 'fruit' || raw === 'other' || raw === 'com_food') return raw
  return LEGACY_CATEGORY_MAP[raw] ?? 'other'
}

// ─────────────────────────────────────────────────────────────
// Meal & Workout planning (Calendar)
// ─────────────────────────────────────────────────────────────

export type MealPlanItem = {
  food_id: string
  food_name: string  // denormalized for display
  portion: number    // multiplier on food's per-portion values
  kcal: number       // = food.kcal_per_portion * portion (cached)
  protein_g: number  // = food.protein_g_per_portion * portion (cached)
}

export type MealPlan = {
  date: string  // YYYY-MM-DD (doc ID)
  breakfast: MealPlanItem[]
  lunch: MealPlanItem[]
  dinner: MealPlanItem[]
  snack: MealPlanItem[]
  totals: { kcal: number; protein_g: number }
  notes?: string
  updated_at?: Date
}

export type WorkoutPlanType = 'incline_walk' | 'bodyweight' | 'rest' | 'other'

export type WorkoutPlan = {
  date: string  // YYYY-MM-DD (doc ID)
  type: WorkoutPlanType
  duration_min: number
  kcal_target?: number
  notes?: string
  updated_at?: Date
}

export const WORKOUT_PLAN_TYPES: { id: WorkoutPlanType; label: string; icon: string }[] = [
  { id: 'incline_walk', label: 'Incline walk', icon: 'walk' },
  { id: 'bodyweight', label: 'Bodyweight', icon: 'bolt' },
  { id: 'rest', label: 'Rest day', icon: 'moon' },
  { id: 'other', label: 'Other', icon: 'sparkle' },
]

export function emptyMealPlan(date: string): MealPlan {
  return {
    date,
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
    totals: { kcal: 0, protein_g: 0 },
  }
}
