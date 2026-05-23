import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { MOCK_PRESETS } from '@/lib/mock'

export function LogMealRoute() {
  const navigate = useNavigate()

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
          {MOCK_PRESETS.slice(0, 4).map((preset, index) => (
            <button className={styles.presetRow} data-highlight={index === 0} key={preset.id} onClick={() => navigate('/log/meal/confirm')} type="button">
              <span className={styles.mealIcon}>{preset.icon}</span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{preset.name}</span>
                <span className={styles.rowSub}>
                  {preset.tag} · {preset.total_kcal} kcal · {preset.total_protein_g}g P
                </span>
              </span>
              {index === 0 ? <span className="dq-pill">Top pick</span> : null}
              <Icon color="var(--t-3)" name="chevron" size={16} />
            </button>
          ))}
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
  const preset = MOCK_PRESETS[0]

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
            Total · meal
          </p>
          <div className={styles.heroKpi}>
            {preset.total_kcal}
            <span style={{ fontSize: 14 }}>kcal</span>
          </div>
          <div className={styles.macroGrid}>
            <span>{preset.total_protein_g}g protein</span>
            <span>27g carbs</span>
            <span>11g fat</span>
          </div>
        </div>

        <Section title="Items" />
        <Card padding={0}>
          {preset.items.map((item) => (
            <div className={styles.habitRow} key={item.name} style={{ padding: 14 }}>
              <span className={styles.rowText}>
                <strong>{item.name}</strong>
                <span className={styles.rowSub}>
                  {item.kcal} kcal · {item.protein_g}g P · {item.carb_g}g C · {item.fat_g}g F
                </span>
              </span>
              <span className="dq-pill">{item.portion}x</span>
            </div>
          ))}
        </Card>

        <div className={styles.pageFooter}>
          <Button onClick={() => navigate('/log/meal/saved')}>Save · {preset.total_kcal} kcal</Button>
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
            <p className={styles.subtitle}>350 kcal · 38g protein · 1,600 kcal left today</p>
            <div style={{ height: 22 }} />
            <span className="dq-pill">
              <Icon color="var(--a1)" fill="var(--a1)" name="flame" size={14} />
              Day 15 streak unlocked
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
