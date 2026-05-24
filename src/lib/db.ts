import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { daysAgoKey } from '@/lib/dates'
import type { DayTotals, Food, HealthAnalysis, MealLog, MealPlan, MealPlanItem, MealPreset, SleepLog, User, WaterLog, WeightLog, WorkoutLog, WorkoutPlan } from '@/types/domain'
import { emptyMealPlan, normalizeFoodCategory } from '@/types/domain'

type WatchState<T> = {
  data: T
  error: Error | null
}

type WatchCallback<T> = (state: WatchState<T>) => void

function logFirestoreError(label: string, error: Error): Error {
  console.error(`[Firestore] ${label} listener failed:`, error)
  return error
}

function listenerError<T>(label: string, data: T, cb: WatchCallback<T>) {
  return (error: Error) => cb({ data, error: logFirestoreError(label, error) })
}

function userRef(uid: string) {
  return doc(db, 'users', uid)
}

function userCollection(uid: string, name: string) {
  return collection(db, 'users', uid, name)
}

function fromTimestamp(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return new Date()
}

function toTimestamp(value: Date) {
  return Timestamp.fromDate(value)
}

function serializeUser(user: Partial<User>): DocumentData {
  const result: DocumentData = {
    updated_at: serverTimestamp(),
  }
  if (user.email !== undefined) result.email = user.email
  if (user.display_name !== undefined) result.display_name = user.display_name
  if (user.profile !== undefined) {
    result.profile = {
      ...user.profile,
      target_date: toTimestamp(user.profile.target_date),
    }
  }
  if (user.settings !== undefined) {
    result.settings = user.settings
  }
  return result
}

function deserializeUser(id: string, data: DocumentData): User {
  return {
    id,
    email: String(data.email ?? ''),
    display_name: String(data.display_name ?? ''),
    profile: {
      sex: data.profile?.sex ?? 'other',
      age: Number(data.profile?.age ?? 0),
      height_cm: Number(data.profile?.height_cm ?? 0),
      weight_start_kg: Number(data.profile?.weight_start_kg ?? 0),
      weight_target_kg: Number(data.profile?.weight_target_kg ?? 0),
      target_date: fromTimestamp(data.profile?.target_date),
    },
    settings: {
      theme: data.settings?.theme ?? 'auto',
      accent: data.settings?.accent ?? 'aurora',
      daily_kcal_target: Number(data.settings?.daily_kcal_target ?? 0),
      daily_protein_target: Number(data.settings?.daily_protein_target ?? 0),
      notifications: data.settings?.notifications,
    },
  }
}

function deserializeMeal(snapshot: QueryDocumentSnapshot<DocumentData>): MealLog {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    date: String(data.date),
    meal_type: data.meal_type,
    items: data.items ?? [],
    total_kcal: Number(data.total_kcal ?? 0),
    total_protein_g: Number(data.total_protein_g ?? 0),
    total_carb_g: Number(data.total_carb_g ?? 0),
    total_fat_g: Number(data.total_fat_g ?? 0),
    logged_at: fromTimestamp(data.logged_at),
  }
}

function deserializeWeight(snapshot: QueryDocumentSnapshot<DocumentData>): WeightLog {
  const data = snapshot.data()
  return {
    date: snapshot.id,
    weight_kg: Number(data.weight_kg ?? 0),
  }
}

function deserializeWater(snapshot: QueryDocumentSnapshot<DocumentData>): WaterLog {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    time: String(data.time ?? ''),
    ml: Number(data.ml ?? 0),
  }
}

function deserializeWorkout(snapshot: QueryDocumentSnapshot<DocumentData>): WorkoutLog {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    date: String(data.date),
    type: data.type ?? 'other',
    duration_min: Number(data.duration_min ?? 0),
    incline_pct: data.incline_pct == null ? undefined : Number(data.incline_pct),
    speed_kmh: data.speed_kmh == null ? undefined : Number(data.speed_kmh),
    kcal_burned: Number(data.kcal_burned ?? 0),
    mood: data.mood,
  }
}

function deserializeSleep(id: string, data: DocumentData): SleepLog {
  return {
    id,
    date: String(data.date ?? id),
    bedtime: String(data.bedtime ?? ''),
    wake_time: String(data.wake_time ?? ''),
    duration_min: Number(data.duration_min ?? 0),
    quality_1_5: Number(data.quality_1_5 ?? 0),
  }
}

