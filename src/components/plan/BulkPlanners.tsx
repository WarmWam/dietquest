import { useMemo, useState } from 'react'
import { appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Stepper } from '@/components/primitives'
import { FullscreenModal } from '@/components/plan/FullscreenModal'
import { useFoods } from '@/hooks/useFoods'
import { bulkUpsertMealPlans, bulkUpsertWorkoutPlans } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
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
// Date range helpers
// ─────────────────────────────────────────────────────────────

function pad(n: number): string { return String(n).padStart(2, '0') }
function isoDate(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function datesInRange(startIso: string, endIso: string): string[] {
  const out: string[] = []
  const start = new Date(startIso), end = new Date(endIso)
  if (end < start) return out
  const cur = new Date(start)
  while (cur <= end) { out.push(isoDate(cur)); cur.setDate(cur.getDate() + 1) }
  return out
}
function defaultRange() {
  const today = new Date(), end = new Date(today)
  end.setDate(end.getDate() + 6)
  return { start: isoDate(today), end: isoDate(end) }
}

function pickRandom<T>(pool: T[]): T | null {
  return pool.length === 0 ? null : pool[Math.floor(Math.random() * pool.length)]
}

function makeMealItem(food: Food, portion: number): MealPlanItem {
  return {
    food_id: food.id,
    food_name: food.name,
    portion,
    kcal: Math.round(food.kcal_per_portion * portion),
    protein_g: Math.round(food.protein_g_per_portion * portion * 10) / 10,
    sugar_g: Math.round((food.sugar_g_per_portion ?? 0) * portion * 10) / 10,
  }
}

function findFoodMatch(foods: Food[], patterns: string[]): Food | null {
  const lower = (s: string) => s.toLowerCase()
  for (const p of patterns) {
    const match = foods.find((f) => lower(f.name).includes(lower(p)))
    if (match) return match
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────

function SheetShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <FullscreenModal onClose={onClose} title={title} zIndex={115}>
      {children}
    </FullscreenModal>
  )
}

function DateRangeRow({ start, end, onChange }: { start: string; end: string; onChange: (next: { start: string; end: string }) => void }) {
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
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
      style={{ padding: '10px 6px', fontSize: 12, fontWeight: 700, border: 0, background: 'var(--bg-soft)', borderRadius: 'var(--r-md)', outline: 'none', fontFamily: 'inherit', color: 'var(--t-1)', width: '100%', minWidth: 0, textAlign: 'center', boxSizing: 'border-box' }} />
  )
}

// ─────────────────────────────────────────────────────────────
// Slot item model (lunch / dinner / snack)
// ─────────────────────────────────────────────────────────────

type SlotItem =
  | { id: string; kind: 'food'; food_id: string; portion: number; is_random: boolean }
  | { id: string; kind: 'random_category'; category: FoodCategory; portion: number }
  | { id: string; kind: 'random_all'; portion: number }

type GenericSlot = {
  enabled: boolean
  items: SlotItem[]
}

type BreakfastConfig = {
  enabled: boolean
  whey_portion: number
  egg_portion: number
  fruit_mode: 'random_all' | 'pick'
  fruit_picks: string[] // food_ids
}

type MealSlot = 'lunch' | 'dinner' | 'snack'

const GENERIC_SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
]

let _idCounter = 0
const nextId = () => `item-${++_idCounter}-${Date.now()}`

// ─────────────────────────────────────────────────────────────
// Bulk MEAL planner
// ─────────────────────────────────────────────────────────────

