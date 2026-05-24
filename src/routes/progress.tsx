import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Card, Icon, Skeleton, type IconName } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { todayKey, daysAgoKey } from '@/lib/dates'
import { useDayTotals } from '@/hooks/useDayTotals'
import { useMeals } from '@/hooks/useMeals'
import { useUser } from '@/hooks/useUser'
import { useWeights } from '@/hooks/useWeights'
import { useMonthWorkoutPlans } from '@/hooks/useWorkoutPlan'
import { useWorkouts } from '@/hooks/useWorkouts'
import { toast } from '@/stores/toastStore'
import type { MealType, WorkoutLog, WorkoutPlan, WorkoutPlanType } from '@/types/domain'

type MealSlotIcon = 'sunrise' | 'sun' | 'moon' | 'snack'
const MEAL_META: Record<MealType, { icon: MealSlotIcon; color: string }> = {
  breakfast: { icon: 'sunrise', color: '#FB923C' },
  lunch: { icon: 'sun', color: '#F59E0B' },
  dinner: { icon: 'moon', color: '#6366F1' },
  snack: { icon: 'snack', color: '#EC4899' },
}

type ProgressTab = 'weight' | 'kcal' | 'activity'
type CalorieView = 'week' | 'month' | 'year'

const tabs: Array<{ id: ProgressTab; label: string }> = [
  { id: 'weight', label: 'Weight' },
  { id: 'kcal', label: 'Calories' },
  { id: 'activity', label: 'Activity' },
]

