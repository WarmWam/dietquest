import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Card, Icon, Skeleton, type IconName } from '@/components/primitives'
import { DEFAULT_PROFILE } from '@/data/defaults'
import { todayKey, daysAgoKey } from '@/lib/dates'
import { useDayTotals } from '@/hooks/useDayTotals'
import { useMeals } from '@/hooks/useMeals'
import { useSleeps } from '@/hooks/useSleeps'
import { useUser } from '@/hooks/useUser'
import { useWater } from '@/hooks/useWater'
import { useWeights } from '@/hooks/useWeights'
import { useMonthWorkoutPlans } from '@/hooks/useWorkoutPlan'
import { useWorkouts } from '@/hooks/useWorkouts'
import { toast } from '@/stores/toastStore'
import { buildActualWeightSeries, buildCalculatedWeightSeries, type DayEnergy } from '@/lib/weight'
import type { MealItem, MealLog, MealType, WorkoutLog, WorkoutPlan, WorkoutPlanType } from '@/types/domain'

type MealSlotIcon = 'sunrise' | 'sun' | 'moon' | 'snack'
const MEAL_META: Record<MealType, { icon: MealSlotIcon; color: string }> = {
  breakfast: { icon: 'sunrise', color: '#FB923C' },
  lunch: { icon: 'sun', color: '#F59E0B' },
  dinner: { icon: 'moon', color: '#6366F1' },
  snack: { icon: 'snack', color: '#EC4899' },
}

type ProgressTab = 'weight' | 'health' | 'activity'
type HealthMetric = 'kcal' | 'protein' | 'sugar' | 'drink' | 'sleep'

const tabs: Array<{ id: ProgressTab; label: string }> = [
  { id: 'weight', label: 'Weight' },
  { id: 'health', label: 'Health' },
  { id: 'activity', label: 'Activity' },
]

const healthTabs: Array<{ id: HealthMetric; label: string }> = [
  { id: 'kcal', label: 'Calories' },
  { id: 'protein', label: 'Protein' },
  { id: 'sugar', label: 'Sugar' },
  { id: 'drink', label: 'Drink' },
  { id: 'sleep', label: 'Sleep' },
]

const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ProgressRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const requestedTab = params.get('tab')
  const tab: ProgressTab = requestedTab === 'health' || requestedTab === 'kcal' || requestedTab === 'protein' || requestedTab === 'sugar' ? 'health' : requestedTab === 'activity' ? 'activity' : 'weight'
  const initialMetric: HealthMetric = requestedTab === 'protein' ? 'protein' : requestedTab === 'sugar' ? 'sugar' : 'kcal'

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
        {tab === 'health' ? <HealthTab initialMetric={initialMetric} /> : tab === 'activity' ? <ActivityTab /> : <WeightTab />}
      </div>
    </AppScreen>
  )
}

const WEIGHT_WINDOW_DAYS = 30