export function BulkMealPlanner({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { data: foods } = useFoods()
  const [{ start, end }, setRange] = useState(defaultRange())
  const [breakfast, setBreakfast] = useState<BreakfastConfig>({
    enabled: true,
    whey_portion: 1,
    egg_portion: 2,
    fruit_mode: 'random_all',
    fruit_picks: [],
  })
  const [slots, setSlots] = useState<Record<MealSlot, GenericSlot>>({
    lunch: { enabled: false, items: [] },
    dinner: { enabled: false, items: [] },
    snack: { enabled: false, items: [] },
  })
  const [dinnerWheyPortion, setDinnerWheyPortion] = useState(1)
  const [addMenu, setAddMenu] = useState<MealSlot | null>(null)
  const [picking, setPicking] = useState<{ slot: MealSlot; mode: 'specific' | 'category' } | null>(null)
  const [applying, setApplying] = useState(false)

  const dates = useMemo(() => datesInRange(start, end), [start, end])
  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
  const fruits = useMemo(() => foods.filter((f) => f.category === 'fruit'), [foods])
  const whey = useMemo(() => findFoodMatch(foods, ['Whey']), [foods])
  const egg = useMemo(() => findFoodMatch(foods, ['ไข่', 'Egg']), [foods])

  const canApply =
    dates.length > 0 &&
    (
      (breakfast.enabled && (breakfast.whey_portion > 0 || breakfast.egg_portion > 0 || fruits.length > 0)) ||
      Object.values(slots).some((s) => s.enabled && s.items.length > 0)
    )

  function updateSlot(slot: MealSlot, next: Partial<GenericSlot>) {
    setSlots((cur) => ({ ...cur, [slot]: { ...cur[slot], ...next } }))
  }

  function addItem(slot: MealSlot, item: SlotItem) {
    setSlots((cur) => ({ ...cur, [slot]: { enabled: true, items: [...cur[slot].items, item] } }))
  }

  function removeItem(slot: MealSlot, itemId: string) {
    setSlots((cur) => ({ ...cur, [slot]: { ...cur[slot], items: cur[slot].items.filter((it) => it.id !== itemId) } }))
  }

  function updateItem(slot: MealSlot, itemId: string, patch: Partial<SlotItem>) {
    setSlots((cur) => ({
      ...cur,
      [slot]: {
        ...cur[slot],
        items: cur[slot].items.map((it) => (it.id === itemId ? ({ ...it, ...patch } as SlotItem) : it)),
      },
    }))
  }

  // ─── Generation ──────────────────────────────────────────────

  function buildBreakfast(): MealPlanItem[] {
    if (!breakfast.enabled) return []
    const out: MealPlanItem[] = []
    if (whey && breakfast.whey_portion > 0) out.push(makeMealItem(whey, breakfast.whey_portion))
    if (egg && breakfast.egg_portion > 0) out.push(makeMealItem(egg, breakfast.egg_portion))
    const pool = breakfast.fruit_mode === 'random_all'
      ? fruits
      : fruits.filter((f) => breakfast.fruit_picks.includes(f.id))
    const picked = pickRandom(pool)
    if (picked) out.push(makeMealItem(picked, 1))
    return out
  }

  function buildSlot(slot: MealSlot): MealPlanItem[] {
    const cfg = slots[slot]
    if (!cfg.enabled) return []
    const out: MealPlanItem[] = []

    // Dinner gets a fixed whey item up front (user-set portion).
    if (slot === 'dinner' && whey && dinnerWheyPortion > 0) {
      out.push(makeMealItem(whey, dinnerWheyPortion))
    }

    const fixedFoods: SlotItem[] = []
    const randomFoodPool: SlotItem[] = []
    const categoryItems: SlotItem[] = []
    const anyItems: SlotItem[] = []

    cfg.items.forEach((it) => {
      if (it.kind === 'food') {
        if (it.is_random) randomFoodPool.push(it)
        else fixedFoods.push(it)
      } else if (it.kind === 'random_category') {
        categoryItems.push(it)
      } else {
        anyItems.push(it)
      }
    })

    fixedFoods.forEach((it) => {
      if (it.kind !== 'food') return
      const food = foodMap.get(it.food_id)
      if (food) out.push(makeMealItem(food, it.portion))
    })

    if (randomFoodPool.length > 0) {
      const picked = pickRandom(randomFoodPool)
      if (picked && picked.kind === 'food') {
        const food = foodMap.get(picked.food_id)
        if (food) out.push(makeMealItem(food, picked.portion))
      }
    }

    categoryItems.forEach((it) => {
      if (it.kind !== 'random_category') return
      const candidates = foods.filter((f) => f.category === it.category)
      const picked = pickRandom(candidates)
      if (picked) out.push(makeMealItem(picked, it.portion))
    })

    anyItems.forEach((it) => {
      if (it.kind !== 'random_all') return
      const picked = pickRandom(foods)
      if (picked) out.push(makeMealItem(picked, it.portion))
    })

    return out
  }

  async function applyPlan() {
    if (!user || !canApply || applying) return
    setApplying(true)
    try {
      const plans: MealPlan[] = dates.map((date) => ({
        date,
        breakfast: buildBreakfast(),
        lunch: buildSlot('lunch'),
        dinner: buildSlot('dinner'),
        snack: buildSlot('snack'),
        totals: { kcal: 0, protein_g: 0 },
      }))
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

      <BreakfastSection config={breakfast} fruits={fruits} whey={whey} egg={egg} onChange={setBreakfast} />

      {GENERIC_SLOTS.map((slot) => (
        <GenericSlotCard
          key={slot.id}
          slot={slots[slot.id]}
          slotId={slot.id}
          label={slot.label}
          foodMap={foodMap}
          onToggleEnabled={() => updateSlot(slot.id, { enabled: !slots[slot.id].enabled })}
          onShowAddMenu={() => setAddMenu(slot.id)}
          onRemove={(itemId) => removeItem(slot.id, itemId)}
          onUpdate={(itemId, patch) => updateItem(slot.id, itemId, patch)}
          extra={
            slot.id === 'dinner' && slots.dinner.enabled ? (
              <DinnerWheySlot
                whey={whey}
                portion={dinnerWheyPortion}
                onChange={setDinnerWheyPortion}
              />
            ) : null
          }
        />
      ))}

      <div style={{ height: 8 }} />
      <Button disabled={!canApply || applying} onClick={() => void applyPlan()}>
        {applying ? 'Applying...' : `Apply to ${dates.length} day${dates.length === 1 ? '' : 's'}`}
      </Button>

      {addMenu && (
        <AddItemMenu
          slotLabel={GENERIC_SLOTS.find((s) => s.id === addMenu)?.label ?? ''}
          onCancel={() => setAddMenu(null)}
          onPick={(mode) => {
            if (mode === 'all') {
              addItem(addMenu, { id: nextId(), kind: 'random_all', portion: 1 })
              setAddMenu(null)
            } else if (mode === 'specific') {
              setPicking({ slot: addMenu, mode: 'specific' })
              setAddMenu(null)
            } else {
              setPicking({ slot: addMenu, mode: 'category' })
              setAddMenu(null)
            }
          }}
        />
      )}

      {picking?.mode === 'specific' && (
        <FoodPickerLite
          foods={foods}
          slotLabel={GENERIC_SLOTS.find((s) => s.id === picking.slot)?.label ?? ''}
          onCancel={() => setPicking(null)}
          onPick={(food) => {
            addItem(picking.slot, { id: nextId(), kind: 'food', food_id: food.id, portion: 1, is_random: false })
            setPicking(null)
          }}
        />
      )}

      {picking?.mode === 'category' && (
        <CategoryPicker
          onCancel={() => setPicking(null)}
          onPick={(category) => {
            addItem(picking.slot, { id: nextId(), kind: 'random_category', category, portion: 1 })
            setPicking(null)
          }}
        />
      )}
    </SheetShell>
  )
}

// ─────────────────────────────────────────────────────────────
// Breakfast section — whey + egg + fruit
// ─────────────────────────────────────────────────────────────

function BreakfastSection({
  config, fruits, whey, egg, onChange,
}: {
  config: BreakfastConfig
  fruits: Food[]
  whey: Food | null
  egg: Food | null
  onChange: (next: BreakfastConfig) => void
}) {
  function patch(p: Partial<BreakfastConfig>) { onChange({ ...config, ...p }) }
  function toggleFruit(id: string) {
    const next = config.fruit_picks.includes(id)
      ? config.fruit_picks.filter((x) => x !== id)
      : [...config.fruit_picks, id]
    patch({ fruit_picks: next })
  }

  return (
    <Card padding={14} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: config.enabled ? 14 : 0 }}>
        <button
          className={styles.switch}
          data-on={config.enabled}
          onClick={() => patch({ enabled: !config.enabled })}
          type="button"
          aria-label="Toggle breakfast planning"
        >
          <span className={styles.switchKnob} />
        </button>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>Breakfast</span>
      </div>

      {config.enabled && (
        <>
          {/* Whey + Egg */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <p className={styles.fieldLabel}>Whey</p>
              {whey ? (
                <PortionStepper value={config.whey_portion} unit={whey.portion_unit} step={0.5} min={0} max={10} onChange={(v) => patch({ whey_portion: v })} />
              ) : (
                <MissingItemNote label="Add a 'Whey' food in Library" />
              )}
            </div>
            <div>
              <p className={styles.fieldLabel}>Egg</p>
              {egg ? (
                <PortionStepper value={config.egg_portion} unit={egg.portion_unit} step={1} min={0} max={10} onChange={(v) => patch({ egg_portion: v })} />
              ) : (
                <MissingItemNote label="Add 'ไข่ต้ม' in Library" />
              )}
            </div>
          </div>

          {/* Fruit mode */}
          <p className={styles.fieldLabel}>Fruit</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            <ModeChip active={config.fruit_mode === 'random_all'} label="Random all" onClick={() => patch({ fruit_mode: 'random_all' })} />
            <ModeChip active={config.fruit_mode === 'pick'} label="Pick specific" onClick={() => patch({ fruit_mode: 'pick' })} />
          </div>
          {config.fruit_mode === 'pick' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {fruits.length === 0 ? (
                <MissingItemNote label="No fruits in library. Add some first." />
              ) : (
                fruits.map((f) => {
                  const on = config.fruit_picks.includes(f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFruit(f.id)}
                      type="button"
                      style={{
                        padding: '6px 12px',
                        border: 0,
                        borderRadius: 'var(--r-pill)',
                        background: on ? 'var(--a1)' : 'var(--bg-soft)',
                        color: on ? '#fff' : 'var(--t-2)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {on ? '✓ ' : ''}{f.name}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function MissingItemNote({ label }: { label: string }) {
  return (
    <p style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600, padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--r-sm)' }}>
      ⚠ {label}
    </p>
  )
}

function ModeChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        padding: '10px 8px',
        border: active ? '2px solid var(--a1)' : '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        background: active ? 'var(--a-soft)' : 'var(--surface)',
        color: active ? 'var(--a1)' : 'var(--t-2)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {label}
    </button>
  )
}

function PortionStepper({ value, unit, step, min, max, onChange }: { value: number; unit: string; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const display = step % 1 === 0 ? value : value.toFixed(1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-soft)', borderRadius: 'var(--r-pill)', padding: '4px 8px', height: 38 }}>
      <button type="button" onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))} disabled={value <= min}
        style={{ width: 26, height: 26, borderRadius: '50%', border: 0, background: 'var(--surface)', cursor: 'pointer', fontWeight: 700, outline: 'none' }}>−</button>
      <span style={{ fontSize: 14, fontWeight: 800 }}>{display} <span style={{ fontSize: 11, color: 'var(--t-3)', fontWeight: 600 }}>{unit}</span></span>
      <button type="button" onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))} disabled={value >= max}
        style={{ width: 26, height: 26, borderRadius: '50%', border: 0, background: 'var(--surface)', cursor: 'pointer', fontWeight: 700, outline: 'none' }}>+</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Generic slot (lunch / dinner / snack)
// ─────────────────────────────────────────────────────────────

function GenericSlotCard({
  slot, slotId, label, foodMap, onToggleEnabled, onShowAddMenu, onRemove, onUpdate, extra,
}: {
  slot: GenericSlot
  slotId: MealSlot
  label: string
  foodMap: Map<string, Food>
  onToggleEnabled: () => void
  onShowAddMenu: () => void
  onRemove: (itemId: string) => void
  onUpdate: (itemId: string, patch: Partial<SlotItem>) => void
  extra?: React.ReactNode
}) {
  void slotId
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
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{label}</span>
        {slot.enabled ? (
          <button
            aria-label={`Add to ${label}`}
            className={styles.iconButton}
            onClick={onShowAddMenu}
            type="button"
            style={{ background: 'var(--a-soft)', color: 'var(--a1)' }}
          >
            <Icon name="plus" />
          </button>
        ) : null}
      </div>

      {slot.enabled && extra ? <div style={{ marginTop: 12 }}>{extra}</div> : null}

      {slot.enabled && slot.items.length > 0 ? (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slot.items.map((it) => (
            <SlotItemRow key={it.id} item={it} foodMap={foodMap} onUpdate={(patch) => onUpdate(it.id, patch)} onRemove={() => onRemove(it.id)} />
          ))}
        </div>
      ) : null}
    </Card>
  )
}

function DinnerWheySlot({
  whey, portion, onChange,
}: {
  whey: Food | null
  portion: number
  onChange: (v: number) => void
}) {
  if (!whey) {
    return <MissingItemNote label="Add a 'Whey' food in Library to enable dinner whey" />
  }
  return (
    <div>
      <p className={styles.fieldLabel}>Whey (fixed)</p>
      <PortionStepper value={portion} unit={whey.portion_unit} step={0.5} min={0} max={10} onChange={onChange} />
    </div>
  )
}

function SlotItemRow({
  item, foodMap, onUpdate, onRemove,
}: {
  item: SlotItem
  foodMap: Map<string, Food>
  onUpdate: (patch: Partial<SlotItem>) => void
  onRemove: () => void
}) {
  const isRandom = item.kind === 'random_category' || item.kind === 'random_all' || (item.kind === 'food' && item.is_random)

  let title = ''
  let unit = 'serving'
  if (item.kind === 'food') {
    const food = foodMap.get(item.food_id)
    title = food?.name ?? '(missing food)'
    unit = food?.portion_unit ?? 'serving'
  } else if (item.kind === 'random_category') {
    const cat = FOOD_CATEGORIES.find((c) => c.id === item.category)
    title = `🎲 Random ${cat?.label ?? item.category}`
  } else {
    title = '🎲 Random any food'
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        background: isRandom ? 'var(--a-soft)' : 'var(--bg-soft)',
        borderRadius: 'var(--r-sm)',
      }}
    >
      {item.kind === 'food' && (
        <button
          aria-label="Toggle random"
          onClick={() => onUpdate({ is_random: !item.is_random } as any)}
          type="button"
          style={{
            border: 0,
            background: item.is_random ? 'var(--a1)' : 'var(--surface)',
            color: item.is_random ? '#fff' : 'var(--t-3)',
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
      )}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{title}</span>
      <PortionMini value={item.portion} unit={unit} onChange={(v) => onUpdate({ portion: v } as any)} />
      <button aria-label="Remove" onClick={onRemove} type="button"
        style={{ border: 0, background: 'transparent', color: 'var(--t-3)', cursor: 'pointer', padding: 4, outline: 'none' }}>
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}

function PortionMini({ value, unit, onChange }: { value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', borderRadius: 999, padding: '2px 6px' }}>
      <button type="button" onClick={() => onChange(Math.max(0.25, Number((value - 0.25).toFixed(2))))}
        style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, fontSize: 14, color: 'var(--t-2)', outline: 'none' }}>−</button>
      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 30, textAlign: 'center' }}>
        {value % 1 === 0 ? value : value.toFixed(2)} {unit}
      </span>
      <button type="button" onClick={() => onChange(Number((value + 0.25).toFixed(2)))}
        style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, fontSize: 14, color: 'var(--t-2)', outline: 'none' }}>+</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Add item menu — pick mode (specific / category / all)
