import { useMemo, useState } from 'react'
import { appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Stepper } from '@/components/primitives'
import { BulkMealPlanner, BulkWorkoutPlanner } from '@/components/plan/BulkPlanners'
import { FullscreenModal } from '@/components/plan/FullscreenModal'
import { useFoods } from '@/hooks/useFoods'
import { useMealPlan, useMonthMealPlans } from '@/hooks/useMealPlan'
import { useMeals } from '@/hooks/useMeals'
import { useMonthWorkoutPlans, useWorkoutPlan } from '@/hooks/useWorkoutPlan'
import { useScrollLock } from '@/hooks/useScrollLock'
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

type SlotIcon = 'sunrise' | 'sun' | 'moon' | 'snack'

const MEAL_SLOTS: { id: MealSlot; icon: SlotIcon; color: string }[] = [
  { id: 'breakfast', icon: 'sunrise', color: '#FB923C' },
  { id: 'lunch', icon: 'sun', color: '#F59E0B' },
  { id: 'dinner', icon: 'moon', color: '#6366F1' },
  { id: 'snack', icon: 'snack', color: '#EC4899' },
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
            const mealIncomplete = !meal || meal.breakfast.length === 0 || meal.lunch.length === 0 || meal.dinner.length === 0
            const showWorkout = !!workout && workout.type !== 'rest'
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
                {(mealIncomplete || showWorkout) ? (
                  <span style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                    {mealIncomplete ? (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--danger)' }} />
                    ) : null}
                    {showWorkout ? (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--success)' }} />
                    ) : null}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: 'var(--t-3)', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} /> incomplete
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
  const items = meal
    ? ([
        { slot: 'breakfast', icon: 'sunrise' as const, color: '#FB923C', items: meal.breakfast },
        { slot: 'lunch', icon: 'sun' as const, color: '#F59E0B', items: meal.lunch },
        { slot: 'dinner', icon: 'moon' as const, color: '#6366F1', items: meal.dinner },
        { slot: 'snack', icon: 'snack' as const, color: '#EC4899', items: meal.snack },
      ]).filter((s) => s.items.length > 0)
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
        <div key={slot.slot} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
          <Icon color={slot.color} name={slot.icon} size={22} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--t-1)', lineHeight: 1.4 }}>
            {slot.items.map((it) => `${it.food_name}${it.portion !== 1 ? ` ×${it.portion}` : ''}`).join(', ')}
          </span>
          <span className="dq-pill" style={{ alignSelf: 'center' }}>
            {slot.items.reduce((s, it) => s + it.kcal, 0)} kcal
          </span>
        </div>
      ))}

      {workout && workout.type !== 'rest' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
          <Icon color="var(--success)" name={(workoutMeta?.icon as any) ?? 'walk'} size={22} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--t-1)' }}>
            {workoutMeta?.label ?? workout.type}{workout.kcal_target ? ` · ${workout.kcal_target} kcal` : ''}
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
  const { data: dayMeals, add: addMealLog } = useMeals(date)
  const [picking, setPicking] = useState<MealSlot | null>(null)
  const [workoutEditing, setWorkoutEditing] = useState(false)

  // Track which meal_types are already logged today (for plan→log button state)
  const loggedSlots = useMemo(() => new Set(dayMeals.map((m) => m.meal_type)), [dayMeals])

  const dateObj = new Date(date)
  const niceDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

  async function logSlotAsEaten(slot: MealSlot) {
    const items = plan[slot]
    if (items.length === 0) return
    try {
      await addMealLog({
        date,
        meal_type: slot,
        items: items.map((it) => ({
          name: it.food_name,
          portion: it.portion,
          kcal: it.kcal,
          protein_g: it.protein_g,
          carb_g: 0,
          fat_g: 0,
        })),
        total_kcal: items.reduce((s, it) => s + it.kcal, 0),
        total_protein_g: items.reduce((s, it) => s + it.protein_g, 0),
        total_carb_g: 0,
        total_fat_g: 0,
      })
      toast.success(`${slot.charAt(0).toUpperCase() + slot.slice(1)} logged from plan`)
      haptic(10)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't log meal.")
      haptic([20, 40, 20])
    }
  }

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

  useScrollLock()
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 110,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
      }}
    >
      <header className={styles.screenHeader} style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px', margin: 0, borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <button className={styles.iconButton} onClick={onClose} type="button">
          <Icon name="x" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p className="dq-eyebrow">Plan</p>
            <strong>{niceDate}</strong>
          </div>
        <span style={{ width: 40 }} />
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 132px)', WebkitOverflowScrolling: 'touch' }}>
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
              icon={slot.icon}
              color={slot.color}
              logged={loggedSlots.has(slot.id)}
              onAdd={() => setPicking(slot.id)}
              onRemove={(idx) => void removeFromSlot(slot.id, idx)}
              onLog={() => void logSlotAsEaten(slot.id)}
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
  )
}