function WeightTab() {
  const { profile, error: userError } = useUser()
  const { data: weights, loading, error: weightsError } = useWeights(90)
  const { data: dayTotals, error: totalsError } = useDayTotals(90)
  const { data: workouts, error: workoutsError } = useWorkouts(90)
  const userProfile = profile?.profile ?? DEFAULT_PROFILE

  // Rolling window of the last N days (ascending).
  const dates: string[] = []
  {
    const today = new Date()
    for (let i = WEIGHT_WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
  }

  // Energy in/out per day: intake from day totals, exercise from workouts.
  const kcalByDate = new Map(dayTotals.map((t) => [t.date, t.totals.kcal]))
  const exerciseByDate = new Map<string, number>()
  workouts.forEach((w) => exerciseByDate.set(w.date, (exerciseByDate.get(w.date) ?? 0) + w.kcal_burned))
  const energyByDate = new Map<string, DayEnergy>()
  dates.forEach((date) => energyByDate.set(date, {
    intakeKcal: kcalByDate.get(date) ?? 0,
    exerciseKcal: exerciseByDate.get(date) ?? 0,
  }))

  const actualSeries = buildActualWeightSeries(weights, dates)
  // Baseline for the projection: the first actual weight that lands inside
  // the window, else the profile's recorded start weight.
  const firstActual = actualSeries.find((v) => v != null) ?? null
  const baseline = firstActual ?? userProfile.weight_start_kg
  const calcSeries = buildCalculatedWeightSeries({
    dates,
    startWeightKg: baseline,
    sex: userProfile.sex,
    heightCm: userProfile.height_cm,
    age: userProfile.age,
    energyByDate,
  })

  const startWeight = userProfile.weight_start_kg
  const lastActualIdx = (() => {
    for (let i = actualSeries.length - 1; i >= 0; i--) if (actualSeries[i] != null) return i
    return -1
  })()
  const currentWeight = lastActualIdx >= 0 ? (actualSeries[lastActualIdx] as number) : startWeight
  const projectedWeight = calcSeries[calcSeries.length - 1] ?? baseline
  const lost = Number((currentWeight - startWeight).toFixed(1))
  const toTarget = Number((currentWeight - userProfile.weight_target_kg).toFixed(1))

  // Shared y-scale across both lines + target.
  const allVals = [
    ...actualSeries.filter((v): v is number => v != null),
    ...calcSeries,
    userProfile.weight_target_kg,
    startWeight,
  ]
  const min = Math.min(...allVals) - 0.5
  const max = Math.max(...allVals) + 0.5
  const span = Math.max(max - min, 0.1)
  const xAt = (i: number) => (dates.length > 1 ? (i / (dates.length - 1)) * 350 : 0)
  const yAt = (val: number) => 180 - ((val - min) / span) * 150 - 12

  const calcPath = calcSeries.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')
  const firstIdx = actualSeries.findIndex((v) => v != null)
  const actualPath = firstIdx < 0
    ? ''
    : actualSeries
        .map((v, i) => (v == null ? null : { i, v }))
        .filter((p): p is { i: number; v: number } => p != null)
        .map((p, j) => `${j === 0 ? 'M' : 'L'}${xAt(p.i).toFixed(1)},${yAt(p.v).toFixed(1)}`)
        .join(' ')

  useEffect(() => {
    if (userError || weightsError || totalsError || workoutsError) toast.error("Couldn't load weight progress. Try again.")
  }, [userError, weightsError, totalsError, workoutsError])

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
          <span className="dq-pill" style={{ color: lost <= 0 ? 'var(--success)' : 'var(--danger)' }}>
            <Icon name={lost <= 0 ? 'arrowDown' : 'arrowUp'} size={12} /> {Math.abs(lost).toFixed(1)} kg
          </span>
        </div>
        <svg height="190" viewBox="0 0 350 190" width="100%">
          {/* Target line */}
          <line x1="0" x2="350" y1={yAt(userProfile.weight_target_kg)} y2={yAt(userProfile.weight_target_kg)} stroke="var(--line-strong)" strokeDasharray="2 4" strokeWidth="1" />
          {/* Calculated (energy-balance projection) — dashed */}
          {calcPath ? (
            <path d={calcPath} fill="none" stroke="var(--t-3)" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          ) : null}
          {/* Actual (logged) — solid accent with area */}
          {actualPath ? (
            <>
              <path d={`${actualPath} L350,190 L${xAt(firstIdx).toFixed(1)},190 Z`} fill="var(--a-soft)" opacity={0.5} />
              <path d={actualPath} fill="none" stroke="var(--a1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            </>
          ) : null}
        </svg>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
          <Legend color="var(--a1)" label="Actual" />
          <Legend color="var(--t-3)" dashed label="Calculated" />
          <Legend color="var(--line-strong)" dashed label="Target" />
        </div>
        {firstIdx < 0 ? (
          <p className={styles.subtitle} style={{ marginTop: 8 }}>Log your weight on Home to draw the actual line.</p>
        ) : null}
      </div>
      <div className={styles.metricGrid}>
        <Metric label="Start" value={`${startWeight.toFixed(1)} kg`} />
        <Metric label="Now" value={`${currentWeight.toFixed(1)} kg`} />
        <Metric label="Projected" value={`${projectedWeight.toFixed(1)} kg`} />
        <Metric label="To target" value={`${toTarget.toFixed(1)} kg`} />
      </div>
    </>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 16, height: 0, borderTop: `3px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-2)' }}>{label}</span>
    </span>
  )
}

function HealthTab({ initialMetric }: { initialMetric: HealthMetric }) {
  const [metric, setMetric] = useState<HealthMetric>(initialMetric)

  return (
    <>
      <div className="dq-seg" style={{ width: '100%', margin: '0 0 14px' }}>
        {healthTabs.map((item) => (
          <button
            className="dq-seg-item"
            data-active={metric === item.id}
            key={item.id}
            onClick={() => setMetric(item.id)}
            type="button"
            style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none' }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {metric === 'protein' ? <ProteinTab /> : metric === 'sugar' ? <SugarTab /> : metric === 'drink' ? <DrinkTab /> : metric === 'sleep' ? <SleepTab /> : <CaloriesTab />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Generic drill-down metric chart (Calories / Protein / Sugar / Drink / Sleep)
//   meal mode:   tap a bar once → summary; tap same bar again → drill down
//   simple mode: tap a bar → drill down immediately
//   lowest level (a day) → meals (meal mode) or a day-detail card (simple)
// ─────────────────────────────────────────────────────────────

type Zone = { stroke: string; number: string }
const BAR_STROKE = { green: '#86EFAC', yellow: '#FCD34D', red: '#FCA5A5' }
const BAR_NUMBER = { green: '#16A34A', yellow: '#D97706', red: '#DC2626' }

// don't-exceed (kcal, sugar)
function barZoneColor(value: number, target: number): Zone {
  if (target <= 0) return { stroke: BAR_STROKE.green, number: BAR_NUMBER.green }
  const p = value / target
  if (p >= 1) return { stroke: BAR_STROKE.red, number: BAR_NUMBER.red }
  if (p >= 0.7) return { stroke: BAR_STROKE.yellow, number: BAR_NUMBER.yellow }
  return { stroke: BAR_STROKE.green, number: BAR_NUMBER.green }
}
// hit-target (protein, water, sleep)
function targetZoneColor(value: number, target: number): Zone {
  if (target <= 0) return { stroke: BAR_STROKE.green, number: BAR_NUMBER.green }
  const p = value / target
  if (p >= 1) return { stroke: BAR_STROKE.green, number: BAR_NUMBER.green }
  if (p >= 0.7) return { stroke: BAR_STROKE.yellow, number: BAR_NUMBER.yellow }
  return { stroke: BAR_STROKE.red, number: BAR_NUMBER.red }
}

function fmt1(v: number): string {
  if (v <= 0) return '0'
  const r = Math.round(v * 10) / 10
  return Number.isInteger(r) ? `${r}` : r.toFixed(1)
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shiftDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}
function prettyDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

type Scope =
  | { kind: 'year' }
  | { kind: 'month'; y: number; m: number }
  | { kind: 'week'; start: string }
  | { kind: 'day'; date: string }
type Bar = { key: string; label: string; value: number; isDay: boolean; dayDate?: string; child?: Scope }

function avgOver(dates: string[], valueByDate: Map<string, number>): number {
  let sum = 0
  let count = 0
  for (const d of dates) {
    const v = valueByDate.get(d) ?? 0
    if (v > 0) { sum += v; count += 1 }
  }
  return count > 0 ? sum / count : 0
}

function buildBars(scope: Scope, valueByDate: Map<string, number>): Bar[] {
  const today = new Date()
  if (scope.kind === 'year') {
    const out: Bar[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const last = new Date(y, m + 1, 0).getDate()
      const dates: string[] = []
      for (let day = 1; day <= last; day++) dates.push(ymd(new Date(y, m, day)))
      out.push({ key: `mon-${y}-${m}`, label: MONTH_SHORT[m], value: avgOver(dates, valueByDate), isDay: false, child: { kind: 'month', y, m } })
    }
    return out
  }
  if (scope.kind === 'month') {
    const { y, m } = scope
    const last = new Date(y, m + 1, 0).getDate()
    const out: Bar[] = []
    let wi = 0
    for (let start = 1; start <= last; start += 7) {
      wi++
      const dates: string[] = []
      for (let k = 0; k < 7 && start + k <= last; k++) dates.push(ymd(new Date(y, m, start + k)))
      out.push({ key: `wk-${y}-${m}-${wi}`, label: `W${wi}`, value: avgOver(dates, valueByDate), isDay: false, child: { kind: 'week', start: dates[0] } })
    }
    return out
  }
  if (scope.kind === 'week') {
    const start = new Date(`${scope.start}T00:00:00`)
    const out: Bar[] = []
    for (let k = 0; k < 7; k++) {
      const d = shiftDays(start, k)
      const key = ymd(d)
      out.push({ key: `day-${key}`, label: DAY_SHORT[d.getDay()], value: valueByDate.get(key) ?? 0, isDay: true, dayDate: key })
    }
    return out
  }
  return []
}

function scopeLabel(scope: Scope): string {
  if (scope.kind === 'year') return 'Year'
  if (scope.kind === 'month') { const now = new Date(); return MONTH_SHORT[scope.m] + (scope.y !== now.getFullYear() ? ` ${scope.y}` : '') }
  if (scope.kind === 'week') { const d = new Date(`${scope.start}T00:00:00`); return `Wk ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` }
  return prettyDate(scope.date)
}

function MetricChart({
  valueByDate, target, zone, formatValue, formatHeader, unit, todayValue, subtitle, mode, renderDay,
}: {
  valueByDate: Map<string, number>
  target: number
  zone: (v: number, t: number) => Zone
  formatValue: (v: number) => string
  formatHeader?: (v: number) => string
  unit?: string
  todayValue: number
  subtitle: string
  mode: 'meal' | 'simple'
  renderDay: (date: string) => ReactNode
}) {
  const [stack, setStack] = useState<Scope[]>([{ kind: 'week', start: ymd(shiftDays(new Date(), -6)) }])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const scope = stack[stack.length - 1]
  const segLevel = scope.kind === 'year' ? 'year' : scope.kind === 'month' ? 'month' : 'week'
  const todayK = todayKey()

  function setSegment(level: 'week' | 'month' | 'year') {
    const t = new Date()
    const next: Scope = level === 'week' ? { kind: 'week', start: ymd(shiftDays(t, -6)) } : level === 'month' ? { kind: 'month', y: t.getFullYear(), m: t.getMonth() } : { kind: 'year' }
    setStack([next])
    setSelectedKey(null)
  }
  function drill(child: Scope) { setStack((s) => [...s, child]); setSelectedKey(null) }
  function popTo(i: number) { setStack((s) => s.slice(0, i + 1)); setSelectedKey(null) }

  const bars = buildBars(scope, valueByDate)
  const maxVal = Math.max(...bars.map((b) => b.value), target, 1)
  const isYear = scope.kind === 'year'
  const headerColor = zone(todayValue, target).number

  const defaultKey = mode === 'meal' && scope.kind === 'week' ? (bars.find((b) => b.dayDate === todayK)?.key ?? null) : null
  const shownKey = selectedKey ?? defaultKey
  const selectedBar = bars.find((b) => b.key === shownKey) ?? null

  function onBarTap(bar: Bar) {
    if (bar.isDay) { setSelectedKey(bar.key); return }
    if (mode === 'simple') { if (bar.child) drill(bar.child); return }
    if (shownKey !== bar.key) setSelectedKey(bar.key)
    else if (bar.child) drill(bar.child)
  }

  let detail: ReactNode = null
  if (selectedBar) {
    if (selectedBar.isDay && selectedBar.dayDate) {
      detail = renderDay(selectedBar.dayDate)
    } else if (selectedBar.child) {
      const children = buildBars(selectedBar.child, valueByDate)
      const withVal = children.filter((c) => c.value > 0)
      const maxChild = withVal.reduce((a, c) => (c.value > a ? c.value : a), 0)
      const avg = withVal.length > 0 ? withVal.reduce((s, c) => s + c.value, 0) / withVal.length : 0
      detail = (
        <Card padding={14}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <p className="dq-eyebrow">{scopeLabel(selectedBar.child)} · breakdown</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-3)' }}>avg {formatValue(avg)}{unit ? ` ${unit}` : ''}/day</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {children.map((c) => {
              const z = zone(c.value, target)
              const isMax = c.value > 0 && c.value === maxChild
              return (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 36, fontSize: 12, fontWeight: 700, color: 'var(--t-2)' }}>{c.label}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min((c.value / maxVal) * 100, 100)}%`, background: c.value > 0 ? z.stroke : 'transparent', borderRadius: 999 }} />
                  </div>
                  <span style={{ minWidth: 46, textAlign: 'right', fontSize: 12, fontWeight: 800, color: c.value > 0 ? z.number : 'var(--t-3)' }}>{formatValue(c.value)}</span>
                  <span style={{ width: 26, fontSize: 10, fontWeight: 800, color: 'var(--a1)' }}>{isMax ? 'max' : ''}</span>
                </div>
              )
            })}
          </div>
          {mode === 'meal' ? <p className={styles.subtitle} style={{ marginTop: 10, fontSize: 11 }}>Tap this bar again to open {scopeLabel(selectedBar.child).toLowerCase()}.</p> : null}
        </Card>
      )
    }
  }

  return (
    <>
      <div className={styles.chartCard}>
        <p className="dq-eyebrow">Today</p>
        <strong className="dq-num" style={{ fontSize: 42, color: headerColor }}>
          {formatHeader ? formatHeader(todayValue) : `${formatValue(todayValue)}${unit ? ` ${unit}` : ''}`}
        </strong>
        <p className={styles.subtitle}>{subtitle}</p>

        <div className="dq-seg" style={{ width: '100%', margin: '14px 0 6px' }}>
          {(['week', 'month', 'year'] as const).map((item) => (
            <button key={item} className="dq-seg-item" data-active={segLevel === item} type="button" onClick={() => setSegment(item)}
              style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none', textTransform: 'capitalize' }}>{item}</button>
          ))}
        </div>

        {stack.length > 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, margin: '0 0 8px' }}>
            {stack.map((s, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {i > 0 ? <Icon name="chevron" size={12} color="var(--t-3)" /> : null}
                <button type="button" onClick={() => popTo(i)} disabled={i === stack.length - 1}
                  style={{ border: 0, background: i === stack.length - 1 ? 'var(--a-soft)' : 'var(--bg-soft)', color: i === stack.length - 1 ? 'var(--a1)' : 'var(--t-2)', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, cursor: i === stack.length - 1 ? 'default' : 'pointer', outline: 'none' }}>
                  {scopeLabel(s)}
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className={styles.bars} style={isYear ? { overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', justifyContent: 'flex-start', gap: 10, paddingBottom: 4 } : undefined}>
          {bars.map((bar) => {
            const z = zone(bar.value, target)
            const h = Math.max((bar.value / maxVal) * 100, bar.value > 0 ? 8 : 3)
            const selected = bar.key === shownKey
            return (
              <button key={bar.key} type="button" onClick={() => onBarTap(bar)} className={styles.barColumn}
                style={{ height: '100%', minWidth: isYear ? 26 : undefined, flex: isYear ? '0 0 auto' : undefined, border: 0, background: 'transparent', cursor: 'pointer', padding: 0, outline: 'none' }}>
                <span style={{ color: bar.value > 0 ? z.number : 'var(--t-3)', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>{formatValue(bar.value)}</span>
                <div className={styles.bar} style={{ background: bar.value > 0 ? z.stroke : 'var(--bg-soft)', height: `${h}%`, outline: selected ? '2px solid var(--a1)' : 'none', outlineOffset: selected ? 1 : 0 }} />
                <span className="dq-eyebrow" style={{ fontSize: isYear ? 9 : undefined }}>{bar.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {detail ? <div style={{ marginTop: 4 }}>{detail}</div> : null}
    </>
  )
}

function DayMeals({ date, field, suffix }: { date: string; field: 'kcal' | 'protein_g' | 'sugar_g'; suffix: string }) {
  const { data: meals } = useMeals(date)
  const valOf = (m: MealLog) => (field === 'kcal' ? m.total_kcal : field === 'protein_g' ? m.total_protein_g : (m.total_sugar_g ?? 0))
  const itemVal = (it: MealItem) => (field === 'kcal' ? it.kcal : field === 'protein_g' ? it.protein_g : (it.sugar_g ?? 0))
  return (
    <>
      <p className="dq-eyebrow" style={{ margin: '4px 4px 10px' }}>{prettyDate(date)}</p>
      {meals.length === 0 ? (
        <Card padding={16}><p className={styles.subtitle}>No meals logged.</p></Card>
      ) : (
        (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
          const slotMeals = meals.filter((m) => m.meal_type === type)
          if (slotMeals.length === 0) return null
          const slotItems = slotMeals.flatMap((m) => m.items)
          const total = slotMeals.reduce((s, m) => s + valOf(m), 0)
          const meta = MEAL_META[type]
          return (
            <Card key={type} padding={14} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon color={meta.color} name={meta.icon as IconName} size={22} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{fmt1(total)} {suffix}</span>
              </div>
              <div style={{ display: 'grid', gap: 6, margin: '10px 0 0 34px' }}>
                {slotItems.map((it, idx) => (
                  <div key={`${type}-${idx}-${it.name}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{it.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--t-3)', fontWeight: 600 }}>{it.portion}× · {fmt1(itemVal(it))} {suffix}</span>
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

function CaloriesTab() {
  const { data: meals, error: mealsError } = useMeals()
  const { data: yearTotals, error: totalsError } = useDayTotals(365)
  const { profile } = useUser()
  const target = profile?.settings?.daily_kcal_target ?? 1950
  const liveKcal = meals.reduce((sum, m) => sum + (m.total_kcal ?? 0), 0)
  const valueByDate = useMemo(() => {
    const map = new Map(yearTotals.map((t) => [t.date, t.totals.kcal]))
    map.set(todayKey(), liveKcal)
    return map
  }, [yearTotals, liveKcal])
  useEffect(() => { if (mealsError || totalsError) toast.error("Couldn't load calorie progress. Try again.") }, [mealsError, totalsError])
  return (
    <MetricChart valueByDate={valueByDate} target={target} zone={barZoneColor}
      formatValue={(v) => Math.round(v).toLocaleString()} unit="kcal" todayValue={liveKcal}
      subtitle={`limit ${target.toLocaleString()} kcal`} mode="meal"
      renderDay={(date) => <DayMeals date={date} field="kcal" suffix="kcal" />} />
  )
}

function ProteinTab() {
  const { data: meals, error: mealsError } = useMeals()
  const { data: yearTotals, error: totalsError } = useDayTotals(365)
  const { profile } = useUser()
  const target = profile?.settings?.daily_protein_target ?? 140
  const liveProtein = meals.reduce((s, m) => s + (m.total_protein_g ?? 0), 0)
  const valueByDate = useMemo(() => {
    const map = new Map(yearTotals.map((t) => [t.date, t.totals.protein_g]))
    map.set(todayKey(), liveProtein)
    return map
  }, [yearTotals, liveProtein])
  useEffect(() => { if (mealsError || totalsError) toast.error("Couldn't load protein progress. Try again.") }, [mealsError, totalsError])
  return (
    <MetricChart valueByDate={valueByDate} target={target} zone={targetZoneColor}
      formatValue={(v) => fmt1(v)} unit="g" todayValue={liveProtein}
      subtitle={`target ${target}g protein`} mode="meal"
      renderDay={(date) => <DayMeals date={date} field="protein_g" suffix="g protein" />} />
  )
}

function SugarTab() {
  const { data: meals, error: mealsError } = useMeals()
  const { data: yearTotals, error: totalsError } = useDayTotals(365)
  const { profile } = useUser()
  const target = profile?.settings?.daily_sugar_target ?? 36
  const liveSugar = meals.reduce((s, m) => s + (m.total_sugar_g ?? 0), 0)
  const valueByDate = useMemo(() => {
    const map = new Map(yearTotals.map((t) => [t.date, t.totals.sugar_g]))
    map.set(todayKey(), liveSugar)
    return map
  }, [yearTotals, liveSugar])
  useEffect(() => { if (mealsError || totalsError) toast.error("Couldn't load sugar progress. Try again.") }, [mealsError, totalsError])
  return (
    <MetricChart valueByDate={valueByDate} target={target} zone={barZoneColor}
      formatValue={(v) => fmt1(v)} unit="g" todayValue={liveSugar}
      subtitle={`limit ${target}g · less is better`} mode="meal"
      renderDay={(date) => <DayMeals date={date} field="sugar_g" suffix="g sugar" />} />
  )
}

function DrinkTab() {
  const { data: yearTotals, error: totalsError } = useDayTotals(365)
  const { totalMl, error: waterError } = useWater()
  const target = 3000
  const valueByDate = useMemo(() => {
    const map = new Map(yearTotals.map((t) => [t.date, t.totals.water_ml]))
    map.set(todayKey(), totalMl)
    return map
  }, [yearTotals, totalMl])
  useEffect(() => { if (totalsError || waterError) toast.error("Couldn't load drink progress. Try again.") }, [totalsError, waterError])
  return (
    <MetricChart valueByDate={valueByDate} target={target} zone={targetZoneColor}
      formatValue={(v) => `${Math.round(v)}`} formatHeader={(v) => `${(v / 1000).toFixed(1)} L`} unit="ml"
      todayValue={totalMl} subtitle={`target ${(target / 1000).toFixed(1)} L`} mode="simple"
      renderDay={(date) => (
        <Card padding={14}>
          <p className="dq-eyebrow">{prettyDate(date)}</p>
          <strong className="dq-num" style={{ fontSize: 24 }}>{Math.round(valueByDate.get(date) ?? 0)} ml</strong>
          <p className={styles.subtitle}>{Math.round(((valueByDate.get(date) ?? 0) / target) * 100)}% of goal</p>
        </Card>
      )} />
  )
}

function SleepTab() {
  const { data: sleeps, error: sleepsError } = useSleeps(365)
  const target = 8
  const sleepByDate = useMemo(() => new Map(sleeps.map((s) => [s.date, s])), [sleeps])
  const valueByDate = useMemo(() => new Map(sleeps.map((s) => [s.date, s.duration_min / 60])), [sleeps])
  const todayVal = valueByDate.get(todayKey()) ?? 0
  useEffect(() => { if (sleepsError) toast.error("Couldn't load sleep progress. Try again.") }, [sleepsError])
  return (
    <MetricChart valueByDate={valueByDate} target={target} zone={targetZoneColor}
      formatValue={(v) => fmt1(v)} formatHeader={(v) => `${fmt1(v)} h`} unit="h"
      todayValue={todayVal} subtitle={`target ${target} h`} mode="simple"
      renderDay={(date) => {
        const s = sleepByDate.get(date)
        return (
          <Card padding={14}>
            <p className="dq-eyebrow">{prettyDate(date)}</p>
            <strong className="dq-num" style={{ fontSize: 24 }}>{s ? fmt1(s.duration_min / 60) : '0'} h</strong>
            <p className={styles.subtitle}>{s ? `${s.bedtime} - ${s.wake_time}` : 'No sleep logged'}</p>
          </Card>
        )
      }} />
  )
}

function ActivityTab() {
  const { data: workouts, error: workoutsError } = useWorkouts(90)
  const monthKeys = getRecentMonthKeys(4)
  const month0 = useMonthWorkoutPlans(monthKeys[0])
  const month1 = useMonthWorkoutPlans(monthKeys[1])
  const month2 = useMonthWorkoutPlans(monthKeys[2])
  const month3 = useMonthWorkoutPlans(monthKeys[3])
  const activityWorkouts = workouts.filter((workout) => workout.kcal_burned >= 20)
  const currentDateKey = todayKey()
  const workoutPlans = [month0.data, month1.data, month2.data, month3.data]
    .flat()
    .filter((plan) => plan.date >= daysAgoKey(90) && plan.date <= currentDateKey && plan.type !== 'rest')
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
  const activityValue = value.match(/^(.+?)\s(\(.+\))$/)
  return (
    <Card padding={14}>
      <p className="dq-eyebrow">{label}</p>
      <strong className="dq-num" style={{ fontSize: 24 }}>
        {activityValue ? (
          <>
            {activityValue[1]} <span style={{ fontSize: 18 }}>{activityValue[2]}</span>
          </>
        ) : value}
      </strong>
    </Card>
  )
}
