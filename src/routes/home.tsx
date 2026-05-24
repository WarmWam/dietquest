import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Ring, Skeleton, type IconName } from '@/components/primitives'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { useMealPlan } from '@/hooks/useMealPlan'
import { useMeals } from '@/hooks/useMeals'
import { useSleep } from '@/hooks/useSleep'
import { useToday } from '@/hooks/useToday'
import { useUser } from '@/hooks/useUser'
import { useWater } from '@/hooks/useWater'
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan'
import { useWeights } from '@/hooks/useWeights'
import { useWorkouts } from '@/hooks/useWorkouts'
import { todayKey as getTodayKey } from '@/lib/dates'
import { WORKOUT_PLAN_TYPES, type MealLog, type MealPlanItem, type MealType, type UserSettings, type WaterLog, type WorkoutLog, type WorkoutPlan } from '@/types/domain'

type SlotIcon = 'sunrise' | 'sun' | 'moon' | 'snack'

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
  const { data: today, loading: todayLoading, error: todayError } = useToday(selectedDate)
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
          <HomeFullContent addMeal={addMeal} meals={meals} removeMeal={removeMeal} selectedDate={selectedDate} setSelectedDate={setSelectedDate} settings={settings} today={today} />
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
  today,
}: {
  addMeal: ReturnType<typeof useMeals>['add']
  meals: MealLog[]
  removeMeal: ReturnType<typeof useMeals>['remove']
  selectedDate: string
  setSelectedDate: (date: string) => void
  settings: UserSettings
  today: ReturnType<typeof useToday>['data']
}) {
  const navigate = useNavigate()
  const todayKey = selectedDate
  const isToday = selectedDate === getTodayKey()
  const { data: plan, error: planError } = useMealPlan(selectedDate)
  const { data: workoutPlan, error: workoutPlanError } = useWorkoutPlan(selectedDate)
  const { data: waterLogs, add: addWater, remove: removeWater, totalMl, error: waterError } = useWater(selectedDate)
  const { data: sleep, upsert: upsertSleep, error: sleepError } = useSleep(selectedDate)
  const { data: weights, error: weightsError } = useWeights(30)
  const { data: workouts, add: addWorkout, remove: removeWorkout, error: workoutsError } = useWorkouts(1)
  const [savingTask, setSavingTask] = useState<string | null>(null)
  const [waterAmount, setWaterAmount] = useState(0)
  const [sleepStart, setSleepStart] = useState(sleep?.bedtime ?? '')
  const [sleepEnd, setSleepEnd] = useState(sleep?.wake_time ?? '')
  const [workoutKcal, setWorkoutKcal] = useState('')
  const latestWeight = weights[weights.length - 1]
  const todayWorkouts = workouts.filter((w) => w.date === todayKey)
  const totalWorkoutKcal = todayWorkouts.reduce((sum, w) => sum + w.kcal_burned, 0)
  const workoutTarget = workoutPlan?.kcal_target ?? 0
  const workoutPct = Math.min(totalWorkoutKcal / Math.max(workoutTarget || 1, 1), 1)

  // Compute totals live from meals[] (source of truth) — denormalized
  // today.totals can drift if a meal was deleted without decrementing.
  const liveKcal = meals.reduce((sum, m) => sum + (m.total_kcal ?? 0), 0)
  const liveProtein = meals.reduce((sum, m) => sum + (m.total_protein_g ?? 0), 0)

  useEffect(() => {
    if (sleep) {
      setSleepStart(sleep.bedtime)
      setSleepEnd(sleep.wake_time)
    }
  }, [sleep])

  useEffect(() => {
    if (weightsError || workoutsError || planError || workoutPlanError || waterError || sleepError) toast.error("Couldn't load home plan. Try again.")
  }, [weightsError, workoutsError, planError, workoutPlanError, waterError, sleepError])

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
        })),
        total_kcal: items.reduce((sum, item) => sum + item.kcal, 0),
        total_protein_g: Math.round(items.reduce((sum, item) => sum + item.protein_g, 0) * 10) / 10,
        total_carb_g: 0,
        total_fat_g: 0,
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
            <span className="dq-eyebrow">Today</span>
            <label aria-label="Pick date" htmlFor="today-date-picker" style={{ color: 'var(--a1)', cursor: 'pointer', display: 'inline-flex', position: 'relative' }}>
              <Icon name="cal" size={17} />
              <input
                id="today-date-picker"
                onChange={(event) => setSelectedDate(event.target.value || getTodayKey())}
                style={{ cursor: 'pointer', inset: 0, opacity: 0, position: 'absolute', width: 28 }}
                type="date"
                value={selectedDate}
              />
            </label>
          </span>
          <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 800 }}>
            {Math.max(settings.daily_kcal_target - liveKcal, 0)} kcal left
          </span>
        </div>
        <Ring eaten={liveKcal} protein={liveProtein} proteinTarget={settings.daily_protein_target} size={210} target={settings.daily_kcal_target} />
      </Card>
      {!isToday ? (
        <Button onClick={() => setSelectedDate(getTodayKey())} variant="ghost">
          Back to today
        </Button>
      ) : null}

      <div className={styles.topStats}>
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
            onSwap={() => navigate(`/log/meal?meal=${type}`)}
            saving={savingTask === type}
          />
        )
      })}

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
          done={today.habits.sleep_on_time}
          end={sleepEnd}
          onEndChange={setSleepEnd}
          onSave={() => void saveSleep()}
          onStartChange={setSleepStart}
          saving={savingTask === 'sleep'}
          start={sleepStart}
        />
      </div>

      {latestWeight ? (
        <>
          <div style={{ height: 14 }} />
          <Card padding={14}>
            <div className={styles.habitRow}>
              <div className={styles.statIcon}>
                <Icon color="var(--success)" name="trend" />
              </div>
              <div className={styles.rowText}>
                <p className="dq-eyebrow">Weight</p>
                <strong className="dq-num" style={{ fontSize: 20 }}>
                  {latestWeight.weight_kg.toFixed(1)} kg
                </strong>
              </div>
              <Button onClick={() => navigate('/log/weight')} variant="secondary">
                Log
              </Button>
            </div>
          </Card>
        </>
      ) : null}
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
  const protein = Math.round(items.reduce((sum, item) => sum + item.protein_g, 0) * 10) / 10
  const actualItems = loggedMeals.flatMap((meal) => meal.items)
  const actualNames = new Set(actualItems.map((item) => item.name))
  const actualKcal = loggedMeals.reduce((sum, meal) => sum + meal.total_kcal, 0)
  const actualProtein = Math.round(loggedMeals.reduce((sum, meal) => sum + meal.total_protein_g, 0) * 10) / 10
  const ateDifferent = done && items.length > 0 && !items.every((item) => actualNames.has(item.food_name))
  const overPlan = done && actualKcal > kcal
  const displayKcal = done ? actualKcal : kcal
  const displayProtein = done ? actualProtein : protein

  return (
    <Card
      padding={14}
      style={{
        background: done ? (overPlan ? 'color-mix(in oklab, #FEF3C7 58%, var(--surface))' : 'color-mix(in oklab, #BBF7D0 48%, var(--surface))') : undefined,
        borderColor: done ? (overPlan ? 'rgba(245, 158, 11, 0.42)' : 'rgba(34, 197, 94, 0.36)') : undefined,
        marginBottom: 10,
      }}
    >
      <div className={styles.habitRow}>
        <Icon color={mealMeta[mealType].color} name={mealMeta[mealType].icon} />
        <span className={styles.rowText}>
          <strong>{done ? `${displayKcal} kcal actual` : items.length ? `${displayKcal} kcal` : 'No planned menu'}</strong>
          <span className={styles.rowSub} style={{ marginTop: 4 }}>
            {done ? `${displayProtein}g protein actual${items.length ? ` - planned ${kcal} kcal` : ''}` : items.length ? `${displayProtein}g protein planned` : 'Use Ate different to log this slot'}
          </span>
        </span>
        <span className="dq-check" data-on={done}>
          {done ? <Icon color="#fff" name="check" size={14} stroke={3} /> : null}
        </span>
      </div>
      {items.length ? (
        <div style={{ display: 'grid', gap: 6, margin: '10px 0 12px 34px' }}>
          {items.map((item) => (
            <div key={`${item.food_id}-${item.food_name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, textDecoration: ateDifferent ? 'line-through' : undefined, color: ateDifferent ? 'var(--t-3)' : undefined }}>{item.food_name}</span>
              <span className={styles.rowSub}>{item.portion}x · {item.kcal} kcal</span>
            </div>
          ))}
        </div>
      ) : null}
      {ateDifferent ? (
        <p className={styles.subtitle} style={{ margin: '0 0 12px 34px' }}>
          Actual: {actualItems.map((item) => `${item.name} (${item.kcal} kcal)`).join(', ')}
        </p>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Button disabled={(items.length === 0 && !done) || saving} onClick={onConfirm} variant="secondary">
          {done ? 'Undo' : 'Ate as planned'}
        </Button>
        <Button onClick={onSwap} variant="ghost">
          Ate different
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
  const hitTarget = done && totalWorkoutKcal >= plannedKcal
  const sub = done
    ? `${totalWorkoutKcal} / ${plannedKcal} kcal logged`
    : plan
      ? plan.type === 'rest'
        ? 'Rest day'
        : `${plannedKcal} kcal planned`
      : 'Plan from Calendar'

  return (
    <div style={{ background: done ? (hitTarget ? 'color-mix(in oklab, #BBF7D0 42%, transparent)' : 'color-mix(in oklab, #FEF3C7 52%, transparent)') : undefined, borderRadius: 'var(--r-md)', padding: '10px 0' }}>
      <Habit done={done || plan?.type === 'rest'} label={label} sub={sub} />
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
  done,
  end,
  onEndChange,
  onSave,
  onStartChange,
  saving,
  start,
}: {
  done: boolean
  end: string
  onEndChange: (value: string) => void
  onSave: () => void
  onStartChange: (value: string) => void
  saving: boolean
  start: string
}) {
  return (
    <>
      <Habit done={done} label="Sleep" sub={start && end ? `${start} - ${end}` : 'Start sleep - End sleep'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 38px', gap: 6, padding: '0 0 10px 34px' }}>
        <input aria-label="Start sleep" onChange={(event) => onStartChange(event.target.value)} style={timeInputStyle} type="time" value={start} />
        <input aria-label="End sleep" onChange={(event) => onEndChange(event.target.value)} style={timeInputStyle} type="time" value={end} />
        <button aria-label="Save sleep" disabled={saving} onClick={onSave} type="button" style={sendButtonStyle}>
          <Icon name="arrowUp" />
        </button>
      </div>
    </>
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
