import type { DayTotals, Fruit, MealLog, MealPreset, User, WaterLog, WeightLog, WorkoutLog, SleepLog } from '@/types/domain'

export const MOCK_USER: User = {
  id: 'mock-user-1',
  email: 'asuna.posie@gmail.com',
  display_name: 'Asuna Posie',
  profile: {
    sex: 'male',
    age: 31,
    height_cm: 169,
    weight_start_kg: 80,
    weight_target_kg: 65,
    target_date: new Date('2026-11-15'),
  },
  settings: {
    theme: 'auto',
    accent: 'aurora',
    daily_kcal_target: 1950,
    daily_protein_target: 140,
  },
}

export const MOCK_TODAY: DayTotals = {
  date: '2026-05-23',
  totals: { kcal: 1240, protein_g: 78, carb_g: 120, fat_g: 45, water_ml: 1500 },
  habits: { water_done: false, walk_done: true, sleep_on_time: false },
}

export const MOCK_MEALS: MealLog[] = [
  {
    id: 'meal-breakfast',
    date: '2026-05-23',
    meal_type: 'breakfast',
    items: [
      { name: 'Whey BAAM', portion: 1, unit: 'scoop', kcal: 120, protein_g: 24, carb_g: 3, fat_g: 1 },
      { name: 'Boiled eggs', portion: 2, unit: 'eggs', kcal: 140, protein_g: 13, carb_g: 1, fat_g: 10 },
      { name: 'Banana', portion: 1, unit: 'medium', kcal: 90, protein_g: 1, carb_g: 23, fat_g: 0 },
    ],
    total_kcal: 350,
    total_protein_g: 38,
    total_carb_g: 27,
    total_fat_g: 11,
    logged_at: new Date('2026-05-23T06:30:00'),
  },
  {
    id: 'meal-lunch',
    date: '2026-05-23',
    meal_type: 'lunch',
    items: [
      { name: 'Chicken breast', portion: 180, unit: 'g', kcal: 300, protein_g: 55, carb_g: 0, fat_g: 7 },
      { name: 'Brown rice', portion: 1, unit: 'cup', kcal: 215, protein_g: 5, carb_g: 45, fat_g: 2 },
      { name: 'Mixed vegetables', portion: 1, unit: 'plate', kcal: 105, protein_g: 4, carb_g: 18, fat_g: 2 },
    ],
    total_kcal: 620,
    total_protein_g: 64,
    total_carb_g: 63,
    total_fat_g: 11,
    logged_at: new Date('2026-05-23T11:10:00'),
  },
  {
    id: 'meal-snack',
    date: '2026-05-23',
    meal_type: 'snack',
    items: [
      { name: 'Greek yogurt', portion: 1, unit: 'cup', kcal: 150, protein_g: 17, carb_g: 9, fat_g: 4 },
      { name: 'Blueberries', portion: 80, unit: 'g', kcal: 46, protein_g: 1, carb_g: 12, fat_g: 0 },
    ],
    total_kcal: 196,
    total_protein_g: 18,
    total_carb_g: 21,
    total_fat_g: 4,
    logged_at: new Date('2026-05-23T15:35:00'),
  },
]

