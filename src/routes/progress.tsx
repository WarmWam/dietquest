import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Card, Icon, Skeleton } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { todayKey, daysAgoKey } from '@/lib/dates'
import { useDayTotals } from '@/hooks/useDayTotals'
import { useMeals } from '@/hooks/useMeals'
import { useToday } from '@/hooks/useToday'
import { useUser } from '@/hooks/useUser'
import { useWeights } from '@/hooks/useWeights'
import { useWorkouts } from '@/hooks/useWorkouts'

type ProgressTab = 'weight' | 'kcal' | 'activity'

const tabs: Array<{ id: ProgressTab; label: string }> = [
  { id: 'weight', label: 'Weight' },
  { id: 'kcal', label: 'Calories' },
  { id: 'activity', label: 'Activity' },
]

const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function ProgressRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const requestedTab = params.get('tab') as ProgressTab | null
  const tab = requestedTab === 'kcal' || requestedTab === 'activity' ? requestedTab : 'weight'

  return (
    <AppScreen activeNav="progress">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <h1 className={styles.headerTitle}>Progress</h1>
        <div className="dq-h-scroll" style={{ margin: '14px -20px 18px 0', paddingRight: 20 }}>
          <div className={styles.tabRow}>
            {tabs.map((item) => (
              <button className="dq-seg-item" data-active={tab === item.id} key={item.id} onClick={() => navigate(`/progress?tab=${item.id}`)} type="button">
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
  const { profile } = useUser()
  const { data: weights, loading } = useWeights(60)
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
  const { data: today } = useToday()
  const { data: meals } = useMeals()
  const { data: weekTotals } = useDayTotals(7)

  // Build 7-day data: oldest to newest
  const days = weekTotals.map((t) => t.totals.kcal)
  const dayLabels = weekTotals.map((t) => {
    const d = new Date(t.date + 'T00:00:00')
    return DAY_SHORT[d.getDay()]
  })

  const todayDate = todayKey()
  const maxKcal = Math.max(...days, 1)

  return (
    <>
      <div className={styles.chartCard}>
        <p className="dq-eyebrow">Today</p>
        <strong className="dq-num" style={{ fontSize: 42 }}>
          {today.totals.kcal}
        </strong>
        <p className={styles.subtitle}>{today.totals.protein_g}g protein logged</p>
        <div className={styles.bars}>
          {days.map((kcal, index) => {
            const isToday = weekTotals[index]?.date === todayDate
            return (
              <div className={styles.barColumn} key={`${weekTotals[index]?.date}-${index}`}>
                <div className={styles.bar} style={{ background: isToday ? 'var(--a-grad)' : 'var(--bg-soft)', height: `${Math.max((kcal / maxKcal) * 100, 6)}%` }} />
                <span className="dq-eyebrow">{dayLabels[index] ?? '?'}</span>
              </div>
            )
          })}
        </div>
      </div>
      <Card padding={16}>
        <p className="dq-eyebrow">Meals today</p>
        {meals.length === 0 ? <p className={styles.subtitle}>No meals logged yet.</p> : null}
        {meals.map((meal) => (
          <div className={styles.habitRow} key={meal.id}>
            <Icon color="var(--a1)" name="fork" />
            <span className={styles.rowText}>
              <strong>{meal.items[0]?.name ?? meal.meal_type}</strong>
              <span className={styles.rowSub}>{meal.total_kcal} kcal - {meal.total_protein_g}g protein</span>
            </span>
          </div>
        ))}
      </Card>
    </>
  )
}

function ActivityTab() {
  const { data: workouts } = useWorkouts(90)
  const totalMinutes = workouts.reduce((sum, workout) => sum + workout.duration_min, 0)
  const burned = workouts.reduce((sum, workout) => sum + workout.kcal_burned, 0)

  // Build heatmap: 13 weeks × 7 days = 91 cells representing last 91 days
  const today = new Date()
  const workoutDates = new Set(workouts.map((w) => w.date))

  // Compute best week (most workout minutes in any 7-day window)
  function computeBestWeek(): number {
    if (workouts.length === 0) return 0
    let best = 0
    for (let weekStart = 0; weekStart < 13; weekStart++) {
      let weekMin = 0
      for (let d = 0; d < 7; d++) {
        const dayOffset = weekStart * 7 + d
        const dateKey = daysAgoKey(90 - dayOffset)
        const dayWorkouts = workouts.filter((w) => w.date === dateKey)
        weekMin += dayWorkouts.reduce((s, w) => s + w.duration_min, 0)
      }
      best = Math.max(best, weekMin)
    }
    return best
  }

  const bestWeekMin = computeBestWeek()

  return (
    <>
      <div className={styles.chartCard}>
        <div className={styles.screenHeader}>
          <div>
            <p className="dq-eyebrow">Logged workouts</p>
            <strong className="dq-num" style={{ fontSize: 42 }}>
              {workouts.length} sessions
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
        <Metric label="Walks" value={`${workouts.length}`} />
        <Metric label="Minutes" value={`${totalMinutes}`} />
        <Metric label="Burned" value={`${burned}`} />
        <Metric label="Best week" value={bestWeekMin ? `${bestWeekMin} min` : '—'} />
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