// ─────────────────────────────────────────────────────────────

function AddItemMenu({ slotLabel, onPick, onCancel }: { slotLabel: string; onPick: (mode: 'specific' | 'category' | 'all') => void; onCancel: () => void }) {
  return (
    <FullscreenModal onClose={onCancel} title={slotLabel} zIndex={130}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ModeButton icon="fork" title="Pick specific food" onClick={() => onPick('specific')} />
        <ModeButton icon="sparkle" title="Random by category" onClick={() => onPick('category')} />
        <ModeButton icon="sparkle" title="Random any food" onClick={() => onPick('all')} />
      </div>
    </FullscreenModal>
  )
}

function ModeButton({ icon, title, onClick }: { icon: 'fork' | 'sparkle'; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface)',
        cursor: 'pointer',
        outline: 'none',
        textAlign: 'left',
      }}
    >
      <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--a-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon color="var(--a1)" name={icon} size={18} />
      </span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{title}</span>
      <Icon color="var(--t-3)" name="chevron" size={14} />
    </button>
  )
}

function CategoryPicker({ onPick, onCancel }: { onPick: (cat: FoodCategory) => void; onCancel: () => void }) {
  return (
    <FullscreenModal onClose={onCancel} title="Pick category" zIndex={140}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FOOD_CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => onPick(cat.id)} type="button"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--surface)', cursor: 'pointer', outline: 'none', textAlign: 'left' }}>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{cat.label}</span>
            <Icon color="var(--t-3)" name="chevron" size={14} />
          </button>
        ))}
      </div>
    </FullscreenModal>
  )
}