export const MOCK_PRESETS: MealPreset[] = [
  {
    id: 'regular-breakfast',
    name: 'Whey + 2 eggs + banana',
    tag: 'Breakfast regular',
    meal_type: 'breakfast',
    icon: '🌅',
    items: MOCK_MEALS[0].items,
    total_kcal: 350,
    total_protein_g: 38,
  },
  {
    id: 'chicken-rice',
    name: 'Chicken breast + brown rice + salad',
    tag: 'Lean cut',
    meal_type: 'lunch',
    icon: '🍗',
    items: MOCK_MEALS[1].items,
    total_kcal: 620,
    total_protein_g: 64,
  },
  {
    id: 'fish-veg',
    name: 'Grilled fish + vegetables',
    tag: 'Fish day',
    meal_type: 'dinner',
    icon: '🐟',
    items: [
      { name: 'Grilled fish', portion: 180, unit: 'g', kcal: 290, protein_g: 42, carb_g: 0, fat_g: 12 },
      { name: 'Roasted vegetables', portion: 1, unit: 'plate', kcal: 160, protein_g: 6, carb_g: 25, fat_g: 5 },
    ],
    total_kcal: 450,
    total_protein_g: 48,
  },
  {
    id: 'steak',
    name: 'Beef steak + potatoes',
    tag: 'Red meat',
    meal_type: 'dinner',
    icon: '🥩',
    items: [
      { name: 'Lean beef steak', portion: 180, unit: 'g', kcal: 410, protein_g: 52, carb_g: 0, fat_g: 20 },
      { name: 'Potatoes', portion: 180, unit: 'g', kcal: 165, protein_g: 4, carb_g: 38, fat_g: 0 },
    ],
    total_kcal: 575,
    total_protein_g: 56,
  },
  {
    id: 'boat-noodles',
    name: 'Boat noodles half portion',
    tag: 'Comfort',
    meal_type: 'lunch',
    icon: '🍜',
    items: [
      { name: 'Boat noodles', portion: 1, unit: 'bowl', kcal: 460, protein_g: 28, carb_g: 55, fat_g: 14 },
    ],
    total_kcal: 460,
    total_protein_g: 28,
  },
  {
    id: 'custom',
    name: 'Custom meal',
    tag: 'Build your own',
    meal_type: 'snack',
    icon: '➕',
    items: [],
    total_kcal: 0,
    total_protein_g: 0,
  },
]

export const MOCK_FRUITS: Fruit[] = [
  { id: 'banana', name: 'Banana', thaiName: 'กล้วยหอม', serving: '1 medium', kcal: 90 },
  { id: 'green-apple', name: 'Green apple', thaiName: 'แอปเปิลเขียว', serving: '1 fruit', kcal: 80 },
  { id: 'dragon-fruit', name: 'Dragon fruit', thaiName: 'แก้วมังกร', serving: '1/2 fruit', kcal: 60 },
  { id: 'guava', name: 'Guava', thaiName: 'ฝรั่ง', serving: '1/2 fruit', kcal: 55 },
  { id: 'papaya', name: 'Papaya', thaiName: 'มะละกอ', serving: '1 cup', kcal: 62 },
  { id: 'watermelon', name: 'Watermelon', thaiName: 'แตงโม', serving: '1 cup', kcal: 46 },
]

export const MOCK_WEIGHTS: WeightLog[] = Array.from({ length: 30 }, (_, index) => {
  const start = new Date('2026-04-24T00:00:00')
  start.setDate(start.getDate() + index)
  const wobble = [0, -0.1, 0.1, -0.05, -0.15, 0.05][index % 6]
  const value = 80 - (1.8 / 29) * index + wobble
  return {
    date: start.toISOString().slice(0, 10),
    weight_kg: Number(value.toFixed(1)),
  }
})

MOCK_WEIGHTS[29] = { date: '2026-05-23', weight_kg: 78.2 }

export const MOCK_WATER_LOGS: WaterLog[] = [
  { id: 'w1', time: '07:00', ml: 500 },
  { id: 'w2', time: '10:30', ml: 500 },
  { id: 'w3', time: '14:20', ml: 500 },
]

export const MOCK_WORKOUT: WorkoutLog = {
  id: 'workout-1',
  date: '2026-05-23',
  type: 'incline_walk',
  duration_min: 45,
  incline_pct: 8,
  speed_kmh: 5.5,
  kcal_burned: 328,
  mood: 'strong',
}

export const MOCK_SLEEP: SleepLog = {
  id: 'sleep-1',
  date: '2026-05-23',
  bedtime: '22:38',
  wake_time: '06:02',
  duration_min: 444,
  quality_1_5: 4,
}

export const MOCK_PLAN_SECTIONS = [
  {
    title: 'Breakfast',
    icon: '🌅',
    items: ['Whey + 2 eggs + banana', 'Overnight oats + Greek yogurt', 'Toast + avocado + 2 eggs'],
  },
  {
    title: 'Lunch',
    icon: '☀️',
    items: ['Chicken breast + brown rice + salad', 'Fish + riceberry + vegetables', 'Boat noodles half portion'],
  },
  {
    title: 'Dinner',
    icon: '🌙',
    items: ['Grilled fish + vegetables', 'Steak + potatoes', 'Air-fried tofu + bok choy'],
  },
  {
    title: 'Workout templates',
    icon: '🚶',
    items: ['Incline walk 45 minutes', 'Bodyweight circuit', 'Easy recovery walk'],
  },
]