function deserializeAnalysis(snapshot: QueryDocumentSnapshot<DocumentData>): HealthAnalysis {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    period: data.period === 'week' ? 'week' : 'day',
    start_date: String(data.start_date ?? ''),
    end_date: String(data.end_date ?? ''),
    summary: String(data.summary ?? ''),
    wins: Array.isArray(data.wins) ? data.wins.map(String) : [],
    risks: Array.isArray(data.risks) ? data.risks.map(String) : [],
    actions: Array.isArray(data.actions) ? data.actions.map(String) : [],
    created_at: fromTimestamp(data.created_at),
  }
}

function deserializePreset(snapshot: QueryDocumentSnapshot<DocumentData>): MealPreset {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    tag: String(data.tag ?? ''),
    meal_type: data.meal_type ?? 'breakfast',
    icon: String(data.icon ?? '🍽️'),
    items: data.items ?? [],
    total_kcal: Number(data.total_kcal ?? 0),
    total_protein_g: Number(data.total_protein_g ?? 0),
  }
}

function deserializeDayTotals(id: string, data: DocumentData): DayTotals {
  return {
    date: String(data.date ?? id),
    totals: {
      kcal: Number(data.totals?.kcal ?? 0),
      protein_g: Number(data.totals?.protein_g ?? 0),
      carb_g: Number(data.totals?.carb_g ?? 0),
      fat_g: Number(data.totals?.fat_g ?? 0),
      water_ml: Number(data.totals?.water_ml ?? 0),
    },
    habits: {
      water_done: Boolean(data.habits?.water_done ?? Number(data.totals?.water_ml ?? 0) >= 3000),
      walk_done: Boolean(data.habits?.walk_done ?? false),
      sleep_on_time: Boolean(data.habits?.sleep_on_time ?? false),
    },
  }
}

export async function getUser(uid: string): Promise<User | null> {
  const snapshot = await getDoc(userRef(uid))
  return snapshot.exists() ? deserializeUser(snapshot.id, snapshot.data()) : null
}

export function watchUser(uid: string, cb: WatchCallback<User | null>): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snapshot) => cb({ data: snapshot.exists() ? deserializeUser(snapshot.id, snapshot.data()) : null, error: null }),
    listenerError(`users/${uid}`, null, cb),
  )
}

export async function upsertUser(uid: string, partial: Partial<User>): Promise<void> {
  await setDoc(userRef(uid), serializeUser(partial), { merge: true })
}

export function watchDayTotals(uid: string, date: string, cb: WatchCallback<DayTotals | null>): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'days', date),
    (snapshot) => cb({ data: snapshot.exists() ? deserializeDayTotals(snapshot.id, snapshot.data()) : null, error: null }),
    listenerError(`users/${uid}/days/${date}`, null, cb),
  )
}

export async function getDayTotalsRange(uid: string, dates: string[]): Promise<DayTotals[]> {
  const snapshots = await Promise.all(
    dates.map((date) => getDoc(doc(db, 'users', uid, 'days', date)))
  )
  return dates.map((date, i) => {
    const snap = snapshots[i]
    if (snap.exists()) return deserializeDayTotals(snap.id, snap.data())
    return {
      date,
      totals: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, water_ml: 0 },
      habits: { water_done: false, walk_done: false, sleep_on_time: false },
    }
  })
}

export async function getSleepRange(uid: string, dates: string[]): Promise<SleepLog[]> {
  const snapshots = await Promise.all(
    dates.map((date) => getDoc(doc(db, 'users', uid, 'sleep', date)))
  )
  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => deserializeSleep(snapshot.id, snapshot.data()))
}

export async function upsertDayTotals(uid: string, date: string, totals: DayTotals): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'days', date), { ...totals, updated_at: serverTimestamp() }, { merge: true })
}

export async function addMeal(uid: string, meal: Omit<MealLog, 'id' | 'logged_at'>): Promise<string> {
  const mealRef = doc(userCollection(uid, 'meals'))
  await runTransaction(db, async (tx) => {
    const dayRef = doc(db, 'users', uid, 'days', meal.date)
    tx.set(mealRef, { ...meal, logged_at: serverTimestamp(), created_at: serverTimestamp() })
    tx.set(
      dayRef,
      {
        date: meal.date,
        totals: {
          kcal: increment(meal.total_kcal),
          protein_g: increment(meal.total_protein_g),
          carb_g: increment(meal.total_carb_g),
          fat_g: increment(meal.total_fat_g),
        },
        updated_at: serverTimestamp(),
      },
      { merge: true },
    )
  })
  return mealRef.id
}

