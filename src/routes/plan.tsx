import { useEffect, useMemo, useState } from 'react'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Skeleton, Stepper } from '@/components/primitives'
import { CalendarTab } from '@/components/plan/Calendar'
import { FullscreenModal } from '@/components/plan/FullscreenModal'
import { useFoods } from '@/hooks/useFoods'
import { useUser } from '@/hooks/useUser'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'
import { FOOD_CATEGORIES, type Food, type FoodCategory } from '@/types/domain'

type PlanTab = 'calendar' | 'library'

export function PlanRoute() {
  const { error: userError } = useUser()
  const [tab, setTab] = useState<PlanTab>('calendar')

  useEffect(() => {
    if (userError) toast.error("Couldn't load plan settings. Try again.")
  }, [userError])

  return (
    <AppScreen activeNav="plan">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <div className="dq-seg" style={{ width: '100%', margin: '14px 0 16px' }}>
          {(['calendar', 'library'] as PlanTab[]).map((id) => (
            <button
              className="dq-seg-item"
              data-active={tab === id}
              key={id}
              onClick={() => setTab(id)}
              type="button"
              style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none', textTransform: 'capitalize' }}
            >
              {id}
            </button>
          ))}
        </div>

        {tab === 'calendar' ? <CalendarTab /> : <LibraryTab />}
      </div>
    </AppScreen>
  )
}

// CalendarTab imported from '@/components/plan/Calendar'

// ─────────────────────────────────────────────────────────────
// Library tab
// ─────────────────────────────────────────────────────────────

type FilterCategory = FoodCategory | 'all'

function LibraryTab() {
  const { data: foods, loading, error, add, update, remove } = useFoods()
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Food | 'new' | null>(null)

  useEffect(() => {
    if (error) toast.error("Couldn't load food library.")
  }, [error])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return foods.filter((food) => {
      if (filter !== 'all' && food.category !== filter) return false
      if (q && !food.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [foods, filter, query])

  async function handleSave(food: Omit<Food, 'id' | 'created_at' | 'updated_at'>, id?: string) {
    try {
      if (id) {
        await update(id, food)
        toast.success(`Updated ${food.name}`)
      } else {
        await add(food)
        toast.success(`Added ${food.name}`)
      }
      haptic(10)
      setEditing(null)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save food. Try again.")
      haptic([20, 40, 20])
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" from library?`)) return
    try {
      await remove(id)
      toast.success(`Removed ${name}`)
      haptic(10)
      setEditing(null)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't delete. Try again.")
      haptic([20, 40, 20])
    }
  }

  return (
    <>
      <Card padding={10} style={{ marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Search food by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: 14,
            border: 0,
            background: 'var(--bg-soft)',
            borderRadius: 'var(--r-md)',
            outline: 'none',
            fontFamily: 'inherit',
            color: 'var(--t-1)',
          }}
        />
      </Card>

      <Button icon="plus" onClick={() => setEditing('new')} variant="secondary" style={{ marginBottom: 12 }}>
        Add food
      </Button>

      <div className="dq-h-scroll" style={{ margin: '0 -20px 14px 0', paddingRight: 20 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <CategoryChip active={filter === 'all'} label="All" onClick={() => setFilter('all')} />
          {FOOD_CATEGORIES.map((cat) => (
            <CategoryChip
              active={filter === cat.id}
              key={cat.id}
              label={cat.label}
              onClick={() => setFilter(cat.id)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skeleton width={36} height={36} variant="circle" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton width="45%" height={16} variant="text" />
                <Skeleton width="70%" height={12} variant="text" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding={22} style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <Icon color="var(--t-3)" name="fork" size={28} />
          <p className={styles.subtitle} style={{ marginTop: 10 }}>
            {foods.length === 0 ? 'Loading shared library...' : 'No foods match this filter.'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((food) => (
            <FoodRow food={food} key={food.id} onClick={() => setEditing(food)} />
          ))}
        </div>
      )}

      {editing && (
        <FoodEditSheet
          food={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onDelete={editing !== 'new' ? (id) => void handleDelete(id, editing.name) : undefined}
          onSave={(food) => void handleSave(food, editing === 'new' ? undefined : editing.id)}
        />
      )}
    </>
  )
}

function CategoryChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className="dq-seg-item"
      data-active={active}
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

function FoodRow({ food, onClick }: { food: Food; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        outline: 'none',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <strong style={{ fontSize: 15, color: 'var(--t-1)' }}>{food.name}</strong>
        <span style={{ fontSize: 12, color: 'var(--t-2)', fontWeight: 600 }}>
          {food.kcal_per_portion} kcal · {food.protein_g_per_portion}g · per {food.portion_unit}
        </span>
      </span>
      <Icon color="var(--t-3)" name="chevron" size={16} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Food add/edit sheet
// ─────────────────────────────────────────────────────────────

function FoodEditSheet({
  food,
  onSave,
  onDelete,
  onCancel,
}: {
  food: Food | null
  onSave: (food: Omit<Food, 'id' | 'created_at' | 'updated_at'>) => void
  onDelete?: (id: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(food?.name ?? '')
  const [category, setCategory] = useState<FoodCategory>(food?.category ?? 'food')
  const [portionUnit, setPortionUnit] = useState(food?.portion_unit ?? 'serving')
  const [kcal, setKcal] = useState(food?.kcal_per_portion ?? 100)
  const [protein, setProtein] = useState(food?.protein_g_per_portion ?? 10)

  const canSave = name.trim().length > 0 && kcal >= 0 && protein >= 0

  function submit() {
    if (!canSave) {
      toast.error('Name is required.')
      return
    }
    onSave({
      name: name.trim(),
      category,
      portion_unit: portionUnit.trim() || 'serving',
      kcal_per_portion: kcal,
      protein_g_per_portion: protein,
    })
  }

  return (
    <FullscreenModal onClose={onCancel} title={food ? 'Edit food' : 'New food'} zIndex={100}>
        <div>
          <p className={styles.fieldLabel}>Name</p>
          <input
            type="text"
            value={name}
            placeholder="e.g. Whey BAAM, ไก่อกย่าง, แอปเปิ้ลเขียว"
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 16,
              fontWeight: 700,
              border: 0,
              background: 'var(--bg-soft)',
              borderRadius: 'var(--r-md)',
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--t-1)',
              marginBottom: 18,
            }}
          />

          <p className={styles.fieldLabel}>Category</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {FOOD_CATEGORIES.map((cat) => (
              <CategoryChip
                active={category === cat.id}
                key={cat.id}
                label={cat.label}
                onClick={() => setCategory(cat.id)}
              />
            ))}
          </div>

          <p className={styles.fieldLabel}>Portion unit</p>
          <input
            type="text"
            value={portionUnit}
            placeholder="scoop, ลูก, ชิ้น, g, ml, cup..."
            onChange={(e) => setPortionUnit(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              border: 0,
              background: 'var(--bg-soft)',
              borderRadius: 'var(--r-md)',
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--t-1)',
              marginBottom: 18,
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <Stepper label="kcal / portion" suffix="kcal" value={kcal} onChange={setKcal} min={0} max={2000} step={5} />
            <Stepper label="Protein / portion" suffix="g" value={protein} onChange={setProtein} min={0} max={200} step={0.5} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button disabled={!canSave} onClick={submit}>
              {food ? 'Save changes' : 'Add to library'}
            </Button>
            {food && onDelete ? (
              <Button onClick={() => onDelete(food.id)} variant="ghost" style={{ color: '#991B1B' }}>
                Delete food
              </Button>
            ) : null}
          </div>
        </div>
    </FullscreenModal>
  )
}
