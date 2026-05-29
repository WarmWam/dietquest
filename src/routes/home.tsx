import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Ring, Skeleton, type IconName } from '@/components/primitives'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { useFoods } from '@/hooks/useFoods'
import { useMealPlan } from '@/hooks/useMealPlan'
import { useMeals } from '@/hooks/useMeals'
import { useScrollLock } from '@/hooks/useScrollLock'
import { useSleep } from '@/hooks/useSleep'
import { useToday } from '@/hooks/useToday'
import { useUser } from '@/hooks/useUser'
import { useWater } from '@/hooks/useWater'
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan'
import { useWeights } from '@/hooks/useWeights'
import { useWorkouts } from '@/hooks/useWorkouts'
import { todayKey as getTodayKey } from '@/lib/dates'
import { FOOD_CATEGORIES, WORKOUT_PLAN_TYPES, type Food, type FoodCategory, type MealLog, type MealPlanItem, type MealType, type UserSettings, type WaterLog, type WorkoutLog, type WorkoutPlan } from '@/types/domain'

type SlotIcon = 'sunrise' | 'sun' | 'moon' | 'snack'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDayMonth(isoDate: string): string {
  // input: YYYY-MM-DD → output: "24 May"
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  const day = parseInt(parts[2], 10)
  const monthIdx = parseInt(parts[1], 10) - 1
  if (isNaN(day) || monthIdx < 0 || monthIdx > 11) return isoDate
  return `${day} ${MONTH_SHORT[monthIdx]}`
}

const mealMeta: Record<MealType, { icon: SlotIcon; color: string }> = {
  breakfast: { icon: 'sunrise', color: '#FB923C' },
  lunch: { icon: 'sun', color: '#F59E0B' },
  dinner: { icon: 'moon', color: '#6366F1' },
  snack: { icon: 'snack', color: '#EC4899' },
}

export function HomeRoute() {
  const [params] = useSearchParams()
  const [selectedDate, setSelectedDate] = useState(() => params.get('date') || getTodayKey())
  const { profile, loading: userLoading, error: userError } = useUser()
  const { data: meals, add: addMeal, remove: removeMeal, loading: mealsLoading, error: mealsError } = useMeals(selectedDate)
  const { loading: todayLoading, error: todayError } = useToday(selectedDate)
  const hasError = mealsError || todayError
  const sheet = params.get('sheet') === '1'
  const settings = profile?.settings ?? DEFAULT_SETTINGS

  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const [touchStart, setTouchStart] = useState(0)

  useEffect(() => {
    if (hasError) toast.error("Couldn't load today. Try again.")
  }, [hasError])

  useEffect(() => {
    if (userError) toast.error("Couldn't load profile. Try again.")
  }, [userError])

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY)
      setPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pulling || refreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStart
    if (diff > 0) {
      const progress = Math.min(diff / 1.5, 70)
      setPullProgress(progress)
    }
  }

  const handleTouchEnd = () => {
    if (!pulling) return
    setPulling(false)
    if (pullProgress >= 50) {
      setRefreshing(true)
      haptic(5)
      setTimeout(() => {
        setRefreshing(false)
        setPullProgress(0)
        toast.success("Synced with Firebase")
      }, 1000)
    } else {
      setPullProgress(0)
    }
  }

  return (
    <AppScreen activeNav="home">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {(pullProgress > 0 || refreshing) && (
          <div
            style={{
              height: refreshing ? 50 : pullProgress,
              transition: pulling ? 'none' : 'height 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--line)',
              borderRadius: 'var(--r-md)',
              margin: '0 0 10px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                transform: refreshing ? 'none' : `rotate(${pullProgress * 5}deg)`,
              }}
            >
              <Icon name="sparkle" size={24} color="var(--a1)" />
            </div>
          </div>
        )}
        {userLoading || mealsLoading || todayLoading ? (
          <HomeSkeleton />
        ) : hasError ? (
          <HomeErrorCard error={hasError} />
        ) : (
          <HomeFullContent addMeal={addMeal} meals={meals} removeMeal={removeMeal} selectedDate={selectedDate} setSelectedDate={setSelectedDate} settings={settings} />
        )}
      </div>
      {sheet ? <LogSheet /> : null}
    </AppScreen>
  )
}