const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ProgressRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const requestedTab = params.get('tab') as ProgressTab | null
  const tab = requestedTab === 'kcal' || requestedTab === 'activity' ? requestedTab : 'weight'

  return (
    <AppScreen activeNav="progress">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <div style={{ margin: '14px 0 18px' }}>
          <div className={styles.tabRow}>
            {tabs.map((item) => (
              <button className="dq-seg-item" data-active={tab === item.id} key={item.id} onClick={() => navigate(`/progress?tab=${item.id}`)} type="button" style={{ flex: 1, justifyContent: 'center', border: 0 }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {tab === 'kcal' ? <CaloriesTab /> : tab === 'activity' ? <ActivityTab /> : <WeightTab />}
      </div>
    </AppScreen>
  )
}

function WeightTab() {
  const { profile, error: userError } = useUser()
  const { data: weights, loading, error: weightsError } = useWeights(60)
  const userProfile = profile?.profile ?? DEFAULT_PROFILE
  const points = weights.slice(-20)
  const latest = points[points.length - 1]
  const startWeight = userProfile.weight_start_kg
  const currentWeight = latest?.weight_kg ?? startWeight
  const min = Math.min(userProfile.weight_target_kg, ...points.map((point) => point.weight_kg), startWeight) - 0.5
  const max = Math.max(...points.map((point) => point.weight_kg), startWeight) + 0.5
  const path = points.length > 1
    ? points
        .map((point, index) => {
          const x = (index / (points.length - 1)) * 350
          const y = 180 - ((point.weight_kg - min) / (max - min)) * 150 - 12
          return `${index === 0 ? 'M' : 'L'}${x},${y}`
        })
        .join(' ')
    : ''
  const lost = Number((currentWeight - startWeight).toFixed(1))
  const toTarget = Number((currentWeight - userProfile.weight_target_kg).toFixed(1))

  useEffect(() => {
    if (userError || weightsError) toast.error("Couldn't load weight progress. Try again.")
  }, [userError, weightsError])

  if (loading) {
    return (
      <>
        <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className={styles.screenHeader}>
            <div>
              <Skeleton width={80} height={14} variant="text" />
              <Skeleton width={140} height={38} variant="text" style={{ marginTop: 6 }} />
            </div>
            <Skeleton width={70} height={24} radius="var(--r-pill)" />
          </div>
          <Skeleton width="100%" height={140} />
        </div>
        <div className={styles.metricGrid} style={{ marginTop: 14 }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width={40} height={12} variant="text" />
              <Skeleton width={70} height={24} variant="text" />
            </Card>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <div className={styles.chartCard}>
        <div className={styles.screenHeader}>
          <div>
            <p className="dq-eyebrow">Current</p>
            <strong className="dq-num" style={{ fontSize: 48 }}>
              {currentWeight.toFixed(1)} kg
            </strong>
          </div>
          <span className="dq-pill" style={{ color: 'var(--success)' }}>
            <Icon name="arrowDown" size={12} /> {Math.abs(lost).toFixed(1)} kg
          </span>
        </div>
        {path ? (
          <svg height="190" viewBox="0 0 350 190" width="100%">
            <path d={`${path} L350,190 L0,190 Z`} fill="var(--a-soft)" />
            <path d={path} fill="none" stroke="var(--a1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          </svg>
        ) : (
          <p className={styles.subtitle}>Log weight to draw your trend line.</p>
        )}
      </div>
      <div className={styles.metricGrid}>
        <Metric label="Start" value={`${startWeight.toFixed(1)} kg`} />
        <Metric label="Now" value={`${currentWeight.toFixed(1)} kg`} />
        <Metric label="Lost" value={`${lost.toFixed(1)} kg`} />
        <Metric label="To target" value={`${toTarget.toFixed(1)} kg`} />
      </div>
    </>
  )
}

function CaloriesTab() {
  const [view, setView] = useState<CalorieView>('week')
  const { data: meals, error: mealsError } = useMeals()
  const { data: yearTotals, error: totalsError } = useDayTotals(365)
  const { profile } = useUser()
  const dailyTarget = profile?.settings?.daily_kcal_target ?? 1950

  // Live sum from meals[] (source of truth) — denormalized day totals
  // can drift if a meal was deleted without decrementing.
  const liveKcal = meals.reduce((sum, m) => sum + (m.total_kcal ?? 0), 0)
  const liveProtein = meals.reduce((sum, m) => sum + (m.total_protein_g ?? 0), 0)

  const todayDate = todayKey()
  const totals = yearTotals.map((t) => t.date === todayDate ? { ...t, totals: { ...t.totals, kcal: liveKcal, protein_g: liveProtein } } : t)
  const bars = buildCalorieBars(totals, view)
  const maxKcal = Math.max(...bars.map((bar) => bar.kcal), dailyTarget, 1)

  useEffect(() => {
    if (mealsError || totalsError) toast.error("Couldn't load calorie progress. Try again.")
  }, [mealsError, totalsError])

  return (
    <>
      <div className={styles.chartCard}>
        <p className="dq-eyebrow">Today</p>
        <strong className="dq-num" style={{ fontSize: 42 }}>
          {liveKcal}
        </strong>
        <p className={styles.subtitle}>{liveProtein}g protein logged</p>
        <div className="dq-seg" style={{ width: '100%', margin: '14px 0 6px' }}>
          {(['week', 'month', 'year'] as CalorieView[]).map((item) => (
            <button
              className="dq-seg-item"
              data-active={view === item}
              key={item}
              onClick={() => setView(item)}
              type="button"
              style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none', textTransform: 'capitalize' }}
            >
              {item}
            </button>
          ))}
        </div>
        <div
          className={styles.bars}
          style={view === 'year' ? { overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', justifyContent: 'flex-start', gap: 10, paddingBottom: 4 } : undefined}
        >
          {bars.map((bar, index) => {
            const isToday = bar.date === todayDate
            const height = Math.max((bar.kcal / maxKcal) * 100, bar.kcal > 0 ? 8 : 3)
            const zone = barZoneColor(bar.kcal, dailyTarget)
            return (
              <div
                className={styles.barColumn}
                key={`${bar.label}-${index}`}
                style={{
                  height: '100%',
                  minWidth: view === 'year' ? 26 : undefined,
                  flex: view === 'year' ? '0 0 auto' : undefined,
                }}
              >
                <span style={{ color: bar.kcal > 0 ? zone.number : 'var(--t-3)', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>
                  {formatKcalLabel(bar.kcal)}
                </span>
                <div
                  className={styles.bar}
                  style={{
                    background: bar.kcal > 0 ? zone.stroke : 'var(--bg-soft)',
                    height: `${height}%`,
                    outline: isToday ? '2px solid var(--a1)' : 'none',
                    outlineOffset: isToday ? 1 : 0,
                  }}
                />
                <span className="dq-eyebrow" style={{ fontSize: view === 'year' ? 9 : undefined }}>{bar.label}</span>
              </div>
            )
          })}
        </div>
      </div>
      <p className="dq-eyebrow" style={{ margin: '4px 4px 10px' }}>Meals today</p>
      {meals.length === 0 ? (
        <Card padding={16}>
          <p className={styles.subtitle}>No meals logged yet.</p>
        </Card>
      ) : (
        (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
          const slotMeals = meals.filter((m) => m.meal_type === type)
          if (slotMeals.length === 0) return null
          const slotItems = slotMeals.flatMap((m) => m.items)
          const slotKcal = slotMeals.reduce((s, m) => s + m.total_kcal, 0)
          const meta = MEAL_META[type]
          return (
            <Card key={type} padding={14} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon color={meta.color} name={meta.icon as IconName} size={22} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{slotKcal} kcal</span>
              </div>
              <div style={{ display: 'grid', gap: 6, margin: '10px 0 0 34px' }}>
                {slotItems.map((it, idx) => (
                  <div key={`${type}-${idx}-${it.name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{it.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--t-3)', fontWeight: 600 }}>{it.portion}× · {it.kcal} kcal</span>
                  </div>
                ))}
              </div>
            </Card>
          )
        })
      )}
    </>
  )
}

function buildCalorieBars(totals: ReturnType<typeof useDayTotals>['data'], view: CalorieView) {
  if (view === 'week') {
    // Always render 7 days (rolling) — fill missing days with 0 so the
    // chart shows immediately even before useDayTotals returns data.
    const totalsMap = new Map(totals.map((t) => [t.date, t.totals.kcal]))
    const out: { date: string; label: string; kcal: number }[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      out.push({ date: key, label: DAY_SHORT[d.getDay()], kcal: totalsMap.get(key) ?? 0 })
    }
    return out
  }

  if (view === 'month') {
    // 4 weekly buckets, each showing AVERAGE kcal/day over logged days.
    const totalsMap = new Map(totals.map((t) => [t.date, t.totals.kcal]))
    const today = new Date()
    return Array.from({ length: 4 }, (_, index) => {
      const weekStart = (3 - index) * 7 + 6 // days ago at start of bucket
      let sum = 0
      let count = 0
      let lastDate = ''
      for (let d = 0; d < 7; d++) {
        const offset = weekStart - d
        const dt = new Date(today)
        dt.setDate(today.getDate() - offset)
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        lastDate = key
        const v = totalsMap.get(key) ?? 0
        if (v > 0) {
          sum += v
          count += 1
        }
      }
      return {
        date: lastDate,
        label: `W${index + 1}`,
        kcal: count > 0 ? Math.round(sum / count) : 0,
      }
    })
  }

  // Year: always show 12 rolling months, AVERAGE kcal/day per month.
  const today = new Date()
  const monthBuckets = new Map<string, { sum: number; count: number; label: string; date: string }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    monthBuckets.set(key, { sum: 0, count: 0, label: MONTH_SHORT[d.getMonth()], date: key })
  }
  totals.forEach((t) => {
    const date = new Date(`${t.date}T00:00:00`)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const bucket = monthBuckets.get(key)
    if (!bucket) return
    if (t.totals.kcal > 0) {
      bucket.sum += t.totals.kcal
      bucket.count += 1
    }
  })
  return Array.from(monthBuckets.values()).map((b) => ({
    date: b.date,
    label: b.label,
    kcal: b.count > 0 ? Math.round(b.sum / b.count) : 0,
  }))
}

function formatKcalLabel(kcal: number): string {
  if (kcal <= 0) return '0'
  return Math.round(kcal).toLocaleString()
}

// Same zone rules as the calorie ring: < 70% green, 70–99% yellow, ≥ 100% red.
const BAR_STROKE = { green: '#86EFAC', yellow: '#FCD34D', red: '#FCA5A5' }
const BAR_NUMBER = { green: '#16A34A', yellow: '#D97706', red: '#DC2626' }
function barZoneColor(kcal: number, target: number): { stroke: string; number: string } {
  if (target <= 0) return { stroke: BAR_STROKE.green, number: BAR_NUMBER.green }
  const pct = kcal / target
  if (pct >= 1) return { stroke: BAR_STROKE.red, number: BAR_NUMBER.red }
  if (pct >= 0.7) return { stroke: BAR_STROKE.yellow, number: BAR_NUMBER.yellow }
  return { stroke: BAR_STROKE.green, number: BAR_NUMBER.green }
}

function ActivityTab() {
  const { data: workouts, error: workoutsError } = useWorkouts(90)
  const monthKeys = getRecentMonthKeys(4)
  const month0 = useMonthWorkoutPlans(monthKeys[0])
  const month1 = useMonthWorkoutPlans(monthKeys[1])
  const month2 = useMonthWorkoutPlans(monthKeys[2])
  const month3 = useMonthWorkoutPlans(monthKeys[3])
  const activityWorkouts = workouts.filter((workout) => workout.kcal_burned >= 20)
  const workoutPlans = [month0.data, month1.data, month2.data, month3.data]
    .flat()
    .filter((plan) => plan.date >= daysAgoKey(90) && plan.type !== 'rest')
  const planByDate = new Map(workoutPlans.map((plan) => [plan.date, plan]))
  const actualKcalByDate = groupWorkoutKcalByDate(activityWorkouts)
  const workoutsByDate = groupWorkoutsByDate(activityWorkouts)
  const activityDateKeys = new Set([...workoutPlans.map((plan) => plan.date), ...activityWorkouts.map((workout) => workout.date)])
  const typeStats = buildActivityTypeStats(activityDateKeys, planByDate, workoutsByDate)
  const bestKcal = Math.max(...Array.from(actualKcalByDate.values()), 0)

  // Build heatmap: 13 weeks × 7 days = 91 cells representing last 91 days
  const today = new Date()
  const planError = month0.error || month1.error || month2.error || month3.error

  useEffect(() => {
    if (workoutsError || planError) toast.error("Couldn't load activity progress. Try again.")
  }, [workoutsError, planError])

  return (
    <>
      <div className={styles.chartCard}>
        <div className={styles.screenHeader}>
          <div>
            <p className="dq-eyebrow">Last 90 days</p>
            <strong className="dq-num" style={{ fontSize: 42 }}>
              {activityWorkouts.length} sessions
            </strong>
          </div>
          <Icon color="#F97316" fill="#F97316" name="flame" size={34} />
        </div>
        <div className={styles.heatmap}>
          {Array.from({ length: 13 }, (_, week) => (
            <div className={styles.heatCol} key={week}>
              {Array.from({ length: 7 }, (_, day) => {
                const dayOffset = (12 - week) * 7 + (6 - day)
                const cellDate = new Date(today)
                cellDate.setDate(cellDate.getDate() - dayOffset)
                const cellKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`
                const cellStyle = getActivityCellStyle(planByDate.get(cellKey), actualKcalByDate.get(cellKey) ?? 0)
                return <span className={styles.heatCell} key={day} style={cellStyle} />
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.metricGrid}>
        <Metric label="Incline days" value={formatActivityDays(typeStats.incline_walk, typeStats.total)} />
        <Metric label="Bodyweight" value={formatActivityDays(typeStats.bodyweight, typeStats.total)} />
        <Metric label="Other" value={formatActivityDays(typeStats.other, typeStats.total)} />
        <Metric label="Best kcal" value={bestKcal ? `${bestKcal}` : '0'} />
      </div>
    </>
  )
}

function getRecentMonthKeys(count: number): string[] {
  const today = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

function groupWorkoutKcalByDate(workouts: WorkoutLog[]): Map<string, number> {
  const out = new Map<string, number>()
  workouts.forEach((workout) => {
    out.set(workout.date, (out.get(workout.date) ?? 0) + workout.kcal_burned)
  })
  return out
}

function groupWorkoutsByDate(workouts: WorkoutLog[]): Map<string, WorkoutLog[]> {
  const out = new Map<string, WorkoutLog[]>()
  workouts.forEach((workout) => {
    out.set(workout.date, [...(out.get(workout.date) ?? []), workout])
  })
  return out
}

function buildActivityTypeStats(
  dateKeys: Set<string>,
  planByDate: Map<string, WorkoutPlan>,
  workoutsByDate: Map<string, WorkoutLog[]>,
): Record<Exclude<WorkoutPlanType, 'rest'>, number> & { total: number } {
  const stats = { incline_walk: 0, bodyweight: 0, other: 0, total: 0 }
  dateKeys.forEach((dateKey) => {
    const plannedType = planByDate.get(dateKey)?.type
    const loggedType = workoutsByDate.get(dateKey)?.[0]?.type
    const type = plannedType && plannedType !== 'rest' ? plannedType : loggedType
    if (!type) return
    stats[type] += 1
    stats.total += 1
  })
  return stats
}

function formatActivityDays(count: number, total: number): string {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return `${count}d (${pct}%)`
}

function getActivityCellStyle(plan: WorkoutPlan | undefined, actualKcal: number): CSSProperties {
  if (plan) {
    const target = Math.max(plan.kcal_target ?? 0, 0)
    const ratio = target > 0 ? actualKcal / target : actualKcal > 0 ? 1 : 0
    if (ratio >= 1) return { background: '#BBF7D0', opacity: 1, boxShadow: '0 0 12px rgba(34, 197, 94, 0.24)' }
    if (ratio >= 0.7) return { background: '#FEF3C7', opacity: 1, boxShadow: '0 0 12px rgba(245, 158, 11, 0.22)' }
    return { background: '#FECACA', opacity: 1, boxShadow: '0 0 12px rgba(239, 68, 68, 0.22)' }
  }
  if (actualKcal > 0) return { background: '#DDD6FE', opacity: 0.9, boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)' }
  return { background: 'var(--bg-soft)', opacity: 1, boxShadow: 'none' }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card padding={14}>
      <p className="dq-eyebrow">{label}</p>
      <strong className="dq-num" style={{ fontSize: 24 }}>
        {value}
      </strong>
    </Card>
  )
}