export function watchMeals(uid: string, date: string, cb: WatchCallback<MealLog[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'meals'), where('date', '==', date), orderBy('logged_at', 'asc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeMeal), error: null }),
    listenerError(`users/${uid}/meals date=${date}`, [], cb),
  )
}

export async function getMealsRange(uid: string, startDate: string, endDate: string): Promise<MealLog[]> {
  const snapshot = await getDocs(
    query(userCollection(uid, 'meals'), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date', 'asc'))
  )
  return snapshot.docs.map(deserializeMeal)
}

export async function deleteMeal(uid: string, mealId: string): Promise<void> {
  // Read meal first to decrement day totals atomically. If meal doesn't
  // exist (already deleted), just no-op.
  await runTransaction(db, async (tx) => {
    const mealRef = doc(db, 'users', uid, 'meals', mealId)
    const snap = await tx.get(mealRef)
    if (!snap.exists()) return
    const meal = snap.data() as Partial<MealLog>
    if (meal.date) {
      const dayRef = doc(db, 'users', uid, 'days', meal.date)
      tx.set(
        dayRef,
        {
          date: meal.date,
          totals: {
            kcal: increment(-(meal.total_kcal ?? 0)),
            protein_g: increment(-(meal.total_protein_g ?? 0)),
            carb_g: increment(-(meal.total_carb_g ?? 0)),
            fat_g: increment(-(meal.total_fat_g ?? 0)),
          },
          updated_at: serverTimestamp(),
        },
        { merge: true },
      )
    }
    tx.delete(mealRef)
  })
}

export async function addWeight(uid: string, weight: WeightLog): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'weights', weight.date), { ...weight, updated_at: serverTimestamp() }, { merge: true })
}

export function watchWeights(uid: string, days: number, cb: WatchCallback<WeightLog[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'weights'), where('date', '>=', daysAgoKey(days)), orderBy('date', 'asc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeWeight), error: null }),
    listenerError(`users/${uid}/weights days=${days}`, [], cb),
  )
}

export async function deleteWeight(uid: string, date: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'weights', date))
}

export async function addWater(uid: string, date: string, ml: number): Promise<string> {
  const waterRef = doc(userCollection(uid, 'water'))
  await runTransaction(db, async (tx) => {
    const dayRef = doc(db, 'users', uid, 'days', date)
    tx.set(waterRef, { date, ml, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), logged_at: serverTimestamp() })
    tx.set(dayRef, { date, totals: { water_ml: increment(ml) }, updated_at: serverTimestamp() }, { merge: true })
  })
  return waterRef.id
}

export function watchWaterToday(uid: string, date: string, cb: WatchCallback<WaterLog[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'water'), where('date', '==', date), orderBy('logged_at', 'asc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeWater), error: null }),
    listenerError(`users/${uid}/water date=${date}`, [], cb),
  )
}

export async function deleteWater(uid: string, date: string, id: string, ml: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    tx.delete(doc(db, 'users', uid, 'water', id))
    tx.set(
      doc(db, 'users', uid, 'days', date),
      { date, totals: { water_ml: increment(-ml) }, updated_at: serverTimestamp() },
      { merge: true },
    )
  })
}

export async function addWorkout(uid: string, workout: Omit<WorkoutLog, 'id'>): Promise<string> {
  const workoutRef = doc(userCollection(uid, 'workouts'))
  await runTransaction(db, async (tx) => {
    tx.set(workoutRef, { ...workout, logged_at: serverTimestamp(), created_at: serverTimestamp() })
    tx.set(doc(db, 'users', uid, 'days', workout.date), { date: workout.date, habits: { walk_done: true }, updated_at: serverTimestamp() }, { merge: true })
  })
  return workoutRef.id
}

export async function deleteWorkout(uid: string, workoutId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'workouts', workoutId))
}

export function watchWorkouts(uid: string, daysBack: number, cb: WatchCallback<WorkoutLog[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'workouts'), where('date', '>=', daysAgoKey(daysBack)), orderBy('date', 'desc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeWorkout), error: null }),
    listenerError(`users/${uid}/workouts daysBack=${daysBack}`, [], cb),
  )
}