function MealSlotCard({
  items,
  icon,
  color,
  logged,
  onAdd,
  onRemove,
  onLog,
}: {
  items: MealPlanItem[]
  icon: SlotIcon
  color: string
  logged?: boolean
  onAdd: () => void
  onRemove: (index: number) => void
  onLog?: () => void
}) {
  const totalKcal = items.reduce((sum, it) => sum + it.kcal, 0)
  const canLog = !!onLog && items.length > 0 && !logged
  return (
    <Card padding={14} style={{ marginBottom: 10, background: logged ? 'color-mix(in oklab, #BBF7D0 30%, var(--surface))' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: items.length ? 10 : 0 }}>
        <Icon color={color} name={icon} size={22} />
        <span style={{ flex: 1, fontSize: 13, color: 'var(--t-2)', fontWeight: 600 }}>
          {items.length === 0 ? 'No items' : `${totalKcal} kcal${logged ? ' · ✓ eaten' : ''}`}
        </span>
        {canLog ? (
          <button
            aria-label="Log this as eaten"
            onClick={onLog}
            type="button"
            style={{ height: 30, padding: '0 10px', borderRadius: '15px', border: 0, background: 'var(--success)', color: '#fff', cursor: 'pointer', outline: 'none', fontSize: 12, fontWeight: 700 }}
          >
            ✓ Log
          </button>
        ) : null}
        <button
          aria-label="Add"
          onClick={onAdd}
          type="button"
          style={{ width: 32, height: 32, borderRadius: '50%', border: 0, background: 'var(--a-soft)', color: 'var(--a1)', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      {items.map((item, idx) => (
        <div key={`${item.food_id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <strong style={{ fontSize: 14, color: 'var(--t-1)' }}>{item.food_name}</strong>
            <span style={{ fontSize: 11, color: 'var(--t-3)', fontWeight: 600 }}>
              {item.portion}× · {item.kcal} kcal · {item.protein_g}g
            </span>
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
  const isRest = plan?.type === 'rest'
  return (
    <Card padding={14} style={isRest ? { opacity: 0.5 } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon color={isRest ? 'var(--t-3)' : 'var(--success)'} name={(typeMeta?.icon as any) ?? 'walk'} size={22} />
        <span style={{ flex: 1, fontSize: 14, color: 'var(--t-1)', fontWeight: 600 }}>
          {plan ? `${typeMeta?.label ?? plan.type}${plan.kcal_target ? ` · ${plan.kcal_target} kcal` : ''}` : 'Not planned'}
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
      <FullscreenModal closeIcon="chevronL" onClose={() => setSelected(null)} title={selected.name} zIndex={130}>
          <div>
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
      </FullscreenModal>
    )
  }

  return (
    <FullscreenModal onClose={onCancel} title={`Pick food for ${slot}`} zIndex={120}>
        <div>
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
        <div>
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
              {filtered.map((food) => (
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
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, color: 'var(--t-1)' }}>{food.name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--t-2)', fontWeight: 600 }}>
                      {food.kcal_per_portion} kcal · {food.protein_g_per_portion}g · per {food.portion_unit}
                    </span>
                  </span>
                  <Icon color="var(--t-3)" name="chevron" size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
    </FullscreenModal>
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
  const [kcalTarget, setKcalTarget] = useState(existing?.kcal_target ?? 200)
  const isRest = type === 'rest'

  return (
    <FullscreenModal onClose={onCancel} title={existing ? 'Edit workout' : 'Plan workout'} zIndex={125}>
        <div>
          <p className={styles.fieldLabel}>Type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 18 }}>
            {WORKOUT_PLAN_TYPES.filter((t) => t.id !== 'other').map((t) => (
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
              <Stepper label="Target burn" suffix="kcal" value={kcalTarget} onChange={setKcalTarget} min={10} max={2000} step={10} />
              <div style={{ height: 14 }} />
            </>
          )}

          <Button onClick={() => onSave({ date, type, duration_min: isRest ? 0 : kcalTarget, kcal_target: isRest ? 0 : kcalTarget })}>
            {existing ? 'Update workout' : 'Save workout'}
          </Button>
        </div>
    </FullscreenModal>
  )
}