// ─────────────────────────────────────────────────────────────
// Food picker (specific food)
// ─────────────────────────────────────────────────────────────

function FoodPickerLite({
  foods, slotLabel, onPick, onCancel,
}: {
  foods: Food[]
  slotLabel: string
  onPick: (food: Food) => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FoodCategory | 'all'>('all')
  const filterLabel = filter === 'all' ? 'All' : FOOD_CATEGORIES.find((c) => c.id === filter)?.label ?? 'category'
  const filtered = foods.filter((f) => {
    if (filter !== 'all' && f.category !== filter) return false
    const q = query.trim().toLowerCase()
    if (q && !f.name.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <FullscreenModal onClose={onCancel} title={`Pick food for ${slotLabel}`} zIndex={130}>
        <div>
          <input
            type="search"
            placeholder={`Search in ${filterLabel}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: 0, background: 'var(--bg-soft)', borderRadius: 'var(--r-md)', outline: 'none', fontFamily: 'inherit', color: 'var(--t-1)', marginBottom: 10 }}
          />
          <div className="dq-h-scroll" style={{ margin: '0 -20px 12px 0', paddingRight: 20 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="dq-seg-item"
                data-active={filter === 'all'}
                type="button"
                onClick={() => setFilter('all')}
                style={{ border: 0, flex: '0 0 auto', padding: '6px 12px', fontSize: 12 }}
              >
                All
              </button>
              {FOOD_CATEGORIES.map((cat) => (
                <button
                  className="dq-seg-item"
                  data-active={filter === cat.id}
                  key={cat.id}
                  type="button"
                  onClick={() => setFilter(cat.id)}
                  style={{ border: 0, flex: '0 0 auto', padding: '6px 12px', fontSize: 12 }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          {filtered.length === 0 ? (
            <p className={styles.subtitle} style={{ textAlign: 'center', padding: 20 }}>
              {foods.length === 0
                ? 'Library empty. Add foods in Library tab.'
                : query
                  ? `No match for "${query}" in ${filterLabel}.`
                  : `No foods in ${filterLabel}.`}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((food) => (
                <button key={food.id} onClick={() => onPick(food)} type="button"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', width: '100%', textAlign: 'left', cursor: 'pointer', outline: 'none' }}>
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>{food.name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--t-3)' }}>{food.kcal_per_portion} kcal · {food.protein_g_per_portion}g / {food.portion_unit}</span>
                  </span>
                  <Icon color="var(--a1)" name="plus" size={16} />
                </button>
              ))}
            </div>
          )}
        </div>
    </FullscreenModal>
  )
}

// ─────────────────────────────────────────────────────────────
// Bulk WORKOUT planner (unchanged from v1.3.0)
// ─────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function BulkWorkoutPlanner({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [{ start, end }, setRange] = useState(defaultRange())
  const [weekdays, setWeekdays] = useState<boolean[]>([false, true, true, true, true, true, true])
  const [type, setType] = useState<WorkoutPlanType>('incline_walk')
  const [kcalTarget, setKcalTarget] = useState(200)
  const [restOnOffDays, setRestOnOffDays] = useState(false)
  const [applying, setApplying] = useState(false)

  const allDates = useMemo(() => datesInRange(start, end), [start, end])
  const activeDates = useMemo(() => allDates.filter((d) => weekdays[new Date(d).getDay()]), [allDates, weekdays])
  const restDates = useMemo(() => (restOnOffDays ? allDates.filter((d) => !weekdays[new Date(d).getDay()]) : []), [allDates, weekdays, restOnOffDays])

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
      activeDates.forEach((date) => plans.push({ date, type, duration_min: type === 'rest' ? 0 : kcalTarget, kcal_target: type === 'rest' ? 0 : kcalTarget }))
      restDates.forEach((date) => plans.push({ date, type: 'rest', duration_min: 0, kcal_target: 0 }))
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
            <button key={label} onClick={() => toggleWeekday(i)} type="button"
              style={{ padding: '10px 0', border: 0, borderRadius: 'var(--r-sm)', background: weekdays[i] ? 'var(--a1)' : 'var(--bg-soft)', color: weekdays[i] ? '#fff' : 'var(--t-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
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
          {WORKOUT_PLAN_TYPES.filter((t) => t.id !== 'rest' && t.id !== 'other').map((t) => (
            <button key={t.id} onClick={() => setType(t.id)} type="button"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: type === t.id ? '2px solid var(--a1)' : '1px solid var(--line)', borderRadius: 'var(--r-md)', background: type === t.id ? 'var(--a-soft)' : 'var(--surface)', cursor: 'pointer', outline: 'none', fontWeight: 700, color: type === t.id ? 'var(--a1)' : 'var(--t-1)', fontSize: 13 }}>
              <Icon name={t.icon as any} size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Stepper label="Target burn (per day)" suffix="kcal" value={kcalTarget} onChange={setKcalTarget} min={10} max={2000} step={10} />
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={restOnOffDays} onChange={(e) => setRestOnOffDays(e.target.checked)} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Mark off-days as Rest</span>
        </label>
      </Card>

      <Button disabled={!canApply || applying} onClick={() => void applyPlan()}>
        {applying ? 'Applying...' : `Apply to ${totalDates} day${totalDates === 1 ? '' : 's'}`}
      </Button>
    </SheetShell>
  )
}
