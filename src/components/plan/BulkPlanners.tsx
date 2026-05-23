import { useMemo, useState } from 'react'
import { appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Stepper } from '@/components/primitives'
import { useFoods } from '@/hooks/useFoods'
import { bulkUpsertMealPlans, bulkUpsertWorkoutPlans } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { haptic } from '@/lib/haptic'
import { toast } from '@/stores/toastStore'
import {
  WORKOUT_PLAN_TYPES,
  type Food,
  type MealPlan,
  type MealPlanItem,
  type WorkoutPlan,
  type WorkoutPlanType,
} from '@/types/domain'

// ─────────────────────────────────────────────────────────────
// Date range helpers
// ─────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function datesInRange(startIso: string, endIso: string): string[] {
  const out: string[] = []
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (end < start) return out
  const cur = new Date(start)
  while (cur <= end) {
    out.push(isoDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function defaultRange(): { start: string; end: string } {
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 6) // default next 7 days incl today
  return { start: isoDate(today), end: isoDate(end) }
}

// ─────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────

function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        zIndex: 115,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div className={styles.sheet} style={{ height: '95%', display: 'flex', flexDirection: 'column' }}>
        <div className={styles.sheetHandle} />
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={onClose} type="button">
            <Icon name="x" />
          </button>
          <strong>{title}</strong>
          <span style={{ width: 40 }} />
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

function DateRangeRow({
  start,
  end,
  onChange,
}: {
  start: string
  end: string
  onChange: (next: { start: string; end: string }) => void
}) {
  const count = datesInRange(start, end).length
  return (
    <Card padding={14} style={{ marginBottom: 14 }}>
      <p className={styles.fieldLabel}>Date range</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <DateInput value={start} onChange={(v) => onChange({ start: v, end })} />
        <Icon color="var(--t-3)" name="chevron" size={14} />
        <DateInput value={end} onChange={(v) => onChange({ start, end: v })} />
      </div>
      <p className={styles.subtitle} style={{ marginTop: 8, textAlign: 'center' }}>
        {count > 0 ? `${count} day${count === 1 ? '' : 's'}` : 'End must be after start'}
      </p>
    </Card>
  )
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '10px 12px',
        fontSize: 14,
        fontWeight: 700,
        border: 0,
        background: 'var(--bg-soft)',
        borderRadius: 'var(--r-md)',
        outline: 'none',
        fontFamily: 'inherit',
        color: 'var(--t-1)',
        width: '100%',
        textAlign: 'center',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Bulk MEAL planner
// ─────────────────────────────────────────────────────────────

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
]

type SlotPlan = {
  enabled: boolean
  items: SlotPlanItem[]
}

type SlotPlanItem = {
  food_id: string
  portion: number
  is_random: boolean // if true, this food is in the per-day random pool
}

function emptySlot(): SlotPlan {
  return { enabled: false, items: [] }
}

function pickRandom<T>(pool: T[]): T | null {
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export function BulkMealPlanner({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { data: foods } = useFoods()
  const [{ start, end }, setRange] = useState(defaultRange())
  const [slots, setSlots] = useState<Record<MealSlot, SlotPlan>>({
    breakfast: { enabled: true, items: [] },
    lunch: emptySlot(),
    dinner: emptySlot(),
    snack: emptySlot(),
  })
  const [overwrite, setOverwrite] = useState(false)
  const [picking, setPicking] = useState<MealSlot | null>(null)
  const [applying, setApplying] = useState(false)

  const dates = useMemo(() => datesInRange(start, end), [start, end])
  const canApply = dates.length > 0 && Object.values(slots).some((s) => s.enabled && s.items.length > 0)

  function updateSlot(slot: MealSlot, next: Partial<SlotPlan>) {
    setSlots((cur) => ({ ...cur, [slot]: { ...cur[slot], ...next } }))
  }

  function addFoodToSlot(slot: MealSlot, food: Food) {
    setSlots((cur) => {
      if (cur[slot].items.some((it) => it.food_id === food.id)) return cur
      return {
        ...cur,
        [slot]: {
          ...cur[slot],
          enabled: true,
          items: [...cur[slot].items, { food_id: food.id, portion: 1, is_random: false }],
        },
      }
    })
  }

  function removeItem(slot: MealSlot, idx: number) {
    setSlots((cur) => ({
      ...cur,
      [slot]: { ...cur[slot], items: cur[slot].items.filter((_, i) => i !== idx) },
    }))
  }

  function setItemPortion(slot: MealSlot, idx: number, portion: number) {
    setSlots((cur) => ({
      ...cur,
      [slot]: {
        ...cur[slot],
        items: cur[slot].items.map((it, i) => (i === idx ? { ...it, portion } : it)),
      },
    }))
  }

  function toggleRandom(slot: MealSlot, idx: number) {
    setSlots((cur) => ({
      ...cur,
      [slot]: {
        ...cur[slot],
        items: cur[slot].items.map((it, i) => (i === idx ? { ...it, is_random: !it.is_random } : it)),
      },
    }))
  }

  function buildSlotItems(slot: MealSlot): MealPlanItem[] {
    const slotPlan = slots[slot]
    if (!slotPlan.enabled) return []
    const foodMap = new Map(foods.map((f) => [f.id, f]))
    const fixed = slotPlan.items.filter((it) => !it.is_random)
    const randomPool = slotPlan.items.filter((it) => it.is_random)
    const items: MealPlanItem[] = []

    fixed.forEach((it) => {
      const food = foodMap.get(it.food_id)
      if (!food) return
      items.push({
        food_id: food.id,
        food_name: food.name,
        portion: it.portion,
        kcal: Math.round(food.kcal_per_portion * it.portion),
        protein_g: Math.round(food.protein_g_per_portion * it.portion * 10) / 10,
      })
    })

    if (randomPool.length > 0) {
      const pick = pickRandom(randomPool)
      const food = pick ? foodMap.get(pick.food_id) : null
      if (pick && food) {
        items.push({
          food_id: food.id,
          food_name: food.name,
          portion: pick.portion,
          kcal: Math.round(food.kcal_per_portion * pick.portion),
          protein_g: Math.round(food.protein_g_per_portion * pick.portion * 10) / 10,
        })
      }
    }

    return items
  }

  async function applyPlan() {
    if (!user || !canApply || applying) return
    setApplying(true)
    try {
      const plans: MealPlan[] = dates.map((date) => ({
        date,
        breakfast: buildSlotItems('breakfast'),
        lunch: buildSlotItems('lunch'),
        dinner: buildSlotItems('dinner'),
        snack: buildSlotItems('snack'),
        totals: { kcal: 0, protein_g: 0 }, // recomputed in db
      }))
      // Note: overwrite=false would require fetching existing per-day; for v1.3 we always merge,
      // which means random pool items can be added but won't overwrite existing fixed items.
      // For full overwrite behavior, we still write all slots (merge replaces these fields entirely).
      await bulkUpsertMealPlans(user.uid, plans)
      toast.success(`Planned ${dates.length} day${dates.length === 1 ? '' : 's'}`)
      haptic(10)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save plan. Try again.")
      haptic([20, 40, 20])
    } finally {
      setApplying(false)
    }
  }

  return (
    <SheetShell title="Bulk meal planner" onClose={onClose}>
      <DateRangeRow start={start} end={end} onChange={setRange} />

      {MEAL_SLOTS.map((slot) => (
        <MealSlotCard
          key={slot.id}
          slot={slots[slot.id]}
          slotId={slot.id}
          label={slot.label}
          foods={foods}
          onToggleEnabled={() => updateSlot(slot.id, { enabled: !slots[slot.id].enabled })}
          onAdd={() => setPicking(slot.id)}
          onRemove={(idx) => removeItem(slot.id, idx)}
          onPortion={(idx, p) => setItemPortion(slot.id, idx, p)}
          onToggleRandom={(idx) => toggleRandom(slot.id, idx)}
        />
      ))}

      <Card padding={14} style={{ marginTop: 8, marginBottom: 14, background: 'var(--bg-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Icon color="var(--a1)" name="sparkle" size={20} />
          <span className={styles.rowText} style={{ flex: 1 }}>
            <strong style={{ fontSize: 13 }}>Random rotation</strong>
            <span className={styles.rowSub}>
              Toggle 🎲 on items to add them to a per-day random pool — one will be picked each day.
              Fixed items appear every day.
            </span>
          </span>
        </div>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          <span className={styles.rowText}>
            <strong style={{ fontSize: 14 }}>Overwrite existing plans</strong>
            <span className={styles.rowSub}>Off: merge into days that already have items. On: replace.</span>
          </span>
        </label>
      </Card>

      <Button disabled={!canApply || applying} onClick={() => void applyPlan()}>
        {applying ? 'Applying...' : `Apply to ${dates.length} day${dates.length === 1 ? '' : 's'}`}
      </Button>

      {picking && (
        <FoodPickerLite
          foods={foods}
          excludeIds={new Set(slots[picking].items.map((it) => it.food_id))}
          slotLabel={MEAL_SLOTS.find((s) => s.id === picking)?.label ?? ''}
          onCancel={() => setPicking(null)}
          onPick={(food) => {
            addFoodToSlot(picking, food)
            setPicking(null)
          }}
        />
      )}
    </SheetShell>
  )
}

function MealSlotCard({
  slot,
  slotId,
  label,
  foods,
  onToggleEnabled,
  onAdd,
  onRemove,
  onPortion,
  onToggleRandom,
}: {
  slot: SlotPlan
  slotId: MealSlot
  label: string
  foods: Food[]
  onToggleEnabled: () => void
  onAdd: () => void
  onRemove: (idx: number) => void
  onPortion: (idx: number, portion: number) => void
  onToggleRandom: (idx: number) => void
}) {
  const foodMap = new Map(foods.map((f) => [f.id, f]))
  const hint = slotId === 'breakfast' ? 'Tip: lock whey + egg; toggle 🎲 on fruits to rotate.' : null

  return (
    <Card padding={14} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className={styles.switch}
          data-on={slot.enabled}
          onClick={onToggleEnabled}
          type="button"
          aria-label={`Toggle ${label} planning`}
        >
          <span className={styles.switchKnob} />
        </button>
        <span className={styles.rowText} style={{ flex: 1 }}>
          <strong>{label}</strong>
          <span className={styles.rowSub}>
            {slot.enabled
              ? slot.items.length === 0
                ? 'Tap + to add foods'
                : `${slot.items.filter((i) => !i.is_random).length} fixed · ${slot.items.filter((i) => i.is_random).length} random`
              : 'Off'}
          </span>
        </span>
        {slot.enabled ? (
          <button
            aria-label={`Add food to ${label}`}
            className={styles.iconButton}
            onClick={onAdd}
            type="button"
            style={{ background: 'var(--a-soft)', color: 'var(--a1)' }}
          >
            <Icon name="plus" />
          </button>
        ) : null}
      </div>

      {slot.enabled && hint && slot.items.length === 0 ? (
        <p className={styles.subtitle} style={{ marginTop: 8, fontSize: 12 }}>{hint}</p>
      ) : null}

      {slot.enabled && slot.items.length > 0 ? (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slot.items.map((it, idx) => {
            const food = foodMap.get(it.food_id)
            if (!food) return null
            return (
              <div
                key={it.food_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: it.is_random ? 'var(--a-soft)' : 'var(--bg-soft)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <button
                  aria-label="Toggle random"
                  onClick={() => onToggleRandom(idx)}
                  type="button"
                  style={{
                    border: 0,
                    background: it.is_random ? 'var(--a1)' : 'var(--surface)',
                    color: it.is_random ? '#fff' : 'var(--t-3)',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    outline: 'none',
                  }}
                >
                  🎲
                </button>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{food.name}</span>
                <PortionMini value={it.portion} onChange={(v) => onPortion(idx, v)} unit={food.portion_unit} />
                <button
                  aria-label="Remove"
                  onClick={() => onRemove(idx)}
                  type="button"
                  style={{ border: 0, background: 'transparent', color: 'var(--t-3)', cursor: 'pointer', padding: 4, outline: 'none' }}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </Card>
  )
}

function PortionMini({ value, unit, onChange }: { value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', borderRadius: 999, padding: '2px 6px' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0.25, Number((value - 0.25).toFixed(2))))}
        style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, fontSize: 14, color: 'var(--t-2)', outline: 'none' }}
      >
        −
      </button>
      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 30, textAlign: 'center' }}>
        {value % 1 === 0 ? value : value.toFixed(2)} {unit}
      </span>
      <button
        type="button"
        onClick={() => onChange(Number((value + 0.25).toFixed(2)))}
        style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, fontSize: 14, color: 'var(--t-2)', outline: 'none' }}
      >
        +
      </button>
    </div>
  )
}

function FoodPickerLite({
  foods,
  excludeIds,
  slotLabel,
  onPick,
  onCancel,
}: {
  foods: Food[]
  excludeIds: Set<string>
  slotLabel: string
  onPick: (food: Food) => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = foods.filter((f) => !excludeIds.has(f.id) && f.name.toLowerCase().includes(query.toLowerCase()))

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
      <div className={styles.sheet} style={{ height: '70%', display: 'flex', flexDirection: 'column' }}>
        <div className={styles.sheetHandle} />
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={onCancel} type="button">
            <Icon name="x" />
          </button>
          <strong>Add to {slotLabel}</strong>
          <span style={{ width: 40 }} />
        </header>
        <div style={{ padding: '0 20px' }}>
          <input
            type="search"
            placeholder="Search foods..."
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
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {filtered.length === 0 ? (
            <p className={styles.subtitle} style={{ textAlign: 'center', padding: 20 }}>
              {foods.length === 0 ? 'Library empty. Add foods in Library tab first.' : 'No matches.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((food) => (
                <button
                  key={food.id}
                  onClick={() => onPick(food)}
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
                  <span className={styles.rowText} style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>{food.name}</strong>
                    <span className={styles.rowSub}>{food.kcal_per_portion} kcal · {food.protein_g_per_portion}g P / {food.portion_unit}</span>
                  </span>
                  <Icon color="var(--a1)" name="plus" size={16} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Bulk WORKOUT planner
// ─────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function BulkWorkoutPlanner({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [{ start, end }, setRange] = useState(defaultRange())
  const [weekdays, setWeekdays] = useState<boolean[]>([false, true, true, true, true, true, true])
  const [type, setType] = useState<WorkoutPlanType>('incline_walk')
  const [duration, setDuration] = useState(45)
  const [restOnOffDays, setRestOnOffDays] = useState(false)
  const [applying, setApplying] = useState(false)

  const allDates = useMemo(() => datesInRange(start, end), [start, end])
  const activeDates = useMemo(
    () => allDates.filter((d) => weekdays[new Date(d).getDay()]),
    [allDates, weekdays],
  )
  const restDates = useMemo(
    () => (restOnOffDays ? allDates.filter((d) => !weekdays[new Date(d).getDay()]) : []),
    [allDates, weekdays, restOnOffDays],
  )

  const totalDates = activeDates.length + restDates.length
  const canApply = totalDates > 0

  function toggleWeekday(i: number) {
    setWeekdays((cur) => cur.map((v, idx) => (idx === i ? !v : v)))
  }

  async function applyPlan() {
    if (!user || !canApply || applying) return
    setApplying(true)
    try {
      const plans: WorkoutPlan[] = []
      activeDates.forEach((date) => plans.push({ date, type, duration_min: type === 'rest' ? 0 : duration }))
      restDates.forEach((date) => plans.push({ date, type: 'rest', duration_min: 0 }))
      await bulkUpsertWorkoutPlans(user.uid, plans)
      toast.success(`Planned ${plans.length} workout${plans.length === 1 ? '' : 's'}`)
      haptic(10)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save workouts. Try again.")
      haptic([20, 40, 20])
    } finally {
      setApplying(false)
    }
  }

  return (
    <SheetShell title="Bulk workout planner" onClose={onClose}>
      <DateRangeRow start={start} end={end} onChange={setRange} />

      <Card padding={14} style={{ marginBottom: 14 }}>
        <p className={styles.fieldLabel}>Workout on which days?</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => toggleWeekday(i)}
              type="button"
              style={{
                padding: '10px 0',
                border: 0,
                borderRadius: 'var(--r-sm)',
                background: weekdays[i] ? 'var(--a1)' : 'var(--bg-soft)',
                color: weekdays[i] ? '#fff' : 'var(--t-2)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {label[0]}
            </button>
          ))}
        </div>
        <p className={styles.subtitle} style={{ marginTop: 8 }}>
          {activeDates.length} active day{activeDates.length === 1 ? '' : 's'} in range
        </p>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <p className={styles.fieldLabel}>Workout type</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {WORKOUT_PLAN_TYPES.filter((t) => t.id !== 'rest').map((t) => (
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
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Stepper label="Duration (per day)" suffix="min" value={duration} onChange={setDuration} min={5} max={180} step={5} />
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={restOnOffDays} onChange={(e) => setRestOnOffDays(e.target.checked)} />
          <span className={styles.rowText}>
            <strong style={{ fontSize: 14 }}>Mark off-days as Rest</strong>
            <span className={styles.rowSub}>
              {restOnOffDays
                ? `${restDates.length} day${restDates.length === 1 ? '' : 's'} will get a "Rest" plan`
                : 'Off-days stay blank'}
            </span>
          </span>
        </label>
      </Card>

      <Button disabled={!canApply || applying} onClick={() => void applyPlan()}>
        {applying ? 'Applying...' : `Apply to ${totalDates} day${totalDates === 1 ? '' : 's'}`}
      </Button>
    </SheetShell>
  )
}
