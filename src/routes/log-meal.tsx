import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { DEFAULT_BREAKFAST } from '@/data/defaults'
import { todayKey } from '@/lib/dates'
import { useFoods } from '@/hooks/useFoods'
import { useMeals } from '@/hooks/useMeals'
import { usePresets } from '@/hooks/usePresets'
import { useMealDraft } from '@/stores/mealDraft'
import { FOOD_CATEGORIES, type Food, type FoodCategory, type MealType } from '@/types/domain'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'

type DraftItem = { food_id: string; portion: number }

export function LogMealRoute() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lockedMeal = parseMealType(params.get('meal'))
  const { data: foods, loading: foodsLoading, error: foodsError } = useFoods()
  const { add: addMeal, error: mealsError } = useMeals()
  const { mealType, setMealType } = useMealDraft()
  const [category, setCategory] = useState<FoodCategory>('food')
  const [draft, setDraft] = useState<DraftItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lockedMeal) {
      setMealType(lockedMeal)
      return
    }
    const now = new Date()
    const hours = now.getHours()
    let initialType: MealType = 'breakfast'
    if (hours >= 4 && hours < 10) initialType = 'breakfast'
    else if (hours >= 10 && hours < 15) initialType = 'lunch'
    else if (hours >= 15 && hours < 22) initialType = 'dinner'
    else initialType = 'snack'
    setMealType(initialType)
  }, [lockedMeal, setMealType])

  useEffect(() => {
    if (foodsError || mealsError) toast.error("Couldn't load options. Try again.")
  }, [foodsError, mealsError])

  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
  const filteredFoods = foods.filter((food) => food.category === category)
  const draftSelectedIds = useMemo(() => new Set(draft.map((d) => d.food_id)), [draft])

  const totals = useMemo(() => {
    let kcal = 0, protein = 0
    for (const it of draft) {
      const food = foodMap.get(it.food_id)
      if (!food) continue
      kcal += Math.round(food.kcal_per_portion * it.portion)
      protein += Math.round(food.protein_g_per_portion * it.portion * 10) / 10
    }
    return { kcal, protein: Math.round(protein * 10) / 10 }
  }, [draft, foodMap])

  function toggleFood(food: Food) {
    setDraft((cur) => {
      if (cur.some((d) => d.food_id === food.id)) return cur.filter((d) => d.food_id !== food.id)
      return [...cur, { food_id: food.id, portion: 1 }]
    })
    haptic(5)
  }

  function setPortion(foodId: string, delta: number) {
    setDraft((cur) =>
      cur.map((d) =>
        d.food_id === foodId
          ? { ...d, portion: Math.max(0.25, Number((d.portion + delta).toFixed(2))) }
          : d,
      ),
    )
  }

  function removeFromDraft(foodId: string) {
    setDraft((cur) => cur.filter((d) => d.food_id !== foodId))
  }

  async function saveMeal() {
    if (draft.length === 0 || saving) return
    setSaving(true)
    try {
      const items = draft
        .map((d) => {
          const food = foodMap.get(d.food_id)
          if (!food) return null
          return {
            name: food.name,
            portion: d.portion,
            unit: food.portion_unit,
            kcal: Math.round(food.kcal_per_portion * d.portion),
            protein_g: Math.round(food.protein_g_per_portion * d.portion * 10) / 10,
            carb_g: 0,
            fat_g: 0,
          }
        })
        .filter((it): it is NonNullable<typeof it> => it !== null)
      await addMeal({
        date: todayKey(),
        meal_type: mealType,
        items,
        total_kcal: totals.kcal,
        total_protein_g: totals.protein,
        total_carb_g: 0,
        total_fat_g: 0,
      })
      toast.success(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} logged · ${totals.kcal} kcal`)
      haptic(10)
      navigate('/')
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save meal.")
      haptic([20, 40, 20])
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`} style={{ paddingBottom: draft.length > 0 ? 140 : 24 }}>
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={() => navigate('/')} type="button">
            <Icon name="x" />
          </button>
          <strong>Log meal</strong>
          <span style={{ width: 40 }} />
        </header>
        {lockedMeal ? (
          <Card padding={14} style={{ marginBottom: 18 }}>
            <p className="dq-eyebrow">Logging for</p>
            <strong style={{ textTransform: 'capitalize' }}>{mealType}</strong>
          </Card>
        ) : (
          <>
            <p className={styles.fieldLabel}>Which meal?</p>
            <div className="dq-seg" style={{ width: '100%', marginBottom: 18 }}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((option) => (
                <button
                  className="dq-seg-item"
                  data-active={mealType === option}
                  key={option}
                  onClick={() => setMealType(option)}
                  type="button"
                  style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none', textTransform: 'capitalize' }}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        <Section title="Pick from library" />
        <div className="dq-h-scroll" style={{ margin: '0 -20px 14px 0', paddingRight: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {FOOD_CATEGORIES.map((cat) => (
              <button
                className="dq-seg-item"
                data-active={category === cat.id}
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                type="button"
                style={{ border: 0, flex: '0 0 auto', padding: '8px 14px' }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.presetList}>
          {foodsLoading ? (
            <p className={styles.subtitle}>Loading foods...</p>
          ) : filteredFoods.length === 0 ? (
            <Card padding={14} style={{ borderStyle: 'dashed' }}>
              <p className={styles.subtitle}>No foods in this category yet.</p>
            </Card>
          ) : (
            filteredFoods.map((food) => {
              const isSelected = draftSelectedIds.has(food.id)
              return (
                <button
                  key={food.id}
                  onClick={() => toggleFood(food)}
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    background: isSelected ? 'color-mix(in oklab, var(--a-soft) 60%, var(--surface))' : 'var(--surface)',
                    border: isSelected ? '1px solid var(--a1)' : '1px solid var(--line)',
                    borderRadius: 'var(--r-md)',
                    width: '100%', textAlign: 'left', cursor: 'pointer', outline: 'none', boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, color: 'var(--t-1)' }}>{food.name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--t-2)', fontWeight: 600 }}>
                      {food.kcal_per_portion} kcal · {food.protein_g_per_portion}g · per {food.portion_unit}
                    </span>
                  </span>
                  <Icon color={isSelected ? 'var(--a1)' : 'var(--t-3)'} name={isSelected ? 'check' : 'plus'} size={18} />
                </button>
              )
            })
          )}
        </div>
      </div>

      {draft.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 0, right: 0, bottom: 0,
            zIndex: 90,
            background: 'var(--surface)',
            borderTop: '1px solid var(--line)',
            padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)',
            boxShadow: '0 -8px 24px rgba(15,23,42,0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
            {draft.map((it) => {
              const food = foodMap.get(it.food_id)
              if (!food) return null
              return (
                <div key={it.food_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{food.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-soft)', borderRadius: 999, padding: '2px 6px' }}>
                    <button type="button" onClick={() => setPortion(it.food_id, -0.25)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2, fontSize: 13, color: 'var(--t-2)', outline: 'none' }}>−</button>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>{it.portion % 1 === 0 ? it.portion : it.portion.toFixed(2)} {food.portion_unit}</span>
                    <button type="button" onClick={() => setPortion(it.food_id, 0.25)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2, fontSize: 13, color: 'var(--t-2)', outline: 'none' }}>+</button>
                  </div>
                  <button aria-label="Remove" onClick={() => removeFromDraft(it.food_id)} type="button" style={{ border: 0, background: 'transparent', color: 'var(--t-3)', cursor: 'pointer', padding: 4, outline: 'none' }}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              )
            })}
          </div>
          <Button disabled={saving} onClick={() => void saveMeal()}>
            {saving ? 'Saving...' : `Save ${draft.length} item${draft.length === 1 ? '' : 's'} · ${totals.kcal} kcal`}
          </Button>
        </div>
      )}
    </AppScreen>
  )
}

function parseMealType(value: string | null): MealType | null {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack' ? value : null
}

export function LogMealConfirmRoute() {
  const navigate = useNavigate()
  const { add, error: mealsError } = useMeals()
  const { markUsed, error: presetsError } = usePresets()
  const { mealType, selectedPreset } = useMealDraft()
  const [saving, setSaving] = useState(false)

  const preset = selectedPreset ?? DEFAULT_BREAKFAST
  const [portions, setPortions] = useState<number[]>(() => preset.items.map((item) => item.portion))

  useEffect(() => {
    if (mealsError || presetsError) toast.error("Couldn't load meal data. Try again.")
  }, [mealsError, presetsError])

  function adjustPortion(index: number, delta: number) {
    setPortions((prev) => {
      const next = [...prev]
      next[index] = Math.max(0.25, Math.min(5, Number((next[index] + delta).toFixed(2))))
      return next
    })
  }

  const adjustedItems = preset.items.map((item, i) => {
    const scale = portions[i] / item.portion
    return {
      ...item,
      portion: portions[i],
      kcal: Math.round(item.kcal * scale),
      protein_g: Math.round(item.protein_g * scale),
      carb_g: Math.round(item.carb_g * scale),
      fat_g: Math.round(item.fat_g * scale),
    }
  })

  const totalKcal = adjustedItems.reduce((sum, item) => sum + item.kcal, 0)
  const totalProtein = adjustedItems.reduce((sum, item) => sum + item.protein_g, 0)
  const totalCarbs = adjustedItems.reduce((sum, item) => sum + item.carb_g, 0)
  const totalFat = adjustedItems.reduce((sum, item) => sum + item.fat_g, 0)

  async function saveMeal() {
    setSaving(true)
    try {
      await add({
        date: todayKey(),
        meal_type: mealType,
        items: adjustedItems,
        total_kcal: totalKcal,
        total_protein_g: totalProtein,
        total_carb_g: totalCarbs,
        total_fat_g: totalFat,
      })
      if (preset.id !== DEFAULT_BREAKFAST.id && preset.id !== 'custom-meal' && !preset.id.startsWith('food-')) {
        await markUsed(preset.id)
      }
      toast.success(`Saved · ${totalKcal} kcal`)
      haptic(10)
      navigate('/log/meal/saved')
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save. Tap to retry.")
      haptic([20, 40, 20])
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={() => navigate('/log/meal')} type="button">
            <Icon name="chevronL" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p className="dq-eyebrow" style={{ textTransform: 'capitalize' }}>
              {mealType}
            </p>
            <strong>Confirm meal</strong>
          </div>
          <span style={{ width: 40 }} />
        </header>

        <div className={styles.heroPanel}>
          <p className="dq-eyebrow" style={{ color: 'rgba(255,255,255,.82)' }}>
            Total - meal
          </p>
          <div className={styles.heroKpi}>
            {totalKcal}
            <span style={{ fontSize: 14 }}>kcal</span>
          </div>
          <div className={styles.macroGrid}>
            <span>{totalProtein}g protein</span>
            <span>{totalCarbs}g carbs</span>
            <span>{totalFat}g fat</span>
          </div>
        </div>

        <Section title="Items" />
        <Card padding={0}>
          {adjustedItems.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--t-3)' }}>
              No items in this meal yet.
            </div>
          ) : (
            adjustedItems.map((item, index) => (
              <div className={styles.habitRow} key={item.name} style={{ padding: 14 }}>
                <span className={styles.rowText}>
                  <strong>{item.name}</strong>
                  <span className={styles.rowSub}>
                    {item.kcal} kcal - {item.protein_g}g P - {item.carb_g}g C - {item.fat_g}g F
                  </span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => adjustPortion(index, -0.5)}
                    disabled={portions[index] <= 0.25}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: 0, background: 'var(--bg-soft)', fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}
                  >
                    −
                  </button>
                  <span className="dq-num" style={{ fontSize: 14, minWidth: 32, textAlign: 'center' }}>
                    {portions[index]}x
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustPortion(index, 0.5)}
                    disabled={portions[index] >= 5}
                    style={{ width: 26, height: 26, borderRadius: '50%', border: 0, background: 'var(--bg-soft)', fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>

        <div className={styles.pageFooter}>
          <Button onClick={() => void saveMeal()}>{saving ? 'Saving...' : `Save - ${totalKcal} kcal`}</Button>
        </div>
      </div>
    </AppScreen>
  )
}

export function LogMealSavedRoute() {
  const navigate = useNavigate()
  const { mealType } = useMealDraft()
  const displayTitle = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} logged`

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <div className={styles.fullCenter}>
          <div>
            <div className={styles.successMark}>
              <Icon color="#fff" name="check" size={86} stroke={3} />
            </div>
            <h1 className={styles.headerTitle}>{displayTitle}</h1>
            <p className={styles.subtitle}>Saved to Firebase and synced to today's totals.</p>
            <div style={{ height: 22 }} />
            <span className="dq-pill">
              <Icon color="var(--a1)" fill="var(--a1)" name="flame" size={14} />
              Streak ready
            </span>
          </div>
        </div>
        <Button onClick={() => navigate('/')}>Back to home</Button>
      </div>
    </AppScreen>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div className={styles.sectionLabel}>
      <span className="dq-eyebrow">{title}</span>
    </div>
  )
}