export async function upsertSleep(uid: string, sleep: Omit<SleepLog, 'id'>): Promise<void> {
  await runTransaction(db, async (tx) => {
    tx.set(doc(db, 'users', uid, 'sleep', sleep.date), { ...sleep, updated_at: serverTimestamp() }, { merge: true })
    tx.set(doc(db, 'users', uid, 'days', sleep.date), { date: sleep.date, habits: { sleep_on_time: true }, updated_at: serverTimestamp() }, { merge: true })
  })
}

export function watchSleep(uid: string, date: string, cb: WatchCallback<SleepLog | null>): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'sleep', date),
    (snapshot) => cb({ data: snapshot.exists() ? deserializeSleep(snapshot.id, snapshot.data()) : null, error: null }),
    listenerError(`users/${uid}/sleep/${date}`, null, cb),
  )
}

export async function getWorkoutsRange(uid: string, startDate: string, endDate: string): Promise<WorkoutLog[]> {
  const snapshot = await getDocs(
    query(userCollection(uid, 'workouts'), where('date', '>=', startDate), where('date', '<=', endDate), orderBy('date', 'asc'))
  )
  return snapshot.docs.map(deserializeWorkout)
}

export async function saveAnalysis(uid: string, analysis: Omit<HealthAnalysis, 'id' | 'created_at'>): Promise<string> {
  const docRef = await addDoc(userCollection(uid, 'analyses'), { ...analysis, created_at: serverTimestamp() })
  return docRef.id
}

export function watchAnalyses(uid: string, cb: WatchCallback<HealthAnalysis[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'analyses'), orderBy('created_at', 'desc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeAnalysis), error: null }),
    listenerError(`users/${uid}/analyses`, [], cb),
  )
}

export async function addPreset(uid: string, preset: Omit<MealPreset, 'id'>): Promise<string> {
  const docRef = await addDoc(userCollection(uid, 'presets'), { ...preset, use_count: 0, created_at: serverTimestamp(), updated_at: serverTimestamp() })
  return docRef.id
}

export function watchPresets(uid: string, cb: WatchCallback<MealPreset[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'presets'), orderBy('name', 'asc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializePreset), error: null }),
    listenerError(`users/${uid}/presets`, [], cb),
  )
}

export async function markPresetUsed(uid: string, presetId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'presets', presetId), {
    last_used_at: serverTimestamp(),
    use_count: increment(1),
    updated_at: serverTimestamp(),
  })
}

// ─────────────────────────────────────────────────────────────
// Foods (Library)
// ─────────────────────────────────────────────────────────────

function deserializeFood(snap: { id: string; data: () => DocumentData }): Food {
  const data = snap.data()
  return {
    id: snap.id,
    name: String(data.name ?? ''),
    category: normalizeFoodCategory(data.category),
    portion_unit: String(data.portion_unit ?? 'serving'),
    kcal_per_portion: Number(data.kcal_per_portion ?? 0),
    protein_g_per_portion: Number(data.protein_g_per_portion ?? 0),
    created_at: data.created_at?.toDate?.() ?? undefined,
    updated_at: data.updated_at?.toDate?.() ?? undefined,
  }
}

// ─────────────────────────────────────────────────────────────
// Shared library catalog (top-level /library_foods)
// All authenticated users read + write the same catalog.
// uid param kept for signature compatibility with hooks.
// ─────────────────────────────────────────────────────────────

const FOOD_COL = 'library_foods'

export async function addFood(_uid: string, food: Omit<Food, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const docRef = await addDoc(collection(db, FOOD_COL), {
    ...food,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  return docRef.id
}

export async function updateFood(_uid: string, id: string, partial: Partial<Omit<Food, 'id'>>): Promise<void> {
  await updateDoc(doc(db, FOOD_COL, id), {
    ...partial,
    updated_at: serverTimestamp(),
  })
}

export async function deleteFood(_uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, FOOD_COL, id))
}

