import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Ring, Skeleton, type IconName } from '@/components/primitives'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { useMealPlan } from '@/hooks/useMealPlan'
import { useMeals } from '@/hooks/useMeals'
import { useToday } from '@/hooks/useToday'
import { useUser } from '@/hooks/useUser'
import { useWater } from '@/hooks/useWater'
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan'
import { useWeights } from '@/hooks/useWeights'
import { useWorkouts } from '@/hooks/useWorkouts'
import { todayKey as getTodayKey } from '@/lib/dates'
import { WORKOUT_PLAN_TYPES, type MealLog, type MealPlanItem, type MealType, type UserSettings, type WorkoutPlan } from '@/types/domain'

type SlotIcon = 'sunrise' | 'sun' | 'moon' | 'sparkle'

const mealMeta: Record<MealType, { icon: SlotIcon; color: string }> = {
  breakfast: { icon: 'sunrise', color: '#FB923C' },
  lunch: { icon: 'sun', color: '#F59E0B' },
  dinner: { icon: 'moon', color: '#6366F1' },
  snack: { icon: 'sparkle', color: '#EC4899' },
}

export function HomeRoute() {
  const [params] = useSearchParams()
  const { profile, loading: userLoading, error: userError } = useUser()
  const { data: meals, add: addMeal, loading: mealsLoading, error: mealsError } = useMeals()
  const { data: today, loading: todayLoading, error: todayError } = useToday()
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
          <HomeFullContent addMeal={addMeal} meals={meals} settings={settings} today={today} />
        )}
      </div>
      {sheet ? <LogSheet /> : null}
    </AppScreen>
  )
}