function HomeFullContent({
  addMeal,
  meals,
  removeMeal,
  selectedDate,
  setSelectedDate,
  settings,
}: {
  addMeal: ReturnType<typeof useMeals>['add']
  meals: MealLog[]
  removeMeal: ReturnType<typeof useMeals>['remove']
  selectedDate: string
  setSelectedDate: (date: string) => void
  settings: UserSettings
}) {
  const navigate = useNavigate()
  const todayKey = selectedDate
  const isToday = selectedDate === getTodayKey()
  const { data: plan, error: planError } = useMealPlan(selectedDate)
  const { data: workoutPlan, error: workoutPlanError } = useWorkoutPlan(selectedDate)
  const { data: waterLogs, add: addWater, remove: removeWater, totalMl, error: waterError } = useWater(selectedDate)
  const { data: sleep, upsert: upsertSleep, error: sleepError } = useSleep(selectedDate)
  const { data: weights, add: addWeight, error: weightsError } = useWeights(30)
  const { data: workouts, add: addWorkout, remove: removeWorkout, error: workoutsError } = useWorkouts(1)
  const [savingTask, setSavingTask] = useState<string | null>(null)
  const [waterAmount, setWaterAmount] = useState(0)
  const [sleepStart, setSleepStart] = useState(sleep?.bedtime ?? '22:00')
  const [sleepEnd, setSleepEnd] = useState(sleep?.wake_time ?? '06:00')
  const [workoutKcal, setWorkoutKcal] = useState('')
  const [customizing, setCustomizing] = useState<MealType | null>(null)
  const { data: foodsCatalog } = useFoods()
  const latestWeight = weights[weights.length - 1]
  const todayWeightEntry = weights.find((w) => w.date === selectedDate)
  const [weightInput, setWeightInput] = useState('')
  const todayWorkouts = workouts.filter((w) => w.date === todayKey)
  const totalWorkoutKcal = todayWorkouts.reduce((sum, w) => sum + w.kcal_burned, 0)
  const workoutTarget = workoutPlan?.kcal_target ?? 0
  const workoutPct = Math.min(totalWorkoutKcal / Math.max(workoutTarget || 1, 1), 1)

  // Compute totals live from meals[] (source of truth) — denormalized
  // today.totals can drift if a meal was deleted without decrementing.
  const liveKcal = meals.reduce((sum, m) => sum + (m.total_kcal ?? 0), 0)
  const liveProtein = meals.reduce((sum, m) => sum + (m.total_protein_g ?? 0), 0)
  const liveSugar = meals.reduce((sum, m) => sum + (m.total_sugar_g ?? 0), 0)
  const sugarTarget = settings.daily_sugar_target || 36

  // Per-meal breakdown in fixed order (snack always last) so the donut can
  // draw segment dividers showing how each meal contributed.
  const SLOT_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  const calBySlot = SLOT_ORDER.map((t) =>
    meals.filter((m) => m.meal_type === t).reduce((s, m) => s + (m.total_kcal ?? 0), 0),
  )
  const sugarBySlot = SLOT_ORDER.map((t) =>
    meals.filter((m) => m.meal_type === t).reduce((s, m) => s + (m.total_sugar_g ?? 0), 0),
  )
  // Planned kcal per slot (parallel to calBySlot) so the ring can colour
  // each segment using the same rule as the meal card: green if at/under
  // plan, yellow if over plan, red if well over.
  const calPlanBySlot = SLOT_ORDER.map((t) =>
    (plan?.[t] ?? []).reduce((s, it) => s + (it.kcal ?? 0), 0),
  )

  useEffect(() => {
    if (sleep) {
      setSleepStart(sleep.bedtime)
      setSleepEnd(sleep.wake_time)
    } else {
      setSleepStart('22:00')
      setSleepEnd('06:00')
    }
  }, [sleep])

  useEffect(() => {
    // Prefill the weigh-in field with this day's logged weight, falling back
    // to the most recent known weight so re-saving keeps the last value.
    if (todayWeightEntry) setWeightInput(String(todayWeightEntry.weight_kg))
    else if (latestWeight) setWeightInput(String(latestWeight.weight_kg))
    else setWeightInput('')
  }, [todayWeightEntry, latestWeight, selectedDate])

  useEffect(() => {
    if (weightsError || workoutsError || planError || workoutPlanError || waterError || sleepError) toast.error("Couldn't load home plan. Try again.")
  }, [weightsError, workoutsError, planError, workoutPlanError, waterError, sleepError])

  async function saveWeight() {
    if (savingTask) return
    const kg = Number(weightInput)
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      toast.error('Enter a weight between 20 and 400 kg.')
      return
    }
    setSavingTask('weight')
    try {
      await addWeight({ date: selectedDate, weight_kg: Math.round(kg * 10) / 10 })
      toast.success('Weight saved')
      haptic(10)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save weight.")
    } finally {
      setSavingTask(null)
    }
  }

  async function confirmMeal(mealType: MealType, items: MealPlanItem[], loggedMeals: MealLog[]) {
    if (savingTask) return
    if (loggedMeals.length > 0) {
      setSavingTask(mealType)
      try {
        await Promise.all(loggedMeals.map((meal) => removeMeal(meal.id)))
        toast.success(`${mealType} unchecked`)
        haptic(5)
      } catch (err) {
        console.error(err)
        toast.error("Couldn't undo meal.")
      } finally {
        setSavingTask(null)
      }
      return
    }
    if (items.length === 0) return
    setSavingTask(mealType)
    try {
      await addMeal({
        date: todayKey,
        meal_type: mealType,
        items: items.map((item) => ({
          name: item.food_name,
          portion: item.portion,
          unit: 'serving',
          kcal: item.kcal,
          protein_g: item.protein_g,
          carb_g: 0,
          fat_g: 0,
          sugar_g: item.sugar_g ?? 0,
        })),
        total_kcal: items.reduce((sum, item) => sum + item.kcal, 0),
        total_protein_g: Math.round(items.reduce((sum, item) => sum + item.protein_g, 0) * 10) / 10,
        total_carb_g: 0,
        total_fat_g: 0,
        total_sugar_g: Math.round(items.reduce((sum, item) => sum + (item.sugar_g ?? 0), 0) * 10) / 10,
      })
      toast.success(`${mealType} confirmed`)
      haptic(10)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't confirm meal.")
      haptic([20, 40, 20])
    } finally {
      setSavingTask(null)
    }
  }

  async function saveCustomized(mealType: MealType, items: { name: string; portion: number; unit: string; kcal: number; protein_g: number; sugar_g: number }[]) {
    if (savingTask || items.length === 0) return
    setSavingTask(mealType)
    try {
      // Remove any prior log for this meal_type today first (avoid duplicates)
      const existing = meals.filter((m) => m.meal_type === mealType)
      await Promise.all(existing.map((m) => removeMeal(m.id)))
      await addMeal({
        date: todayKey,
        meal_type: mealType,
        items: items.map((it) => ({ ...it, carb_g: 0, fat_g: 0 })),
        total_kcal: items.reduce((s, it) => s + it.kcal, 0),
        total_protein_g: Math.round(items.reduce((s, it) => s + it.protein_g, 0) * 10) / 10,
        total_carb_g: 0,
        total_fat_g: 0,
        total_sugar_g: Math.round(items.reduce((s, it) => s + (it.sugar_g ?? 0), 0) * 10) / 10,
      })
      toast.success(`${mealType} logged · ${items.length} item${items.length === 1 ? '' : 's'}`)
      haptic(10)
      setCustomizing(null)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save meal.")
      haptic([20, 40, 20])
    } finally {
      setSavingTask(null)
    }
  }

  async function confirmWater() {
    if (savingTask || waterAmount <= 0) return
    setSavingTask('water')
    try {
      await addWater(waterAmount)
      toast.success(`+${waterAmount} ml`)
      setWaterAmount(0)
      haptic(5)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't confirm water.")
    } finally {
      setSavingTask(null)
    }
  }

  async function deleteWaterLog(log: WaterLog) {
    if (!window.confirm(`Delete ${log.ml} ml at ${log.time}?`)) return
    setSavingTask(`water-${log.id}`)
    try {
      await removeWater(log)
      toast.success('Water deleted')
      haptic(5)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't delete water.")
    } finally {
      setSavingTask(null)
    }
  }

  async function confirmWorkout(planToLog: WorkoutPlan) {
    if (savingTask) return
    const kcal = Number(workoutKcal)
    if (!Number.isFinite(kcal) || kcal < 0 || kcal > 3000) {
      toast.error('Enter kcal between 0 and 3000.')
      return
    }
    setSavingTask('workout')
    try {
      await addWorkout({
        date: todayKey,
        type: planToLog.type === 'rest' ? 'other' : planToLog.type,
        duration_min: 0,
        kcal_burned: Math.round(kcal),
      })
      setWorkoutKcal('')
      toast.success('Workout confirmed')
      haptic(10)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't confirm workout.")
    } finally {
      setSavingTask(null)
    }
  }

  async function deleteWorkoutLog(log: WorkoutLog) {
    if (!window.confirm(`Delete ${log.kcal_burned} kcal workout?`)) return
    setSavingTask(`workout-${log.id}`)
    try {
      await removeWorkout(log.id)
      toast.success('Workout deleted')
      haptic(5)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't delete workout.")
    } finally {
      setSavingTask(null)
    }
  }

  async function saveSleep() {
    if (savingTask) return
    if (!sleepStart || !sleepEnd) {
      toast.error('Choose start and end sleep times.')
      return
    }
    setSavingTask('sleep')
    try {
      await upsertSleep({
        date: todayKey,
        bedtime: sleepStart,
        wake_time: sleepEnd,
        duration_min: calculateSleepDuration(sleepStart, sleepEnd),
        quality_1_5: sleep?.quality_1_5 ?? 3,
      })
      toast.success('Sleep saved')
      haptic(10)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save sleep.")
    } finally {
      setSavingTask(null)
    }
  }

  return (
    <>
      <Card raised padding={18}>
        <div className={styles.screenHeader}>
          <span style={{ alignItems: 'center', display: 'inline-flex', gap: 8 }}>
            <label aria-label="Pick date" htmlFor="today-date-picker" style={{ color: 'var(--a1)', cursor: 'pointer', display: 'inline-flex', position: 'relative' }}>
              <Icon name="cal" size={26} />
              <input
                id="today-date-picker"
                onChange={(event) => setSelectedDate(event.target.value || getTodayKey())}
                style={{ cursor: 'pointer', inset: 0, opacity: 0, position: 'absolute', width: 40, height: 40 }}
                type="date"
                value={selectedDate}
              />
            </label>
            <span className="dq-eyebrow">{formatDayMonth(selectedDate)}</span>
          </span>
          {liveKcal > settings.daily_kcal_target ? (
            <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 800 }}>
              {liveKcal - settings.daily_kcal_target} kcal over
            </span>
          ) : (
            <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 800 }}>
              {settings.daily_kcal_target - liveKcal} kcal left
            </span>
          )}
        </div>
        <Ring eaten={liveKcal} sugar={liveSugar} sugarTarget={sugarTarget} size={210} target={settings.daily_kcal_target} calBySlot={calBySlot} calPlanBySlot={calPlanBySlot} sugarBySlot={sugarBySlot} />
      </Card>
      {!isToday ? (
        <Button onClick={() => setSelectedDate(getTodayKey())} variant="ghost">
          Back to today
        </Button>
      ) : null}

      <div className={styles.topStats} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <MiniStat color="#F59E0B" icon="egg" label="Protein" pct={Math.min(liveProtein / Math.max(settings.daily_protein_target || 1, 1), 1)} target={`${settings.daily_protein_target}g`} value={String(Math.round(liveProtein))} />
        <MiniStat color="#0EA5E9" icon="drop" label="Water" pct={Math.min(totalMl / 3000, 1)} target="3.0 L" value={(totalMl / 1000).toFixed(1)} />
        <MiniStat color="#10B981" icon="walk" label="Incline" pct={workoutPct} target={`${workoutTarget || 0} kcal`} value={String(totalWorkoutKcal)} />
      </div>

      <SectionLabel>Today's plan</SectionLabel>
      {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
        const loggedMeals = meals.filter((meal) => meal.meal_type === type)
        return (
          <PlanMealCard
            done={loggedMeals.length > 0}
            items={plan[type]}
            key={type}
            loggedMeals={loggedMeals}
            mealType={type}
            onConfirm={() => void confirmMeal(type, plan[type], loggedMeals)}
            onSwap={() => setCustomizing(type)}
            saving={savingTask === type}
          />
        )
      })}

      {customizing && (
        <CustomizeMealSheet
          existingItems={meals
            .filter((m) => m.meal_type === customizing)
            .flatMap((m) =>
              m.items.map((it) => ({
                name: it.name,
                portion: it.portion,
                unit: it.unit ?? 'serving',
                kcal: it.kcal,
                protein_g: it.protein_g,
                sugar_g: it.sugar_g ?? 0,
              })),
            )}
          foods={foodsCatalog}
          mealType={customizing}
          onCancel={() => setCustomizing(null)}
          onSave={(items) => void saveCustomized(customizing, items)}
          plannedItems={plan[customizing]}
          saving={savingTask === customizing}
        />
      )}

      <SectionLabel>Daily habits</SectionLabel>
      <div className={styles.habitBox}>
        <WaterTask
          amount={waterAmount}
          done={totalMl >= 3000}
          logs={waterLogs}
          onAdd={(ml) => setWaterAmount((current) => current + ml)}
          onDelete={(log) => void deleteWaterLog(log)}
          onSubmit={() => void confirmWater()}
          saving={savingTask === 'water'}
          totalMl={totalMl}
        />
        <div className="dq-divider" />
        <WorkoutPlanTask
          done={todayWorkouts.length > 0}
          onConfirm={() => workoutPlan ? void confirmWorkout(workoutPlan) : navigate('/plan')}
          onDelete={(log) => void deleteWorkoutLog(log)}
          plan={workoutPlan}
          saving={savingTask === 'workout'}
          setWorkoutKcal={setWorkoutKcal}
          totalWorkoutKcal={totalWorkoutKcal}
          workouts={todayWorkouts}
          workoutKcal={workoutKcal}
        />
        <div className="dq-divider" />
        <SleepTask
          end={sleepEnd}
          onEndChange={setSleepEnd}
          onSave={() => void saveSleep()}
          onStartChange={setSleepStart}
          saving={savingTask === 'sleep'}
          start={sleepStart}
        />
        <div className="dq-divider" />
        <WeightTask
          done={!!todayWeightEntry}
          onChange={setWeightInput}
          onSave={() => void saveWeight()}
          saving={savingTask === 'weight'}
          value={weightInput}
        />
      </div>
    </>
  )
}