export function watchFoods(_uid: string, cb: WatchCallback<Food[]>): Unsubscribe {
  return onSnapshot(
    query(collection(db, FOOD_COL), orderBy('name', 'asc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeFood), error: null }),
    listenerError(`${FOOD_COL} (shared catalog)`, [], cb),
  )
}

export async function bulkAddFoods(foods: Omit<Food, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
  const batch = writeBatch(db)
  foods.forEach((food) => {
    const ref = doc(collection(db, FOOD_COL))
    batch.set(ref, { ...food, created_at: serverTimestamp(), updated_at: serverTimestamp() })
  })
  await batch.commit()
}

export async function getCatalogCount(): Promise<number> {
  const snap = await getDocs(collection(db, FOOD_COL))
  return snap.size
}

// Read a user's legacy per-user foods (pre-v1.4.0). Used once during
// catalog migration to preserve any customizations they made.
export async function getLegacyUserFoods(uid: string): Promise<Omit<Food, 'id' | 'created_at' | 'updated_at'>[]> {
  const snap = await getDocs(userCollection(uid, 'foods'))
  return snap.docs.map((d) => {
    const food = deserializeFood(d)
    return {
      name: food.name,
      category: food.category,
      portion_unit: food.portion_unit,
      kcal_per_portion: food.kcal_per_portion,
      protein_g_per_portion: food.protein_g_per_portion,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// Meal plans (Calendar)
// ─────────────────────────────────────────────────────────────

function sanitizeMealItems(items: any): MealPlanItem[] {
  if (!Array.isArray(items)) return []
  return items.map((it) => ({
    food_id: String(it.food_id ?? ''),
    food_name: String(it.food_name ?? ''),
    portion: Number(it.portion ?? 1),
    kcal: Number(it.kcal ?? 0),
    protein_g: Number(it.protein_g ?? 0),
  }))
}

function deserializeMealPlan(id: string, data: DocumentData): MealPlan {
  return {
    date: id,
    breakfast: sanitizeMealItems(data.breakfast),
    lunch: sanitizeMealItems(data.lunch),
    dinner: sanitizeMealItems(data.dinner),
    snack: sanitizeMealItems(data.snack),
    totals: {
      kcal: Number(data.totals?.kcal ?? 0),
      protein_g: Number(data.totals?.protein_g ?? 0),
    },
    notes: data.notes ? String(data.notes) : undefined,
    updated_at: data.updated_at?.toDate?.() ?? undefined,
  }
}

export function watchMealPlan(uid: string, date: string, cb: WatchCallback<MealPlan>): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'meal_plans', date),
    (snapshot) => cb({
      data: snapshot.exists() ? deserializeMealPlan(snapshot.id, snapshot.data()) : emptyMealPlan(date),
      error: null,
    }),
    listenerError(`users/${uid}/meal_plans/${date}`, emptyMealPlan(date), cb),
  )
}

export function watchMonthMealPlans(uid: string, monthKey: string, cb: WatchCallback<MealPlan[]>): Unsubscribe {
  // monthKey = 'YYYY-MM' — query date prefix
  return onSnapshot(
    query(
      userCollection(uid, 'meal_plans'),
      where('__name__', '>=', `${monthKey}-01`),
      where('__name__', '<=', `${monthKey}-31`),
    ),
    (snapshot) => cb({ data: snapshot.docs.map((d) => deserializeMealPlan(d.id, d.data())), error: null }),
    listenerError(`users/${uid}/meal_plans month=${monthKey}`, [], cb),
  )
}

export async function bulkUpsertMealPlans(uid: string, plans: MealPlan[]): Promise<void> {
  // Firestore batches max 500 ops. We never bulk-plan more than ~31 days, so 1 batch is enough.
  const batch = writeBatch(db)
  plans.forEach((plan) => {
    const allItems = [...plan.breakfast, ...plan.lunch, ...plan.dinner, ...plan.snack]
    const totals = {
      kcal: allItems.reduce((s, it) => s + (it.kcal ?? 0), 0),
      protein_g: allItems.reduce((s, it) => s + (it.protein_g ?? 0), 0),
    }
    batch.set(
      doc(db, 'users', uid, 'meal_plans', plan.date),
      {
        breakfast: plan.breakfast,
        lunch: plan.lunch,
        dinner: plan.dinner,
        snack: plan.snack,
        totals,
        notes: plan.notes ?? null,
        updated_at: serverTimestamp(),
      },
      { merge: true },
    )
  })
  await batch.commit()
}

export async function bulkUpsertWorkoutPlans(uid: string, plans: WorkoutPlan[]): Promise<void> {
  const batch = writeBatch(db)
  plans.forEach((plan) => {
    batch.set(
      doc(db, 'users', uid, 'workout_plans', plan.date),
      {
        type: plan.type,
        duration_min: plan.duration_min,
        kcal_target: plan.kcal_target ?? plan.duration_min,
        notes: plan.notes ?? null,
        updated_at: serverTimestamp(),
      },
      { merge: true },
    )
  })
  await batch.commit()
}

export async function upsertMealPlan(uid: string, plan: MealPlan): Promise<void> {
  // Recompute totals from items
  const allItems = [...plan.breakfast, ...plan.lunch, ...plan.dinner, ...plan.snack]
  const totals = {
    kcal: allItems.reduce((s, it) => s + (it.kcal ?? 0), 0),
    protein_g: allItems.reduce((s, it) => s + (it.protein_g ?? 0), 0),
  }
  await setDoc(
    doc(db, 'users', uid, 'meal_plans', plan.date),
    {
      breakfast: plan.breakfast,
      lunch: plan.lunch,
      dinner: plan.dinner,
      snack: plan.snack,
      totals,
      notes: plan.notes ?? null,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  )
}

// ─────────────────────────────────────────────────────────────
// Workout plans (Calendar)
// ─────────────────────────────────────────────────────────────

function deserializeWorkoutPlan(id: string, data: DocumentData): WorkoutPlan {
  const type = (data.type as WorkoutPlan['type']) ?? 'rest'
  return {
    date: id,
    type,
    duration_min: Number(data.duration_min ?? 0),
    kcal_target: data.kcal_target == null ? (type === 'rest' ? 0 : 200) : Number(data.kcal_target),
    notes: data.notes ? String(data.notes) : undefined,
    updated_at: data.updated_at?.toDate?.() ?? undefined,
  }
}

export function watchWorkoutPlan(uid: string, date: string, cb: WatchCallback<WorkoutPlan | null>): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'workout_plans', date),
    (snapshot) => cb({
      data: snapshot.exists() ? deserializeWorkoutPlan(snapshot.id, snapshot.data()) : null,
      error: null,
    }),
    listenerError(`users/${uid}/workout_plans/${date}`, null, cb),
  )
}

export function watchMonthWorkoutPlans(uid: string, monthKey: string, cb: WatchCallback<WorkoutPlan[]>): Unsubscribe {
  return onSnapshot(
    query(
      userCollection(uid, 'workout_plans'),
      where('__name__', '>=', `${monthKey}-01`),
      where('__name__', '<=', `${monthKey}-31`),
    ),
    (snapshot) => cb({ data: snapshot.docs.map((d) => deserializeWorkoutPlan(d.id, d.data())), error: null }),
    listenerError(`users/${uid}/workout_plans month=${monthKey}`, [], cb),
  )
}

export async function upsertWorkoutPlan(uid: string, plan: WorkoutPlan): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'workout_plans', plan.date),
    {
      type: plan.type,
      duration_min: plan.duration_min,
      kcal_target: plan.kcal_target ?? plan.duration_min,
      notes: plan.notes ?? null,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function deleteWorkoutPlan(uid: string, date: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'workout_plans', date))
}

export async function exportUserData(uid: string): Promise<any> {
  const userSnap = await getDoc(userRef(uid))
  if (!userSnap.exists()) return null

  const userData = deserializeUser(userSnap.id, userSnap.data())

  const getSubcollection = async (name: string, deserializer: (snap: any) => any) => {
    const snap = await getDocs(userCollection(uid, name))
    return snap.docs.map(deserializer)
  }

  const [meals, weights, water, workouts, presets] = await Promise.all([
    getSubcollection('meals', deserializeMeal),
    getSubcollection('weights', deserializeWeight),
    getSubcollection('water', deserializeWater),
    getSubcollection('workouts', deserializeWorkout),
    getSubcollection('presets', deserializePreset),
  ])

  const sleepSnap = await getDocs(userCollection(uid, 'sleep'))
  const sleeps = sleepSnap.docs.map((doc) => deserializeSleep(doc.id, doc.data()))

  const daysSnap = await getDocs(userCollection(uid, 'days'))
  const days = daysSnap.docs.map((doc) => deserializeDayTotals(doc.id, doc.data()))

  return {
    profile: userData.profile,
    settings: userData.settings,
    meals,
    weights,
    water,
    workouts,
    sleeps,
    presets,
    days,
  }
}
