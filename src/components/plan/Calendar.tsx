import { useMemo, useState } from 'react'
import { appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Stepper } from '@/components/primitives'
import { BulkMealPlanner, BulkWorkoutPlanner } from '@/components/plan/BulkPlanners'
import { useFoods } from '@/hooks/useFoods'
import { useMealPlan, useMonthMealPlans } from '@/hooks/useMealPlan'
import { useMonthWorkoutPlans, useWorkoutPlan } from '@/hooks/useWorkoutPlan'
import { useUser } from '@/hooks/useUser'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { haptic } from '@/lib/haptic'
import { toast } from '@/stores/toastStore'
import {
  FOOD_CATEGORIES,
  WORKOUT_PLAN_TYPES,
  type Food,
  type FoodCategory,
  type MealPlan,
  type MealPlanItem,
  type WorkoutPlan,
  type WorkoutPlanType,
} from '@/types/domain'

// ─────────────────────────────────────────────────────────────
// Calendar tab — monthly grid + day sheet
// ─────────────────────────────────────────────────────────────

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

const MEAL_SLOTS: { id: MealSlot; label: string; tag: string }[] = [
  { id: 'breakfast', label: 'Breakfast', tag: 'AM' },
  { id: 'lunch', label: 'Lunch', tag: 'NO' },
  { id: 'dinner', label: 'Dinner', tag: 'PM' },
  { id: 'snack', label: 'Snack', tag: 'SN' },
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateKey(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`
}

function monthKey(year: number, month0: number): string {
  return `${year}-${pad(month0 + 1)}`
}

function getMonthMeta(year: number, month0: number) {
  const firstOfMonth = new Date(year, month0, 1)
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay() // 0 = Sunday
  return { daysInMonth, startWeekday }
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarTab() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthStr = monthKey(year, month)
  const { data: mealPlans } = useMonthMealPlans(monthStr)
  const { data: workoutPlans } = useMonthWorkoutPlans(monthStr)

  const { daysInMonth, startWeekday } = useMemo(() => getMonthMeta(year, month), [year, month])
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  const mealMap = useMemo(() => {
    const map = new Map<string, MealPlan>()
    mealPlans.forEach((p) => map.set(p.date, p))
    return map
  }, [mealPlans])

  const workoutMap = useMemo(() => {
    const map = new Map<string, WorkoutPlan>()
    workoutPlans.forEach((p) => map.set(p.date, p))
    return map
  }, [workoutPlans])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  // Build grid cells (42 cells = 6 weeks)
  const cells: Array<{ day: number; date: string } | null> = []
  for (let i = 0; i < startWeekday; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push({ day: d, date: formatDateKey(year, month, d) })
  while (cells.length < 42) cells.push(null)

  const todayMeal = mealMap.get(todayKey) ?? null
  const todayWorkout = workoutMap.get(todayKey) ?? null
  const [bulk, setBulk] = useState<null | 'meal' | 'workout'>(null)

  return (
    <>
      <TodayPlanCard meal={todayMeal} workout={todayWorkout} onOpen={() => setSelectedDate(todayKey)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => setBulk('workout')}
          type="button"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
            border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            background: 'var(--surface)', cursor: 'pointer', outline: 'none',
            fontWeight: 700, color: 'var(--t-1)', fontSize: 13, justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Icon color="var(--success)" name="walk" size={16} />
          Workout
        </button>
        <button
          onClick={() => setBulk('meal')}
          type="button"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
            border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            background: 'var(--surface)', cursor: 'pointer', outline: 'none',
            fontWeight: 700, color: 'var(--t-1)', fontSize: 13, justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Icon color="var(--a1)" name="fork" size={16} />
          Meals
        </button>
      </div>

      <Card padding={12} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button aria-label="Previous month" className={styles.iconButton} onClick={prevMonth} type="button">
            <Icon name="chevronL" />
          </button>
          <strong style={{ fontSize: 16 }}>{MONTH_NAMES[month]} {year}</strong>
          <button aria-label="Next month" className={styles.iconButton} onClick={nextMonth} type="button">
            <Icon name="chevron" />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={`${d}-${i}`} style={{ textAlign: 'center', fontSize: 11, color: 'var(--t-3)', fontWeight: 700 }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} style={{ aspectRatio: '1', visibility: 'hidden' }} />
            const meal = mealMap.get(cell.date)
            const workout = workoutMap.get(cell.date)
            const isToday = cell.date === todayKey
            const hasPlan = (meal?.totals?.kcal ?? 0) > 0 || !!workout
            return (
              <button
                key={cell.date}
                onClick={() => setSelectedDate(cell.date)}
                type="button"
                style={{
                  aspectRatio: '1',
                  border: 0,
                  borderRadius: 'var(--r-sm)',
                  background: isToday ? 'var(--a-soft)' : 'var(--bg-soft)',
                  color: isToday ? 'var(--a1)' : 'var(--t-1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                  position: 'relative',
                  fontWeight: isToday ? 800 : 600,
                  fontSize: 13,
                }}
              >
                <span>{cell.day}</span>
                {hasPlan ? (
                  <span style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                    {(meal?.totals?.kcal ?? 0) > 0 ? (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--a1)' }} />
                    ) : null}
                    {workout ? (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--success)' }} />
                    ) : null}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: 'var(--t-3)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--a1)' }} /> meal plan
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} /> workout
          </span>
        </div>
      </Card>

      {selectedDate && <DaySheet date={selectedDate} onClose={() => setSelectedDate(null)} />}
      {bulk === 'meal' && <BulkMealPlanner onClose={() => setBulk(null)} />}
      {bulk === 'workout' && <BulkWorkoutPlanner onClose={() => setBulk(null)} />}
    </>
  )
}

function TodayPlanCard({
  meal,
  workout,
  onOpen,
}: {
  meal: MealPlan | null
  workout: WorkoutPlan | null
  onOpen: () => void
}) {
  const hasAny = !!meal && meal.totals.kcal > 0
  const items: { slot: string; tag: string; items: MealPlanItem[] }[] = meal
    ? [
        { slot: 'Breakfast', tag: 'AM', items: meal.breakfast },
        { slot: 'Lunch', tag: 'NO', items: meal.lunch },
        { slot: 'Dinner', tag: 'PM', items: meal.dinner },
        { slot: 'Snack', tag: 'SN', items: meal.snack },
      ].filter((s) => s.items.length > 0)
    : []
  const workoutMeta = workout ? WORKOUT_PLAN_TYPES.find((t) => t.id === workout.type) : null

  return (
    <Card padding={16} raised style={{ marginBottom: 14 }}>
      <button
        onClick={onOpen}
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          outline: 'none',
          padding: 0,
          marginBottom: hasAny || workout ? 12 : 0,
        }}
      >
        <span style={{ textAlign: 'left' }}>
          <p className="dq-eyebrow">Today</p>
          {hasAny ? (
            <strong className="dq-num" style={{ fontSize: 22 }}>
              {meal!.totals.kcal} kcal · {meal!.totals.protein_g}g P
            </strong>
          ) : (
            <strong style={{ fontSize: 15 }}>No plan yet · tap to add</strong>
          )}
        </span>
        <Icon color="var(--a1)" name="chevron" />
      </button>

      {items.map((slot) => (
        <div key={slot.slot} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
          <span className={styles.mealIcon} style={{ fontSize: 11, fontWeight: 800 }}>{slot.tag}</span>
          <span className={styles.rowText} style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{slot.slot}</strong>
            <span className={styles.rowSub}>
              {slot.items.map((it) => `${it.food_name}${it.portion !== 1 ? ` ×${it.portion}` : ''}`).join(', ')}
            </span>
          </span>
          <span className="dq-pill" style={{ alignSelf: 'center' }}>
            {slot.items.reduce((s, it) => s + it.kcal, 0)} kcal
          </span>
        </div>
      ))}

      {workout ? (
        <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
          <span className={styles.statIcon} style={{ color: 'var(--success)' }}>
            <Icon name={(workoutMeta?.icon as any) ?? 'walk'} size={18} />
          </span>
          <span className={styles.rowText} style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>Workout</strong>
            <span className={styles.rowSub}>{workoutMeta?.label ?? workout.type}{workout.duration_min ? ` · ${workout.duration_min} min` : ''}</span>
          </span>
        </div>
      ) : null}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Day sheet — meals + workout planner
// ─────────────────────────────────────────────────────────────

function DaySheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { profile } = useUser()
  const settings = profile?.settings ?? DEFAULT_SETTINGS
  const { data: plan, save: saveMealPlan } = useMealPlan(date)
  const { data: workout, save: saveWorkoutPlan, remove: removeWorkoutPlan } = useWorkoutPlan(date)
  const [picking, setPicking] = useState<MealSlot | null>(null)
  const [workoutEditing, setWorkoutEditing] = useState(false)

  const dateObj = new Date(date)
  const niceDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

  async function addFoodToSlot(slot: MealSlot, food: Food, portion: number) {
    const newItem: MealPlanItem = {
      food_id: food.id,
      food_name: food.name,
      portion,
      kcal: Math.round(food.kcal_per_portion * portion),
      protein_g: Math.round(food.protein_g_per_portion * portion * 10) / 10,
    }
    const next: MealPlan = { ...plan, [slot]: [...plan[slot], newItem] }
    try {
      await saveMealPlan(next)
      toast.success(`Added ${food.name}`)
      haptic(5)
      setPicking(null)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save plan.")
      haptic([20, 40, 20])
    }
  }

  async function removeFromSlot(slot: MealSlot, index: number) {
    const next: MealPlan = { ...plan, [slot]: plan[slot].filter((_, i) => i !== index) }
    try {
      await saveMealPlan(next)
      haptic(5)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't remove.")
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
        zIndex: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div className={styles.sheet} style={{ height: '92%', display: 'flex', flexDirection: 'column' }}>
        <div className={styles.sheetHandle} />
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={onClose} type="button">
            <Icon name="x" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p className="dq-eyebrow">Plan</p>
            <strong>{niceDate}</strong>
          </div>
          <span style={{ width: 40 }} />
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {/* Daily totals */}
          <Card padding={14} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <p className="dq-eyebrow">Planned today</p>
                <strong className="dq-num" style={{ fontSize: 28 }}>
                  {plan.totals.kcal} <span style={{ fontSize: 13, color: 'var(--t-3)' }}>/ {settings.daily_kcal_target} kcal</span>
                </strong>
              </div>
              <span className="dq-pill">{plan.totals.protein_g}g / {settings.daily_protein_target}g P</span>
            </div>
            <div className={styles.progressBar} style={{ marginTop: 10 }}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min((plan.totals.kcal / Math.max(settings.daily_kcal_target, 1)) * 100, 100)}%` }}
              />
            </div>
          </Card>

          {/* Meal slots */}
          {MEAL_SLOTS.map((slot) => (
            <MealSlotCard
              key={slot.id}
              items={plan[slot.id]}
              label={slot.label}
              tag={slot.tag}
              onAdd={() => setPicking(slot.id)}
              onRemove={(idx) => void removeFromSlot(slot.id, idx)}
            />
          ))}

          {/* Workout slot */}
          <div style={{ marginTop: 14 }}>
            <WorkoutSlotCard
              plan={workout}
              onEdit={() => setWorkoutEditing(true)}
              onRemove={async () => {
                try {
                  await removeWorkoutPlan()
                  toast.success('Workout removed.')
                  haptic(5)
                } catch (err) {
                  console.error(err)
                  toast.error("Couldn't remove workout.")
                }
              }}
            />
          </div>
        </div>

        {picking && (
          <FoodPicker
            slot={picking}
            onCancel={() => setPicking(null)}
            onPick={(food, portion) => void addFoodToSlot(picking, food, portion)}
          />
        )}

        {workoutEditing && (
          <WorkoutPlanSheet
            date={date}
            existing={workout}
            onCancel={() => setWorkoutEditing(false)}
            onSave={async (next) => {
              try {
                await saveWorkoutPlan(next)
                toast.success('Workout planned!')
                haptic(10)
                setWorkoutEditing(false)
              } catch (err) {
                console.error(err)
                toast.error("Couldn't save workout.")
                haptic([20, 40, 20])
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

function MealSlotCard({
  items,
  label,
  tag,
  onAdd,
  onRemove,
}: {
  items: MealPlanItem[]
  label: string
  tag: string
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  const totalKcal = items.reduce((sum, it) => sum + it.kcal, 0)
  return (
    <Card padding={14} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: items.length ? 10 : 4 }}>
        <span className={styles.mealIcon}>{tag}</span>
        <span className={styles.rowText} style={{ flex: 1 }}>
          <strong>{label}</strong>
          <span className={styles.rowSub}>{items.length === 0 ? 'No items' : `${totalKcal} kcal · ${items.length} items`}</span>
        </span>
        <button
          aria-label={`Add to ${label}`}
          className={styles.iconButton}
          onClick={onAdd}
          type="button"
          style={{ background: 'var(--a-soft)', color: 'var(--a1)' }}
        >
          <Icon name="plus" />
        </button>
      </div>
      {items.map((item, idx) => (
        <div key={`${item.food_id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
          <span className={styles.rowText} style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{item.food_name}</strong>
            <span className={styles.rowSub}>{item.portion}× · {item.kcal} kcal · {item.protein_g}g P</span>
          </span>
          <button
            aria-label="Remove item"
            onClick={() => onRemove(idx)}
            type="button"
            style={{ border: 0, background: 'transparent', color: 'var(--t-3)', cursor: 'pointer', padding: 4, outline: 'none' }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      ))}
    </Card>
  )
}

function WorkoutSlotCard({
  plan,
  onEdit,
  onRemove,
}: {
  plan: WorkoutPlan | null
  onEdit: () => void
  onRemove: () => void
}) {
  const typeMeta = plan ? WORKOUT_PLAN_TYPES.find((t) => t.id === plan.type) : null
  return (
    <Card padding={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={styles.statIcon} style={{ color: 'var(--success)' }}>
          <Icon name={(typeMeta?.icon as any) ?? 'walk'} />
        </span>
        <span className={styles.rowText} style={{ flex: 1 }}>
          <strong>Workout</strong>
          <span className={styles.rowSub}>
            {plan ? `${typeMeta?.label ?? plan.type} · ${plan.duration_min} min` : 'Not planned'}
          </span>
        </span>
        {plan ? (
          <>
            <button
              aria-label="Edit workout"
              className={styles.iconButton}
              onClick={onEdit}
              type="button"
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              aria-label="Remove workout"
              onClick={onRemove}
              type="button"
              style={{ border: 0, background: 'transparent', color: 'var(--t-3)', cursor: 'pointer', padding: 4, outline: 'none' }}
            >
              <Icon name="x" size={16} />
            </button>
          </>
        ) : (
          <button
            aria-label="Add workout"
            className={styles.iconButton}
            onClick={onEdit}
            type="button"
            style={{ background: 'var(--a-soft)', color: 'var(--a1)' }}
          >
            <Icon name="plus" />
          </button>
        )}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Food picker — search/filter foods, set portion, add to slot
// ─────────────────────────────────────────────────────────────

function FoodPicker({
  slot,
  onPick,
  onCancel,
}: {
  slot: MealSlot
  onPick: (food: Food, portion: number) => void
  onCancel: () => void
}) {
  const { data: foods, loading } = useFoods()
  const [filter, setFilter] = useState<FoodCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [portion, setPortion] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return foods.filter((food) => {
      if (filter !== 'all' && food.category !== filter) return false
      if (q && !food.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [foods, filter, query])

  if (selected) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,42,0.55)',
          zIndex: 130,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <div className={styles.sheet} style={{ height: 'auto', maxHeight: '50%' }}>
          <div className={styles.sheetHandle} />
          <header className={styles.screenHeader}>
            <button className={styles.iconButton} onClick={() => setSelected(null)} type="button">
              <Icon name="chevronL" />
            </button>
            <strong>{selected.name}</strong>
            <span style={{ width: 40 }} />
          </header>
          <div style={{ padding: '0 20px 24px' }}>
            <p className={styles.subtitle} style={{ marginBottom: 10 }}>
              {selected.kcal_per_portion} kcal · {selected.protein_g_per_portion}g protein per {selected.portion_unit}
            </p>
            <Stepper label="Portions" suffix={`× ${selected.portion_unit}`} value={portion} onChange={setPortion} min={0.25} max={20} step={0.25} />
            <div style={{ height: 14 }} />
            <Card padding={12} style={{ background: 'var(--bg-soft)' }}>
              <strong>= {Math.round(selected.kcal_per_portion * portion)} kcal · {Math.round(selected.protein_g_per_portion * portion * 10) / 10}g protein</strong>
            </Card>
            <div style={{ height: 14 }} />
            <Button onClick={() => onPick(selected, portion)}>Add to {slot}</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div className={styles.sheet} style={{ height: '85%', display: 'flex', flexDirection: 'column' }}>
        <div className={styles.sheetHandle} />
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={onCancel} type="button">
            <Icon name="x" />
          </button>
          <strong>Pick food for {slot}</strong>
          <span style={{ width: 40 }} />
        </header>
        <div style={{ padding: '0 20px' }}>
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              border: 0,
              background: 'var(--bg-soft)',
              borderRadius: 'var(--r-md)',
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--t-1)',
              marginBottom: 10,
            }}
          />
          <div className="dq-h-scroll" style={{ margin: '0 -20px 12px 0', paddingRight: 20 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip active={filter === 'all'} label="All" onClick={() => setFilter('all')} />
              {FOOD_CATEGORIES.map((cat) => (
                <Chip
                  active={filter === cat.id}
                  key={cat.id}
                  label={cat.label}
                  onClick={() => setFilter(cat.id)}
                />
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {loading ? (
            <p className={styles.subtitle}>Loading foods...</p>
          ) : filtered.length === 0 ? (
            <Card padding={20} style={{ textAlign: 'center', borderStyle: 'dashed' }}>
              <p className={styles.subtitle}>
                {foods.length === 0 ? 'No foods in library yet. Add some first.' : 'No foods match this filter.'}
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((food) => {
                const catMeta = FOOD_CATEGORIES.find((c) => c.id === food.category)
                return (
                  <button
                    key={food.id}
                    onClick={() => {
                      setSelected(food)
                      setPortion(1)
                    }}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-md)',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <span className={styles.mealIcon} style={{ fontSize: 11, fontWeight: 800 }}>
                      {catMeta?.icon ?? 'OT'}
                    </span>
                    <span className={styles.rowText} style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{food.name}</strong>
                      <span className={styles.rowSub}>{food.kcal_per_portion} kcal · {food.protein_g_per_portion}g P / {food.portion_unit}</span>
                    </span>
                    <Icon color="var(--t-3)" name="chevron" size={14} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        whiteSpace: 'nowrap',
        border: 0,
        background: active ? 'var(--a-soft)' : 'var(--bg-soft)',
        color: active ? 'var(--a1)' : 'var(--t-2)',
        padding: '6px 14px',
        borderRadius: 'var(--r-pill)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Workout plan editor
// ─────────────────────────────────────────────────────────────

function WorkoutPlanSheet({
  date,
  existing,
  onSave,
  onCancel,
}: {
  date: string
  existing: WorkoutPlan | null
  onSave: (plan: WorkoutPlan) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<WorkoutPlanType>(existing?.type ?? 'incline_walk')
  const [duration, setDuration] = useState(existing?.duration_min ?? 45)
  const isRest = type === 'rest'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        zIndex: 125,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div className={styles.sheet} style={{ height: 'auto', maxHeight: '70%' }}>
        <div className={styles.sheetHandle} />
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={onCancel} type="button">
            <Icon name="x" />
          </button>
          <strong>{existing ? 'Edit workout' : 'Plan workout'}</strong>
          <span style={{ width: 40 }} />
        </header>
        <div style={{ padding: '0 20px 24px' }}>
          <p className={styles.fieldLabel}>Type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 18 }}>
            {WORKOUT_PLAN_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  border: type === t.id ? '2px solid var(--a1)' : '1px solid var(--line)',
                  borderRadius: 'var(--r-md)',
                  background: type === t.id ? 'var(--a-soft)' : 'var(--surface)',
                  cursor: 'pointer',
                  outline: 'none',
                  fontWeight: 700,
                  color: type === t.id ? 'var(--a1)' : 'var(--t-1)',
                  fontSize: 13,
                }}
              >
                <Icon name={t.icon as any} size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {!isRest && (
            <>
              <Stepper label="Duration" suffix="min" value={duration} onChange={setDuration} min={5} max={180} step={5} />
              <div style={{ height: 14 }} />
            </>
          )}

          <Button onClick={() => onSave({ date, type, duration_min: isRest ? 0 : duration })}>
            {existing ? 'Update workout' : 'Save workout'}
          </Button>
        </div>
      </div>
    </div>
  )
}
