import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Ring, type IconName } from '@/components/primitives'
import { MOCK_MEALS, MOCK_TODAY, MOCK_USER, MOCK_WEIGHTS } from '@/lib/mock'
import type { MealType } from '@/types/domain'

const mealMeta: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: 'Breakfast', icon: '🌅' },
  lunch: { label: 'Lunch', icon: '☀️' },
  dinner: { label: 'Dinner', icon: '🌙' },
  snack: { label: 'Snack', icon: '🍎' },
}

export function HomeRoute() {
  const [params] = useSearchParams()
  const empty = params.get('empty') === '1'
  const sheet = params.get('sheet') === '1'
  return (
    <AppScreen activeNav="home">
      <div className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}>
        <header className={styles.screenHeader}>
          <div>
            <p className={styles.subtitle}>Good morning</p>
            <h1 className={styles.headerTitle}>{empty ? 'Day 1 · let’s go' : 'Friday, May 23'}</h1>
          </div>
          <div className={styles.avatar}>{MOCK_USER.display_name[0]}</div>
        </header>

        {empty ? <HomeEmptyContent /> : <HomeFullContent />}
      </div>
      {sheet ? <LogSheet /> : null}
    </AppScreen>
  )
}

function HomeFullContent() {
  const navigate = useNavigate()
  const latestWeight = MOCK_WEIGHTS[MOCK_WEIGHTS.length - 1]

  return (
    <>
      <Card raised padding={18}>
        <div className={styles.screenHeader}>
          <span className="dq-eyebrow">Today</span>
          <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 800 }}>710 kcal left</span>
        </div>
        <Ring
          eaten={MOCK_TODAY.totals.kcal}
          protein={MOCK_TODAY.totals.protein_g}
          proteinTarget={MOCK_USER.settings.daily_protein_target}
          size={210}
          target={MOCK_USER.settings.daily_kcal_target}
        />
      </Card>

      <div className={styles.topStats}>
        <MiniStat color="#0EA5E9" icon="drop" label="Water" pct={0.5} target="3.0 L" value="1.5" />
        <MiniStat color="#10B981" icon="walk" label="Incline" pct={0.75} target="60 min" value="45" />
      </div>

      <SectionLabel action="Edit">Today’s meals</SectionLabel>
      <div className={styles.mealList}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
          const meal = MOCK_MEALS.find((item) => item.meal_type === type)
          return (
            <MealRow
              key={type}
              icon={mealMeta[type].icon}
              items={meal?.items.map((item) => item.name).join(', ') ?? 'Tap to log'}
              kcal={meal?.total_kcal}
              label={mealMeta[type].label}
              onClick={() => navigate('/log/meal')}
            />
          )
        })}
      </div>

      <SectionLabel>Daily habits</SectionLabel>
      <div className={styles.habitBox}>
        <Habit done={MOCK_TODAY.habits.water_done} label="Drink 3 L of water" sub="1.5 / 3.0 L" />
        <div className="dq-divider" />
        <Habit done={MOCK_TODAY.habits.walk_done} label="Incline walk 45 min" sub="logged · 328 kcal" />
        <div className="dq-divider" />
        <Habit done={MOCK_TODAY.habits.sleep_on_time} label="Sleep by 22:30" sub="goal · 7.5 hrs" />
      </div>

      <div style={{ height: 14 }} />
      <Card padding={14}>
        <div className={styles.habitRow}>
          <div className={styles.statIcon}>
            <Icon color="var(--success)" name="trend" />
          </div>
          <div className={styles.rowText}>
            <p className="dq-eyebrow">Weight</p>
            <strong className="dq-num" style={{ fontSize: 20 }}>
              {latestWeight.weight_kg.toFixed(1)} kg
            </strong>
          </div>
          <Button onClick={() => navigate('/log/weight')} variant="secondary">
            Log
          </Button>
        </div>
      </Card>
    </>
  )
}

