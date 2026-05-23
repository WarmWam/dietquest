import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Skeleton } from '@/components/primitives'
import { DEFAULT_BREAKFAST } from '@/data/defaults'
import { todayKey } from '@/lib/dates'
import { useMeals } from '@/hooks/useMeals'
import { usePresets } from '@/hooks/usePresets'
import { useMealDraft } from '@/stores/mealDraft'
import type { MealType } from '@/types/domain'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'

export function LogMealRoute() {
  const navigate = useNavigate()
  const { data: presets, loading, error } = usePresets()
  const { mealType, setMealType, setSelectedPreset } = useMealDraft()

  useEffect(() => {
    const now = new Date()
    const hours = now.getHours()
    let initialType: MealType = 'breakfast'
    if (hours >= 4 && hours < 10) {
      initialType = 'breakfast'
    } else if (hours >= 10 && hours < 15) {
      initialType = 'lunch'
    } else if (hours >= 15 && hours < 22) {
      initialType = 'dinner'
    } else {
      initialType = 'snack'
    }
    setMealType(initialType)
  }, [setMealType])

  useEffect(() => {
    if (error) toast.error("Couldn't load meal presets. Try again.")
  }, [error])

  const filteredPresets = presets.filter((p) => p.meal_type === mealType)
  const displayPresets = filteredPresets.length > 0 ? filteredPresets : presets

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={() => navigate('/')} type="button">
            <Icon name="x" />
          </button>
          <strong>Log meal</strong>
          <span style={{ width: 40 }} />
        </header>
        <p className={styles.fieldLabel}>Which meal?</p>
        <div className="dq-seg" style={{ width: '100%', marginBottom: 18 }}>
          {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((item) => {
            const option = item.toLowerCase() as MealType
            return (
              <button
                className="dq-seg-item"
                data-active={mealType === option}
                key={item}
                onClick={() => setMealType(option)}
                type="button"
                style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none' }}
              >
                {item}
              </button>
            )
          })}
        </div>

        <Section title={`Suggested for ${mealType}`} />
        <div className={styles.presetList}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton width={36} height={36} variant="circle" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton width="45%" height={16} variant="text" />
                    <Skeleton width="70%" height={12} variant="text" />
                  </div>
                  <Skeleton width={16} height={16} variant="circle" />
                </Card>
              ))}
            </div>
          ) : presets.length === 0 ? (
            <button
              className={styles.presetRow}
              onClick={() => {
                setSelectedPreset(DEFAULT_BREAKFAST)
                navigate('/log/meal/confirm')
              }}
              type="button"
              style={{ width: '100%', textAlign: 'left', borderStyle: 'dashed' }}
            >
              <span className={styles.mealIcon}>🍽️</span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Starter preset</span>
                <span className={styles.rowSub}>No saved presets yet. Click to log default breakfast.</span>
              </span>
              <Icon color="var(--a1)" name="plus" size={16} />
            </button>
          ) : (
            displayPresets.slice(0, 4).map((preset, index) => (
              <button
                className={styles.presetRow}
                data-highlight={index === 0}
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset)
                  navigate('/log/meal/confirm')
                }}
                type="button"
              >
                <span className={styles.mealIcon}>{preset.icon || '🍽️'}</span>
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{preset.name}</span>
                  <span className={styles.rowSub}>
                    {preset.tag} - {preset.total_kcal} kcal - {preset.total_protein_g}g P
                  </span>
                </span>
                {index === 0 ? <span className="dq-pill">Top pick</span> : null}
                <Icon color="var(--t-3)" name="chevron" size={16} />
              </button>
            ))
          )}
        </div>
        <Button
          icon="plus"
          onClick={() => {
            setSelectedPreset({
              ...DEFAULT_BREAKFAST,
              id: 'custom-meal',
              name: 'Custom meal',
              tag: 'Build your own',
              meal_type: mealType,
            })
            navigate('/log/meal/confirm')
          }}
          variant="secondary"
        >
          Build custom meal
        </Button>
      </div>
    </AppScreen>
  )
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
      if (preset.id !== DEFAULT_BREAKFAST.id && preset.id !== 'custom-meal') {
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
