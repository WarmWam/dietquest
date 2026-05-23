import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { DEFAULT_BREAKFAST } from '@/data/defaults'
import { todayKey } from '@/lib/dates'
import { useMeals } from '@/hooks/useMeals'
import { usePresets } from '@/hooks/usePresets'
import type { MealPreset } from '@/types/domain'

function useSelectedPreset(): MealPreset {
  const { data } = usePresets()
  return data[0] ?? DEFAULT_BREAKFAST
}

export function LogMealRoute() {
  const navigate = useNavigate()
  const { data: presets, loading } = usePresets()

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <header className={styles.screenHeader}>
          <button className={styles.iconButton} onClick={() => navigate('/')} type="button">
            <Icon name="x" />
          </button>
          <strong>Log meal</strong>
          <button className={styles.iconButton} type="button">
            <Icon name="search" />
          </button>
        </header>
        <p className={styles.fieldLabel}>Which meal?</p>
        <div className="dq-seg" style={{ width: '100%', marginBottom: 18 }}>
          {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((item, index) => (
            <span className="dq-seg-item" data-active={index === 0} key={item} style={{ flex: 1, justifyContent: 'center' }}>
              {item}
            </span>
          ))}
        </div>

        <Section title="Suggested for breakfast" />
        <div className={styles.presetList}>
          {loading ? (
            <Card padding={16}>
              <p className={styles.subtitle}>Loading presets...</p>
            </Card>
          ) : presets.length === 0 ? (
            <Card padding={16}>
              <strong>Starter preset</strong>
              <p className={styles.subtitle}>No saved presets yet. Use the default breakfast to create your first meal log.</p>
            </Card>
          ) : (
            presets.slice(0, 4).map((preset, index) => (
              <button className={styles.presetRow} data-highlight={index === 0} key={preset.id} onClick={() => navigate('/log/meal/confirm')} type="button">
                <span className={styles.mealIcon}>{preset.icon}</span>
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
        <Button icon="plus" onClick={() => navigate('/log/meal/confirm')} variant="secondary">
          Build custom meal
        </Button>
      </div>
    </AppScreen>
  )
}

export function LogMealConfirmRoute() {
  const navigate = useNavigate()
  const preset = useSelectedPreset()
  const { add } = useMeals()
  const { markUsed } = usePresets()
  const [saving, setSaving] = useState(false)
  const carbs = preset.items.reduce((sum, item) => sum + item.carb_g, 0)
  const fat = preset.items.reduce((sum, item) => sum + item.fat_g, 0)

  async function saveMeal() {
    setSaving(true)
    try {
      await add({
        date: todayKey(),
        meal_type: preset.meal_type,
        items: preset.items,
        total_kcal: preset.total_kcal,
        total_protein_g: preset.total_protein_g,
        total_carb_g: carbs,
        total_fat_g: fat,
      })
      if (preset.id !== DEFAULT_BREAKFAST.id) await markUsed(preset.id)
      navigate('/log/meal/saved')
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
            <p className="dq-eyebrow">Breakfast</p>
            <strong>Confirm meal</strong>
          </div>
          <button className={styles.iconButton} type="button">
            <Icon name="edit" />
          </button>
        </header>

        <div className={styles.heroPanel}>
          <p className="dq-eyebrow" style={{ color: 'rgba(255,255,255,.82)' }}>
            Total - meal
          </p>
          <div className={styles.heroKpi}>
            {preset.total_kcal}
            <span style={{ fontSize: 14 }}>kcal</span>
          </div>
          <div className={styles.macroGrid}>
            <span>{preset.total_protein_g}g protein</span>
            <span>{carbs}g carbs</span>
            <span>{fat}g fat</span>
          </div>
        </div>

        <Section title="Items" />
        <Card padding={0}>
          {preset.items.map((item) => (
            <div className={styles.habitRow} key={item.name} style={{ padding: 14 }}>
              <span className={styles.rowText}>
                <strong>{item.name}</strong>
                <span className={styles.rowSub}>
                  {item.kcal} kcal - {item.protein_g}g P - {item.carb_g}g C - {item.fat_g}g F
                </span>
              </span>
              <span className="dq-pill">{item.portion}x</span>
            </div>
          ))}
        </Card>

        <div className={styles.pageFooter}>
          <Button onClick={() => void saveMeal()}>{saving ? 'Saving...' : `Save - ${preset.total_kcal} kcal`}</Button>
        </div>
      </div>
    </AppScreen>
  )
}

export function LogMealSavedRoute() {
  const navigate = useNavigate()

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <div className={styles.fullCenter}>
          <div>
            <div className={styles.successMark}>
              <Icon color="#fff" name="check" size={86} stroke={3} />
            </div>
            <h1 className={styles.headerTitle}>Breakfast logged</h1>
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