function HomeFullContent({
  addMeal,
  meals,
  settings,
  today,
}: {
  addMeal: ReturnType<typeof useMeals>['add']
  meals: MealLog[]
  settings: UserSettings
  today: ReturnType<typeof useToday>['data']
}) {
  const navigate = useNavigate()
  const todayKey = getTodayKey()
  const { data: plan, error: planError } = useMealPlan(todayKey)
  const { data: workoutPlan, error: workoutPlanError } = useWorkoutPlan(todayKey)
  const { add: addWater, totalMl, error: waterError } = useWater(todayKey)
  const { data: weights, error: weightsError } = useWeights(30)
  const { data: workouts, add: addWorkout, error: workoutsError } = useWorkouts(1)
  const [savingTask, setSavingTask] = useState<string | null>(null)
  const latestWeight = weights[weights.length - 1]
  const todayWorkouts = workouts.filter((w) => w.date === todayKey)
  const totalWorkoutMin = todayWorkouts.reduce((sum, w) => sum + w.duration_min, 0)
  const workoutTarget = workoutPlan?.duration_min || 45
  const workoutPct = Math.min(totalWorkoutMin / workoutTarget, 1)

  // Compute totals live from meals[] (source of truth) — denormalized
  // today.totals can drift if a meal was deleted without decrementing.
  const liveKcal = meals.reduce((sum, m) => sum + (m.total_kcal ?? 0), 0)
  const liveProtein = meals.reduce((sum, m) => sum + (m.total_protein_g ?? 0), 0)

  useEffect(() => {
    if (weightsError || workoutsError || planError || workoutPlanError || waterError) toast.error("Couldn't load home plan. Try again.")
  }, [weightsError, workoutsError, planError, workoutPlanError, waterError])

  async function confirmMeal(mealType: MealType, items: MealPlanItem[]) {
    if (items.length === 0 || savingTask) return
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
    if (savingTask) return
    setSavingTask('water')
    try {
      await addWater(500)
      toast.success('Water confirmed +500 ml')
      haptic(5)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't confirm water.")
    } finally {
      setSavingTask(null)
    }
  }

  async function confirmWorkout(planToLog: WorkoutPlan) {
    if (savingTask) return
    const input = prompt('How many kcal did you burn?', '0')
    if (input === null) return
    const kcal = Number(input)
    if (!Number.isFinite(kcal) || kcal < 0 || kcal > 3000) {
      toast.error('Enter kcal between 0 and 3000.')
      return
    }
    setSavingTask('workout')
    try {
      await addWorkout({
        date: todayKey,
        type: planToLog.type === 'rest' ? 'other' : planToLog.type,
        duration_min: planToLog.duration_min,
        kcal_burned: Math.round(kcal),
      })
      toast.success('Workout confirmed')
      haptic(10)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't confirm workout.")
    } finally {
      setSavingTask(null)
    }
  }

  return (
    <>
      <Card raised padding={18}>
        <div className={styles.screenHeader}>
          <span className="dq-eyebrow">Today</span>
          <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 800 }}>
            {Math.max(settings.daily_kcal_target - liveKcal, 0)} kcal left
          </span>
        </div>
        <Ring eaten={liveKcal} protein={liveProtein} proteinTarget={settings.daily_protein_target} size={210} target={settings.daily_kcal_target} />
      </Card>

      <div className={styles.topStats}>
        <MiniStat color="#0EA5E9" icon="drop" label="Water" pct={Math.min(totalMl / 3000, 1)} target="3.0 L" value={(totalMl / 1000).toFixed(1)} />
        <MiniStat color="#10B981" icon="walk" label="Incline" pct={workoutPct} target={`${workoutTarget} min`} value={String(totalWorkoutMin)} />
      </div>

      <SectionLabel>Today's plan</SectionLabel>
      {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
        <PlanMealCard
          done={meals.some((meal) => meal.meal_type === type)}
          items={plan[type]}
          key={type}
          mealType={type}
          onConfirm={() => void confirmMeal(type, plan[type])}
          onSwap={() => navigate('/log/meal')}
          saving={savingTask === type}
        />
      ))}

      <SectionLabel>Daily habits</SectionLabel>
      <div className={styles.habitBox}>
        <Habit done={today.habits.water_done || totalMl >= 3000} label="Drink 3 L of water" sub={`${(totalMl / 1000).toFixed(1)} / 3.0 L`} />
        <div style={{ padding: '0 0 10px 38px' }}>
          <Button disabled={savingTask === 'water'} onClick={() => void confirmWater()} variant="secondary">
            Confirm +500 ml
          </Button>
        </div>
        <div className="dq-divider" />
        <WorkoutPlanTask
          done={todayWorkouts.length > 0}
          onConfirm={() => workoutPlan ? void confirmWorkout(workoutPlan) : navigate('/plan')}
          plan={workoutPlan}
          saving={savingTask === 'workout'}
          totalWorkoutMin={totalWorkoutMin}
        />
        <div className="dq-divider" />
        <Habit done={today.habits.sleep_on_time} label="Sleep by 22:30" sub="goal - 7.5 hrs" />
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
  mealType,
  onConfirm,
  onSwap,
  saving,
}: {
  done: boolean
  items: MealPlanItem[]
  mealType: MealType
  onConfirm: () => void
  onSwap: () => void
  saving: boolean
}) {
  const kcal = items.reduce((sum, item) => sum + item.kcal, 0)
  const protein = Math.round(items.reduce((sum, item) => sum + item.protein_g, 0) * 10) / 10

  return (
    <Card padding={14} style={{ marginBottom: 10 }}>
      <div className={styles.habitRow}>
        <Icon color={mealMeta[mealType].color} name={mealMeta[mealType].icon} />
        <span className={styles.rowText}>
          <strong style={{ textTransform: 'capitalize' }}>{mealType}</strong>
          <span className={styles.rowSub}>{items.length ? `${kcal} kcal - ${protein}g protein` : 'No planned menu'}</span>
        </span>
        <span className="dq-check" data-on={done}>
          {done ? <Icon color="#fff" name="check" size={14} stroke={3} /> : null}
        </span>
      </div>
      {items.length ? (
        <div style={{ display: 'grid', gap: 6, margin: '10px 0 12px 34px' }}>
          {items.map((item) => (
            <div key={`${item.food_id}-${item.food_name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{item.food_name}</span>
              <span className={styles.rowSub}>{item.portion}x · {item.kcal} kcal</span>
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Button disabled={done || items.length === 0 || saving} onClick={onConfirm} variant="secondary">
          {done ? 'Confirmed' : 'Ate as planned'}
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
  plan,
  saving,
  totalWorkoutMin,
}: {
  done: boolean
  onConfirm: () => void
  plan: WorkoutPlan | null
  saving: boolean
  totalWorkoutMin: number
}) {
  const meta = plan ? WORKOUT_PLAN_TYPES.find((type) => type.id === plan.type) : null
  const label = meta?.label ?? 'No workout planned'
  const sub = done
    ? `${totalWorkoutMin} min logged`
    : plan
      ? plan.type === 'rest'
        ? 'Rest day'
        : `${plan.duration_min} min planned`
      : 'Plan from Calendar'

  return (
    <>
      <Habit done={done || plan?.type === 'rest'} label={label} sub={sub} />
      <div style={{ padding: '0 0 10px 38px' }}>
        <Button disabled={saving || done || plan?.type === 'rest'} onClick={onConfirm} variant="secondary">
          {plan ? 'Confirm workout' : 'Plan workout'}
        </Button>
      </div>
    </>
  )
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