function PlanMealCard({
  done,
  items,
  loggedMeals,
  mealType,
  onConfirm,
  onSwap,
  saving,
}: {
  done: boolean
  items: MealPlanItem[]
  loggedMeals: MealLog[]
  mealType: MealType
  onConfirm: () => void
  onSwap: () => void
  saving: boolean
}) {
  const kcal = items.reduce((sum, item) => sum + item.kcal, 0)
  const actualItems = loggedMeals.flatMap((meal) => meal.items)
  const planNames = new Set(items.map((it) => it.food_name))
  const actualNames = new Set(actualItems.map((it) => it.name))
  // "Extras" are logged items not in plan
  const actualExtras = actualItems.filter((it) => !planNames.has(it.name))
  const actualKcal = loggedMeals.reduce((sum, meal) => sum + meal.total_kcal, 0)
  const overPlan = done && actualKcal > kcal && kcal > 0

  return (
    <Card
      padding={14}
      style={{
        // Match the ring rule: green if at/under plan, red if over plan.
        background: done ? (overPlan ? 'color-mix(in oklab, #FCA5A5 42%, var(--surface))' : 'color-mix(in oklab, #BBF7D0 48%, var(--surface))') : undefined,
        borderColor: done ? (overPlan ? 'rgba(220, 38, 38, 0.40)' : 'rgba(34, 197, 94, 0.36)') : undefined,
        marginBottom: 10,
      }}
    >
      <div className={styles.habitRow}>
        <Icon color={mealMeta[mealType].color} name={mealMeta[mealType].icon} />
        <span className={styles.rowText}>
          <strong>{done ? `${actualKcal} kcal` : items.length ? `${kcal} kcal` : 'No planned menu'}</strong>
          <span className={styles.rowSub} style={{ marginTop: 4 }}>
            {done
              ? `${loggedMeals.length} log${loggedMeals.length === 1 ? '' : 's'}${items.length ? ` · planned ${kcal} kcal` : ''}`
              : items.length ? 'planned' : 'Tap Customize to log this slot'}
          </span>
        </span>
        <span className="dq-check" data-on={done}>
          {done ? <Icon color="#fff" name="check" size={14} stroke={3} /> : null}
        </span>
      </div>

      {items.length > 0 && (
        <div style={{ display: 'grid', gap: 6, margin: '10px 0 0 34px' }}>
          {items.map((item) => {
            const skipped = done && !actualNames.has(item.food_name)
            return (
              <div
                key={`plan-${item.food_id}-${item.food_name}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  opacity: skipped ? 0.55 : 1,
                  textDecoration: skipped ? 'line-through' : 'none',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: skipped ? 'var(--t-3)' : 'var(--t-1)' }}>{item.food_name}</span>
                <span style={{ fontSize: 12, color: 'var(--t-3)', fontWeight: 600 }}>{item.portion}× · {item.kcal} kcal</span>
              </div>
            )
          })}
        </div>
      )}

      {done && actualExtras.length > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--line)', margin: '10px 0 10px 34px' }} />
          <div style={{ display: 'grid', gap: 6, margin: '0 0 0 34px' }}>
            {actualExtras.map((item, idx) => (
              <div key={`extra-${item.name}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</span>
                <span style={{ fontSize: 12, color: 'var(--t-3)', fontWeight: 600 }}>{item.portion}× · {item.kcal} kcal</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <Button disabled={(items.length === 0 && !done) || saving} onClick={onConfirm} variant="secondary">
          {done ? 'Undo' : 'Ate as planned'}
        </Button>
        <Button onClick={onSwap} variant="ghost">
          {done ? 'Edit' : 'Customize'}
        </Button>
      </div>
    </Card>
  )
}

function WorkoutPlanTask({
  done,
  onConfirm,
  onDelete,
  plan,
  saving,
  setWorkoutKcal,
  totalWorkoutKcal,
  workouts,
  workoutKcal,
}: {
  done: boolean
  onConfirm: () => void
  onDelete: (log: WorkoutLog) => void
  plan: WorkoutPlan | null
  saving: boolean
  setWorkoutKcal: (value: string) => void
  totalWorkoutKcal: number
  workouts: WorkoutLog[]
  workoutKcal: string
}) {
  const meta = plan ? WORKOUT_PLAN_TYPES.find((type) => type.id === plan.type) : null
  const label = meta?.label ?? 'No workout planned'
  const plannedKcal = plan?.kcal_target ?? 0
  const isRest = plan?.type === 'rest'
  const hitTarget = done && totalWorkoutKcal >= plannedKcal
  const isComplete = done || isRest
  const greenBg = 'color-mix(in oklab, #BBF7D0 42%, transparent)'
  const yellowBg = 'color-mix(in oklab, #FEF3C7 52%, transparent)'
  const bg = isComplete ? (isRest || hitTarget ? greenBg : yellowBg) : undefined
  const sub = isRest
    ? 'Rest day'
    : done
      ? `${totalWorkoutKcal} / ${plannedKcal} kcal logged`
      : plan
        ? `${plannedKcal} kcal planned`
        : 'Plan from Calendar'

  return (
    <div style={{ background: bg, borderRadius: 'var(--r-md)', padding: '10px 0' }}>
      <Habit done={isComplete} label={label} sub={sub} />
      <div style={{ padding: '0 0 10px 38px' }}>
        {plan && plan.type !== 'rest' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: 8 }}>
            <input
              inputMode="numeric"
              onChange={(event) => setWorkoutKcal(event.target.value)}
              placeholder="kcal burned"
              style={{ background: 'var(--bg-soft)', border: 0, borderRadius: 'var(--r-md)', color: 'var(--t-1)', font: 'inherit', fontWeight: 800, outline: 'none', padding: '10px 12px', width: '100%' }}
              type="number"
              value={workoutKcal}
            />
            <button aria-label="Submit workout" disabled={saving || done} onClick={onConfirm} type="button" style={{ alignItems: 'center', background: 'var(--a-grad)', border: 0, borderRadius: 'var(--r-md)', color: '#fff', display: 'flex', justifyContent: 'center' }}>
              <Icon name="arrowUp" />
            </button>
          </div>
        ) : (
          <Button disabled={saving || done || plan?.type === 'rest'} onClick={onConfirm} variant="secondary">
            {plan ? 'Confirm workout' : 'Plan workout'}
          </Button>
        )}
        {workouts.length ? (
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {workouts.map((log) => (
              <div key={log.id} style={{ alignItems: 'center', display: 'grid', gap: 8, gridTemplateColumns: '1fr auto auto' }}>
                <span className={styles.rowSub}>{log.type.replace('_', ' ')}</span>
                <strong style={{ fontSize: 13 }}>{log.kcal_burned} kcal</strong>
                <button aria-label="Delete workout" onClick={() => onDelete(log)} type="button" style={{ background: 'transparent', border: 0, color: 'var(--t-3)', padding: 4 }}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function WaterTask({
  amount,
  done,
  logs,
  onAdd,
  onDelete,
  onSubmit,
  saving,
  totalMl,
}: {
  amount: number
  done: boolean
  logs: WaterLog[]
  onAdd: (ml: number) => void
  onDelete: (log: WaterLog) => void
  onSubmit: () => void
  saving: boolean
  totalMl: number
}) {
  return (
    <div style={{ background: done ? 'color-mix(in oklab, #BBF7D0 42%, transparent)' : undefined, borderRadius: 'var(--r-md)', padding: '10px 0' }}>
      <Habit done={done} label="Drink 3 L of water" sub={`${(totalMl / 1000).toFixed(1)} / 3.0 L`} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 44px', gap: 8, padding: '8px 0 10px 38px' }}>
        <button onClick={() => onAdd(50)} type="button" style={miniActionStyle}>+50</button>
        <button onClick={() => onAdd(100)} type="button" style={miniActionStyle}>+100</button>
        <div style={{ alignItems: 'center', background: 'var(--bg-soft)', borderRadius: 'var(--r-md)', display: 'flex', fontWeight: 900, justifyContent: 'center' }}>{amount}</div>
        <button aria-label="Submit water" disabled={saving || amount <= 0} onClick={onSubmit} type="button" style={{ ...sendButtonStyle, opacity: amount > 0 ? 1 : 0.45 }}>
          <Icon name="arrowUp" />
        </button>
      </div>
      {logs.length ? (
        <div style={{ display: 'grid', gap: 6, paddingLeft: 38 }}>
          {logs.map((log) => (
            <div key={log.id} style={{ alignItems: 'center', display: 'grid', gap: 8, gridTemplateColumns: '1fr auto auto' }}>
              <span className={styles.rowSub}>{log.time}</span>
              <strong style={{ fontSize: 13 }}>{log.ml} ml</strong>
              <button aria-label="Delete water" onClick={() => onDelete(log)} type="button" style={{ background: 'transparent', border: 0, color: 'var(--t-3)', padding: 4 }}>
                <Icon name="x" size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SleepTask({
  end,
  onEndChange,
  onSave,
  onStartChange,
  saving,
  start,
}: {
  end: string
  onEndChange: (value: string) => void
  onSave: () => void
  onStartChange: (value: string) => void
  saving: boolean
  start: string
}) {
  const durationMin = start && end ? calculateSleepDuration(start, end) : 0
  const ratio = durationMin / 480
  const done = ratio >= 1
  const highlight = durationMin > 0 ? getGoalHighlight(ratio) : undefined
  return (
    <div style={{ background: highlight, borderRadius: 'var(--r-md)', padding: '10px 0' }}>
      <Habit done={done} label="Sleep" sub={start && end ? `${start} - ${end}` : 'Start sleep - End sleep'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 38px', gap: 6, padding: '0 0 10px 34px' }}>
        <input aria-label="Start sleep" onChange={(event) => onStartChange(event.target.value)} style={timeInputStyle} type="time" value={start} />
        <input aria-label="End sleep" onChange={(event) => onEndChange(event.target.value)} style={timeInputStyle} type="time" value={end} />
        <button aria-label="Save sleep" disabled={saving} onClick={onSave} type="button" style={sendButtonStyle}>
          <Icon name="arrowUp" />
        </button>
      </div>
    </div>
  )
}

function WeightTask({
  done,
  onChange,
  onSave,
  saving,
  value,
}: {
  done: boolean
  onChange: (value: string) => void
  onSave: () => void
  saving: boolean
  value: string
}) {
  return (
    <div style={{ background: done ? 'color-mix(in oklab, #BBF7D0 42%, transparent)' : undefined, borderRadius: 'var(--r-md)', padding: '10px 0' }}>
      <Habit done={done} label="Weight" sub={done ? 'Logged for this day' : 'Enter today\'s weight'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 38px', gap: 6, padding: '0 0 10px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-soft)', borderRadius: 'var(--r-md)', padding: '0 12px' }}>
          <input
            aria-label="Weight"
            inputMode="decimal"
            type="text"
            value={value}
            onChange={(e) => {
              const raw = e.target.value
              if (/^\d*\.?\d*$/.test(raw)) onChange(raw)
            }}
            placeholder="0.0"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', font: 'inherit', fontSize: 14, fontWeight: 800, color: 'var(--t-1)' }}
          />
          <span className={styles.subtitle} style={{ fontSize: 12 }}>kg</span>
        </div>
        <button aria-label="Save weight" disabled={saving} onClick={onSave} type="button" style={sendButtonStyle}>
          <Icon name="arrowUp" />
        </button>
      </div>
    </div>
  )
}

const miniActionStyle = {
  background: 'var(--bg-soft)',
  border: 0,
  borderRadius: 'var(--r-md)',
  color: 'var(--t-1)',
  fontWeight: 900,
  padding: '10px 0',
}

const sendButtonStyle = {
  alignItems: 'center',
  background: 'var(--a-grad)',
  border: 0,
  borderRadius: 'var(--r-md)',
  color: '#fff',
  display: 'flex',
  justifyContent: 'center',
}

const timeInputStyle = {
  background: 'var(--bg-soft)',
  border: 0,
  borderRadius: 'var(--r-md)',
  color: 'var(--t-1)',
  font: 'inherit',
  fontSize: 12,
  fontWeight: 800,
  outline: 'none',
  padding: '8px 4px',
  width: '100%',
}

function getGoalHighlight(ratio: number): string {
  if (ratio >= 1) return 'color-mix(in oklab, #BBF7D0 42%, transparent)'
  if (ratio >= 0.7) return 'color-mix(in oklab, #FEF3C7 52%, transparent)'
  return 'color-mix(in oklab, #FECACA 48%, transparent)'
}

function calculateSleepDuration(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return 0
  let startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM
  if (endMinutes <= startMinutes) endMinutes += 24 * 60
  return endMinutes - startMinutes
}

function HomeErrorCard({ error }: { error: Error }) {
  return (
    <Card padding={18}>
      <strong>Couldn't load today</strong>
      <p className={styles.subtitle}>{error.message}</p>
      <Button onClick={() => window.location.reload()} variant="secondary">
        Retry
      </Button>
    </Card>
  )
}

function HomeSkeleton() {
  return (
    <>
      <Card raised padding={18} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
          <Skeleton width={80} height={14} variant="text" />
          <Skeleton width={60} height={14} variant="text" />
        </div>
        <Skeleton width={210} height={210} variant="circle" />
      </Card>

      <div className={styles.topStats} style={{ marginTop: 14 }}>
        <Card padding={14} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={28} height={28} variant="circle" />
          <Skeleton width="60%" height={20} variant="text" />
          <Skeleton width="40%" height={12} variant="text" />
          <Skeleton width="100%" height={6} radius="3px" />
        </Card>
        <Card padding={14} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={28} height={28} variant="circle" />
          <Skeleton width="60%" height={20} variant="text" />
          <Skeleton width="40%" height={12} variant="text" />
          <Skeleton width="100%" height={6} radius="3px" />
        </Card>
      </div>

      <div className={styles.sectionLabel} style={{ marginTop: 18, marginBottom: 8 }}>
        <Skeleton width={120} height={14} variant="text" />
      </div>
      <div className={styles.mealList} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width={32} height={32} variant="circle" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width="50%" height={16} variant="text" />
              <Skeleton width="80%" height={12} variant="text" />
            </div>
            <Skeleton width={16} height={16} variant="circle" />
          </Card>
        ))}
      </div>
    </>
  )
}

function SectionLabel({ action, children }: { action?: string; children: string }) {
  return (
    <div className={styles.sectionLabel}>
      <span className="dq-eyebrow">{children}</span>
      {action ? <span style={{ color: 'var(--a1)', fontSize: 12, fontWeight: 800 }}>{action}</span> : null}
    </div>
  )
}

function MiniStat({ icon, label, value, target, pct, color }: { icon: IconName; label: string; value: string; target: string; pct: number; color: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ color }}>
        <Icon name={icon} />
      </div>
      <div>
        <strong className="dq-num" style={{ fontSize: 22 }}>
          {value}
        </strong>{' '}
        <span className={styles.subtitle}>/ {target}</span>
      </div>
      <span className="dq-eyebrow">{label}</span>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ background: color, width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

function Habit({ done, label, sub }: { done: boolean; label: string; sub: string }) {
  return (
    <div className={styles.habitRow}>
      <span className="dq-check" data-on={done}>
        {done ? <Icon color="#fff" name="check" size={14} stroke={3} /> : null}
      </span>
      <span className={styles.rowText}>
        <strong>{label}</strong>
        <span className={styles.rowSub}>{sub}</span>
      </span>
    </div>
  )
}

function LogSheet() {
  const navigate = useNavigate()
  const items: Array<{ id: string; label: string; sub: string; icon: IconName; path: string }> = [
    { id: 'meal', label: 'Meal', sub: 'Preset - custom - recent', icon: 'fork', path: '/log/meal' },
    { id: 'water', label: 'Water', sub: '+250 ml - +500 ml', icon: 'drop', path: '/log/water' },
    { id: 'workout', label: 'Workout', sub: 'Incline walk - bodyweight', icon: 'walk', path: '/log/workout' },
    { id: 'weight', label: 'Weight', sub: 'Daily weigh-in', icon: 'trend', path: '/log/weight' },
    { id: 'sleep', label: 'Sleep', sub: 'Bedtime - wake - quality', icon: 'moon', path: '/log/sleep' },
  ]

  return (
    <>
      <button aria-label="Close log sheet" className={styles.sheetBackdrop} onClick={() => navigate('/')} type="button" />
      <div className={styles.sheet}>
        <div className={styles.sheetHandle} />
        <div className={styles.screenHeader}>
          <h2 className={styles.headerTitle} style={{ fontSize: 22 }}>
            Quick log
          </h2>
          <span className={styles.subtitle}>Today</span>
        </div>
        <div className={styles.sheetItems}>
          {items.map((item) => (
            <button className={styles.sheetItem} key={item.id} onClick={() => navigate(item.path)} type="button">
              <span className={styles.sheetIcon}>
                <Icon color="var(--a1)" name={item.icon} />
              </span>
              <span className={styles.rowText}>
                <strong>{item.label}</strong>
                <span className={styles.rowSub}>{item.sub}</span>
              </span>
              <Icon color="var(--t-3)" name="chevron" size={16} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Customize meal sheet — handles all 4 plan-vs-actual cases:
//  1) Ate exactly as planned       → leave defaults, Save
//  2) Ate partial plan + extras    → uncheck some + add extras
//  3) Ate plan fully + extras      → leave all checked + add extras
//  4) Ate completely off-plan      → uncheck all + add extras
// ─────────────────────────────────────────────────────────────

type CustomItem = {
  name: string
  portion: number
  unit: string
  kcalPer: number   // kcal at portion=1
  proteinPer: number
  sugarPer: number  // sugar grams at portion=1
  source: 'plan' | 'extra'
}

type CustomSavedItem = { name: string; portion: number; unit: string; kcal: number; protein_g: number; sugar_g: number }

function CustomizeMealSheet({
  mealType,
  plannedItems,
  existingItems,
  foods,
  saving,
  onSave,
  onCancel,
}: {
  mealType: MealType
  plannedItems: MealPlanItem[]
  existingItems: { name: string; portion: number; unit: string; kcal: number; protein_g: number; sugar_g: number }[]
  foods: Food[]
  saving: boolean
  onSave: (items: CustomSavedItem[]) => void
  onCancel: () => void
}) {
  useScrollLock()
  // In edit mode, prefer the logged portions for plan rows (so re-opening
  // shows what was actually eaten), falling back to the planned portion.
  const existingByName = new Map(existingItems.map((it) => [it.name, it]))
  // Initial state: always start with plan items as 'plan' rows. In edit mode,
  // additionally pull in any extras (logged items not matching any plan name).
  const [items, setItems] = useState<CustomItem[]>(() => {
    const planRows: CustomItem[] = plannedItems.map((it) => {
      const logged = existingByName.get(it.food_name)
      const portion = logged && existingItems.length > 0 ? logged.portion : it.portion
      return {
        name: it.food_name,
        portion,
        unit: 'serving',
        kcalPer: it.portion > 0 ? it.kcal / it.portion : it.kcal,
        proteinPer: it.portion > 0 ? it.protein_g / it.portion : it.protein_g,
        sugarPer: it.portion > 0 ? (it.sugar_g ?? 0) / it.portion : (it.sugar_g ?? 0),
        source: 'plan',
      }
    })
    if (existingItems.length === 0) return planRows
    const planNames = new Set(plannedItems.map((p) => p.food_name))
    const extraRows: CustomItem[] = existingItems
      .filter((it) => !planNames.has(it.name))
      .map((it) => ({
        name: it.name,
        portion: it.portion,
        unit: it.unit,
        kcalPer: it.portion > 0 ? it.kcal / it.portion : it.kcal,
        proteinPer: it.portion > 0 ? it.protein_g / it.portion : it.protein_g,
        sugarPer: it.portion > 0 ? (it.sugar_g ?? 0) / it.portion : (it.sugar_g ?? 0),
        source: 'extra',
      }))
    return [...planRows, ...extraRows]
  })
  // Plan-item inclusion: in new mode, all checked; in edit mode, only those
  // that were actually logged remain checked.
  const [includedPlanIds, setIncludedPlanIds] = useState<Set<string>>(() => {
    if (existingItems.length === 0) return new Set(plannedItems.map((it) => it.food_name))
    const existingNames = new Set(existingItems.map((it) => it.name))
    return new Set(plannedItems.filter((it) => existingNames.has(it.food_name)).map((it) => it.food_name))
  })
  const [category, setCategory] = useState<FoodCategory>('food')
  const [librarySearch, setLibrarySearch] = useState('')

  const filteredFoods = foods.filter((f) => {
    if (f.category !== category) return false
    const q = librarySearch.trim().toLowerCase()
    if (!q) return true
    return f.name.toLowerCase().includes(q)
  })

  // Build the actual list of items considering plan inclusions + extras
  const activeItems: CustomItem[] = items.filter((it) => it.source !== 'plan' || includedPlanIds.has(it.name))
  const totalKcal = activeItems.reduce((s, it) => s + Math.round(it.kcalPer * it.portion), 0)
  const totalSugar = Math.round(activeItems.reduce((s, it) => s + it.sugarPer * it.portion, 0))

  function togglePlan(name: string) {
    setIncludedPlanIds((cur) => {
      const next = new Set(cur)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    haptic(5)
  }

  function addFromLibrary(food: Food) {
    setItems((cur) => {
      if (cur.some((it) => it.name === food.name && it.source === 'extra')) return cur
      return [
        ...cur,
        {
          name: food.name,
          portion: 1,
          unit: food.portion_unit,
          kcalPer: food.kcal_per_portion,
          proteinPer: food.protein_g_per_portion,
          sugarPer: food.sugar_g_per_portion ?? 0,
          source: 'extra',
        },
      ]
    })
    haptic(5)
  }

  function changePortion(name: string, source: 'plan' | 'extra', delta: number) {
    setItems((cur) =>
      cur.map((it) =>
        it.name === name && it.source === source
          ? { ...it, portion: Math.max(0.25, Number((it.portion + delta).toFixed(2))) }
          : it,
      ),
    )
  }

  function removeExtra(name: string) {
    setItems((cur) => cur.filter((it) => !(it.name === name && it.source === 'extra')))
  }

  function handleSave() {
    if (activeItems.length === 0) {
      toast.error('Pick at least one item.')
      return
    }
    const finalItems: CustomSavedItem[] = activeItems.map((it) => ({
      name: it.name,
      portion: it.portion,
      unit: it.unit,
      kcal: Math.round(it.kcalPer * it.portion),
      protein_g: Math.round(it.proteinPer * it.portion * 10) / 10,
      sugar_g: Math.round(it.sugarPer * it.portion * 10) / 10,
    }))
    onSave(finalItems)
  }

  // Render via portal to document.body so the sheet escapes the
  // <Phone> wrapper's stacking context (`isolation: isolate` +
  // `overflow: hidden`) and ancestor `backdrop-filter` chains that can
  // turn `position: fixed` into a child-positioned element on iOS Safari
  // — both in browser tabs and in PWA standalone mode.
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100dvh',
        maxHeight: '100dvh',
        background: 'var(--bg)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
      }}
    >
      <header className={styles.screenHeader} style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px', margin: 0, borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <button className={styles.iconButton} onClick={onCancel} type="button"><Icon name="x" /></button>
        <strong style={{ textTransform: 'capitalize' }}>{mealType}</strong>
        <span style={{ width: 40 }} />
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px 24px' }}>
        {/* From plan — toggle include via the checkbox, adjust eaten amount
            via +/- (e.g. planned 1 scoop whey but you had 2). */}
        {items.some((it) => it.source === 'plan') && (
          <>
            <p className={styles.fieldLabel}>From plan</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {items.filter((it) => it.source === 'plan').map((it) => {
                const included = includedPlanIds.has(it.name)
                return (
                  <div
                    key={it.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: included ? 'color-mix(in oklab, #BBF7D0 38%, var(--surface))' : 'var(--surface)',
                      border: included ? '1px solid rgba(34,197,94,0.5)' : '1px solid var(--line)',
                      borderRadius: 'var(--r-md)',
                    }}
                  >
                    <button
                      aria-label={included ? 'Exclude' : 'Include'}
                      type="button"
                      onClick={() => togglePlan(it.name)}
                      style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', outline: 'none', display: 'flex' }}
                    >
                      <span className="dq-check" data-on={included}>
                        {included ? <Icon color="#fff" name="check" size={14} stroke={3} /> : null}
                      </span>
                    </button>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <strong style={{ fontSize: 14 }}>{it.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--t-2)', fontWeight: 600 }}>{Math.round(it.kcalPer * it.portion)} kcal</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-soft)', borderRadius: 999, padding: '2px 6px', opacity: included ? 1 : 0.4 }}>
                      <button type="button" disabled={!included} onClick={() => changePortion(it.name, 'plan', -0.25)} style={{ border: 0, background: 'transparent', cursor: included ? 'pointer' : 'default', padding: 2, fontSize: 13, color: 'var(--t-2)', outline: 'none' }}>−</button>
                      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{it.portion % 1 === 0 ? it.portion : it.portion.toFixed(2)}</span>
                      <button type="button" disabled={!included} onClick={() => changePortion(it.name, 'plan', 0.25)} style={{ border: 0, background: 'transparent', cursor: included ? 'pointer' : 'default', padding: 2, fontSize: 13, color: 'var(--t-2)', outline: 'none' }}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Extras */}
        {items.some((it) => it.source === 'extra') && (
          <>
            <p className={styles.fieldLabel}>Extras</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {items.filter((it) => it.source === 'extra').map((it) => (
                <div
                  key={it.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    background: 'color-mix(in oklab, var(--a-soft) 60%, var(--surface))',
                    border: '1px solid var(--a1)',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>{it.name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--t-2)', fontWeight: 600 }}>{Math.round(it.kcalPer * it.portion)} kcal</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-soft)', borderRadius: 999, padding: '2px 6px' }}>
                    <button type="button" onClick={() => changePortion(it.name, 'extra', -0.25)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2, fontSize: 13, color: 'var(--t-2)', outline: 'none' }}>−</button>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{it.portion % 1 === 0 ? it.portion : it.portion.toFixed(2)}</span>
                    <button type="button" onClick={() => changePortion(it.name, 'extra', 0.25)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2, fontSize: 13, color: 'var(--t-2)', outline: 'none' }}>+</button>
                  </div>
                  <button aria-label="Remove" onClick={() => removeExtra(it.name)} type="button" style={{ border: 0, background: 'transparent', color: 'var(--t-3)', cursor: 'pointer', padding: 4, outline: 'none' }}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Library picker */}
        <p className={styles.fieldLabel}>Add from library</p>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <span style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--t-3)', pointerEvents: 'none' }}>
            <Icon name="search" size={14} />
          </span>
          <input
            type="text"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder={`Search in ${FOOD_CATEGORIES.find((c) => c.id === category)?.label ?? 'category'}...`}
            style={{
              width: '100%',
              padding: '10px 34px 10px 32px',
              fontSize: 13,
              border: 0,
              background: 'var(--bg-soft)',
              borderRadius: 'var(--r-pill)',
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--t-1)',
              boxSizing: 'border-box',
            }}
          />
          {librarySearch ? (
            <button
              aria-label="Clear search"
              type="button"
              onClick={() => setLibrarySearch('')}
              style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', border: 0, background: 'transparent', color: 'var(--t-3)', cursor: 'pointer', padding: 4, outline: 'none', display: 'flex', alignItems: 'center' }}
            >
              <Icon name="x" size={12} />
            </button>
          ) : null}
        </div>
        <div className="dq-h-scroll" style={{ margin: '0 -20px 10px 0', paddingRight: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {FOOD_CATEGORIES.map((cat) => (
              <button
                className="dq-seg-item"
                data-active={category === cat.id}
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                type="button"
                style={{ border: 0, flex: '0 0 auto', padding: '6px 12px', fontSize: 12 }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredFoods.length === 0 ? (
            <p className={styles.subtitle}>
              {librarySearch ? `No match for "${librarySearch}" in this category.` : 'No foods in this category.'}
            </p>
          ) : (
            filteredFoods.map((food) => {
              const isAdded = items.some((it) => it.name === food.name && it.source === 'extra')
              return (
                <button
                  key={food.id}
                  disabled={isAdded}
                  onClick={() => addFromLibrary(food)}
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    width: '100%', textAlign: 'left',
                    cursor: isAdded ? 'default' : 'pointer',
                    outline: 'none',
                    opacity: isAdded ? 0.4 : 1,
                  }}
                >
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{food.name}</strong>
                    <span style={{ fontSize: 11, color: 'var(--t-3)', fontWeight: 600 }}>
                      {food.kcal_per_portion} kcal · P {food.protein_g_per_portion}g · S {food.sugar_g_per_portion ?? 0}g · per {food.portion_unit}
                    </span>
                  </span>
                  <Icon color={isAdded ? 'var(--success)' : 'var(--a1)'} name={isAdded ? 'check' : 'plus'} size={16} />
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Footer save */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
          background: 'var(--surface)',
          borderTop: '1px solid var(--line)',
          boxShadow: '0 -8px 24px rgba(15,23,42,0.08)',
        }}
      >
        <Button disabled={saving || activeItems.length === 0} onClick={handleSave}>
          {saving ? 'Saving...' : activeItems.length > 0 ? `Save ${activeItems.length} item${activeItems.length === 1 ? '' : 's'} · ${totalKcal} kcal · ${totalSugar}g sugar` : 'Select items to save'}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