function HomeEmptyContent() {
  const navigate = useNavigate()

  return (
    <>
      <Card raised padding={18}>
        <Ring eaten={0} label="not logged yet" protein={0} size={210} target={MOCK_USER.settings.daily_kcal_target} />
        <p className={styles.subtitle} style={{ textAlign: 'center', margin: '14px 0' }}>
          Log your first meal to start tracking. The streak starts with one tap.
        </p>
        <Button icon="plus" onClick={() => navigate('/log/meal')}>
          Log breakfast
        </Button>
      </Card>
      <SectionLabel>Today’s meals</SectionLabel>
      <div className={styles.mealList}>
        <MealRow icon="🌅" items="Tap to log" label="Breakfast" onClick={() => navigate('/log/meal')} />
        <MealRow icon="☀️" items="Tap to log" label="Lunch" onClick={() => navigate('/log/meal')} />
        <MealRow icon="🌙" items="Tap to log" label="Dinner" onClick={() => navigate('/log/meal')} />
      </div>
      <div className={styles.emptyBox}>
        <Icon color="var(--a1)" name="sparkle" />
        <strong>First log unlocks your streak</strong>
        <p className={styles.subtitle}>Log 6 days a week to keep it alive.</p>
      </div>
    </>
  )
}

function SectionLabel({ action, children }: { action?: string; children: string }) {
  return (
    <div className={styles.sectionLabel}>
      <span className="dq-eyebrow">{children}</span>
      {action ? <span style={{ color: 'var(--a1)', fontSize: 12, fontWeight: 800 }}>{action}</span> : null}
    </div>
  )
}

function MiniStat({ icon, label, value, target, pct, color }: { icon: IconName; label: string; value: string; target: string; pct: number; color: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ color }}>
        <Icon name={icon} />
      </div>
      <div>
        <strong className="dq-num" style={{ fontSize: 22 }}>
          {value}
        </strong>{' '}
        <span className={styles.subtitle}>/ {target}</span>
      </div>
      <span className="dq-eyebrow">{label}</span>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ background: color, width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

function MealRow({ icon, label, items, kcal, onClick }: { icon: string; label: string; items: string; kcal?: number; onClick: () => void }) {
  return (
    <button className={styles.mealRow} onClick={onClick} type="button">
      <span className={styles.mealIcon}>{icon}</span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>
          <span>{label}</span>
          {kcal ? (
            <span className="dq-num" style={{ color: 'var(--a1)' }}>
              {kcal} kcal
            </span>
          ) : (
            <span style={{ color: 'var(--t-3)', fontSize: 12 }}>tap to log</span>
          )}
        </span>
        <span className={styles.rowSub}>{items}</span>
      </span>
      <Icon color="var(--t-3)" name="chevron" size={16} />
    </button>
  )
}

function Habit({ done, label, sub }: { done: boolean; label: string; sub: string }) {
  return (
    <div className={styles.habitRow}>
      <span className="dq-check" data-on={done}>
        {done ? <Icon color="#fff" name="check" size={14} stroke={3} /> : null}
      </span>
      <span className={styles.rowText}>
        <strong>{label}</strong>
        <span className={styles.rowSub}>{sub}</span>
      </span>
    </div>
  )
}

function LogSheet() {
  const navigate = useNavigate()
  const items: Array<{ id: string; label: string; sub: string; icon: IconName; path: string }> = [
    { id: 'meal', label: 'Meal', sub: 'Preset · custom · recent', icon: 'fork', path: '/log/meal' },
    { id: 'water', label: 'Water', sub: '+250 ml · +500 ml', icon: 'drop', path: '/log/water' },
    { id: 'workout', label: 'Workout', sub: 'Incline walk · bodyweight', icon: 'walk', path: '/log/workout' },
    { id: 'weight', label: 'Weight', sub: 'Daily weigh-in', icon: 'trend', path: '/log/weight' },
    { id: 'sleep', label: 'Sleep', sub: 'Bedtime · wake · quality', icon: 'moon', path: '/log/sleep' },
  ]

  return (
    <>
      <button aria-label="Close log sheet" className={styles.sheetBackdrop} onClick={() => navigate('/')} type="button" />
      <div className={styles.sheet}>
        <div className={styles.sheetHandle} />
        <div className={styles.screenHeader}>
          <h2 className={styles.headerTitle} style={{ fontSize: 22 }}>
            Quick log
          </h2>
          <span className={styles.subtitle}>9:41 · Fri</span>
        </div>
        <div className={styles.sheetItems}>
          {items.map((item) => (
            <button className={styles.sheetItem} key={item.id} onClick={() => navigate(item.path)} type="button">
              <span className={styles.sheetIcon}>
                <Icon color="var(--a1)" name={item.icon} />
              </span>
              <span className={styles.rowText}>
                <strong>{item.label}</strong>
                <span className={styles.rowSub}>{item.sub}</span>
              </span>
              <Icon color="var(--t-3)" name="chevron" size={16} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
