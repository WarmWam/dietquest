import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Card, Icon, Skeleton, type IconName } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { todayKey, daysAgoKey } from '@/lib/dates'
import { useDayTotals } from '@/hooks/useDayTotals'
import { useMeals } from '@/hooks/useMeals'
import { useUser } from '@/hooks/useUser'
import { useWeights } from '@/hooks/useWeights'
import { useWorkouts } from '@/hooks/useWorkouts'
import { toast } from '@/stores/toastStore'
import type { MealType } from '@/types/domain'

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

  // Live sum from meals[] (source of truth) — denormalized day totals
  // can drift if a meal was deleted without decrementing.
  const liveKcal = meals.reduce((sum, m) => sum + (m.total_kcal ?? 0), 0)
  const liveProtein = meals.reduce((sum, m) => sum + (m.total_protein_g ?? 0), 0)

  const todayDate = todayKey()
  const totals = yearTotals.map((t) => t.date === todayDate ? { ...t, totals: { ...t.totals, kcal: liveKcal, protein_g: liveProtein } } : t)
  const bars = buildCalorieBars(totals, view)
  const maxKcal = Math.max(...bars.map((bar) => bar.kcal), 1)

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
        <div className={styles.bars}>
          {bars.map((bar, index) => {
            const isToday = bar.date === todayDate
            const height = Math.max((bar.kcal / maxKcal) * 100, bar.kcal > 0 ? 8 : 3)
            return (
              <div className={styles.barColumn} key={`${bar.label}-${index}`} style={{ height: '100%', minWidth: view === 'year' ? 18 : undefined }}>
                <span style={{ color: 'var(--t-2)', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>
                  {formatKcalLabel(bar.kcal)}
                </span>
                <div className={styles.bar} style={{ background: isToday ? 'var(--a-grad)' : 'var(--bg-soft)', height: `${height}%` }} />
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
    const last28 = totals.slice(-28)
    return Array.from({ length: 4 }, (_, index) => {
      const chunk = last28.slice(index * 7, index * 7 + 7)
      return {
        date: chunk[chunk.length - 1]?.date ?? '',
        label: `W${index + 1}`,
        kcal: chunk.reduce((sum, t) => sum + t.totals.kcal, 0),
      }
    })
  }

  const monthMap = new Map<string, { label: string; kcal: number }>()
  totals.forEach((t) => {
    const date = new Date(`${t.date}T00:00:00`)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const current = monthMap.get(key) ?? { label: MONTH_SHORT[date.getMonth()], kcal: 0 }
    current.kcal += t.totals.kcal
    monthMap.set(key, current)
  })

  return Array.from(monthMap.entries()).slice(-12).map(([key, value]) => ({ date: key, ...value }))
}

function formatKcalLabel(kcal: number): string {
  if (kcal <= 0) return '0'
  if (kcal >= 1000) return `${Math.round(kcal / 100) / 10}k`
  return String(kcal)
}

function ActivityTab() {
  const { data: workouts, error: workoutsError } = useWorkouts(90)
  const activityWorkouts = workouts.filter((workout) => workout.kcal_burned >= 20)
  const burned = activityWorkouts.reduce((sum, workout) => sum + workout.kcal_burned, 0)

  // Build heatmap: 13 weeks × 7 days = 91 cells representing last 91 days
  const today = new Date()
  const workoutDates = new Set(activityWorkouts.map((w) => w.date))

  // Compute best week (most burned kcal in any 7-day window)
  function computeBestWeek(): number {
    if (activityWorkouts.length === 0) return 0
    let best = 0
    for (let weekStart = 0; weekStart < 13; weekStart++) {
      let weekKcal = 0
      for (let d = 0; d < 7; d++) {
        const dayOffset = weekStart * 7 + d
        const dateKey = daysAgoKey(90 - dayOffset)
        const dayWorkouts = activityWorkouts.filter((w) => w.date === dateKey)
        weekKcal += dayWorkouts.reduce((s, w) => s + w.kcal_burned, 0)
      }
      best = Math.max(best, weekKcal)
    }
    return best
  }

  const bestWeekKcal = computeBestWeek()

  useEffect(() => {
    if (workoutsError) toast.error("Couldn't load activity progress. Try again.")
  }, [workoutsError])

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
                const hasWorkout = workoutDates.has(cellKey)
                return <span className={styles.heatCell} key={day} style={{ opacity: hasWorkout ? 0.8 : 0.12 }} />
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.metricGrid}>
        <Metric label="Walks" value={`${activityWorkouts.length}`} />
        <Metric label="Burned" value={`${burned}`} />
        <Metric label="Best week" value={bestWeekKcal ? `${bestWeekKcal} kcal` : '—'} />
      </div>
    </>
  )
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
