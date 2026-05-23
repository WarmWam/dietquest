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
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { daysAgoKey } from '@/lib/dates'
import type { DayTotals, MealLog, MealPreset, SleepLog, User, WaterLog, WeightLog, WorkoutLog } from '@/types/domain'

type WatchState<T> = {
  data: T
  error: Error | null
}

type WatchCallback<T> = (state: WatchState<T>) => void

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
  return {
    ...user,
    profile: user.profile
      ? {
          ...user.profile,
          target_date: toTimestamp(user.profile.target_date),
        }
      : undefined,
    updated_at: serverTimestamp(),
  }
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
    (error) => cb({ data: null, error }),
  )
}

export async function upsertUser(uid: string, partial: Partial<User>): Promise<void> {
  await setDoc(userRef(uid), serializeUser(partial), { merge: true })
}

export function watchDayTotals(uid: string, date: string, cb: WatchCallback<DayTotals | null>): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'days', date),
    (snapshot) => cb({ data: snapshot.exists() ? deserializeDayTotals(snapshot.id, snapshot.data()) : null, error: null }),
    (error) => cb({ data: null, error }),
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
    (error) => cb({ data: [], error }),
  )
}

export async function deleteMeal(uid: string, mealId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'meals', mealId))
}

export async function addWeight(uid: string, weight: WeightLog): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'weights', weight.date), { ...weight, updated_at: serverTimestamp() }, { merge: true })
}

export function watchWeights(uid: string, days: number, cb: WatchCallback<WeightLog[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'weights'), where('date', '>=', daysAgoKey(days)), orderBy('date', 'asc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeWeight), error: null }),
    (error) => cb({ data: [], error }),
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
    (error) => cb({ data: [], error }),
  )
}

export async function deleteWater(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'water', id))
}

export async function addWorkout(uid: string, workout: Omit<WorkoutLog, 'id'>): Promise<string> {
  const workoutRef = doc(userCollection(uid, 'workouts'))
  await runTransaction(db, async (tx) => {
    tx.set(workoutRef, { ...workout, logged_at: serverTimestamp(), created_at: serverTimestamp() })
    tx.set(doc(db, 'users', uid, 'days', workout.date), { date: workout.date, habits: { walk_done: true }, updated_at: serverTimestamp() }, { merge: true })
  })
  return workoutRef.id
}

export function watchWorkouts(uid: string, daysBack: number, cb: WatchCallback<WorkoutLog[]>): Unsubscribe {
  return onSnapshot(
    query(userCollection(uid, 'workouts'), where('date', '>=', daysAgoKey(daysBack)), orderBy('date', 'desc')),
    (snapshot) => cb({ data: snapshot.docs.map(deserializeWorkout), error: null }),
    (error) => cb({ data: [], error }),
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
    (error) => cb({ data: null, error }),
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
    (error) => cb({ data: [], error }),
  )
}

export async function markPresetUsed(uid: string, presetId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'presets', presetId), {
    last_used_at: serverTimestamp(),
    use_count: increment(1),
    updated_at: serverTimestamp(),
  })
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
