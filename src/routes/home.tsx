import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Ring, Skeleton, type IconName } from '@/components/primitives'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { useMeals } from '@/hooks/useMeals'
import { useToday } from '@/hooks/useToday'
import { useUser } from '@/hooks/useUser'
import { useWeights } from '@/hooks/useWeights'
import { useWorkouts } from '@/hooks/useWorkouts'
import { todayKey as getTodayKey } from '@/lib/dates'
import type { MealLog, MealType, UserSettings } from '@/types/domain'

const mealMeta: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: 'Breakfast', icon: 'AM' },
  lunch: { label: 'Lunch', icon: 'NO' },
  dinner: { label: 'Dinner', icon: 'PM' },
  snack: { label: 'Snack', icon: 'SN' },
}

export function HomeRoute() {
  const [params] = useSearchParams()
  const { profile, loading: userLoading } = useUser()
  const { data: meals, loading: mealsLoading } = useMeals()
  const { data: today, loading: todayLoading } = useToday()
  const empty = params.get('empty') === '1' || (!mealsLoading && meals.length === 0)
  const sheet = params.get('sheet') === '1'
  const settings = profile?.settings ?? DEFAULT_SETTINGS

  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const [touchStart, setTouchStart] = useState(0)

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY)
      setPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pulling || refreshing) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStart
    if (diff > 0) {
      const progress = Math.min(diff / 1.5, 70)
      setPullProgress(progress)
    }
  }

  const handleTouchEnd = () => {
    if (!pulling) return
    setPulling(false)
    if (pullProgress >= 50) {
      setRefreshing(true)
      haptic(5)
      setTimeout(() => {
        setRefreshing(false)
        setPullProgress(0)
        toast.success("Synced with Firebase")
      }, 1000)
    } else {
      setPullProgress(0)
    }
  }

  return (
    <AppScreen activeNav="home">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        className={`${styles.screen} ${styles.withNav} ${styles.scroll}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {(pullProgress > 0 || refreshing) && (
          <div
            style={{
              height: refreshing ? 50 : pullProgress,
              transition: pulling ? 'none' : 'height 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--line)',
              borderRadius: 'var(--r-md)',
              margin: '0 0 10px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                transform: refreshing ? 'none' : `rotate(${pullProgress * 5}deg)`,
              }}
            >
              <Icon name="sparkle" size={24} color="var(--a1)" />
            </div>
          </div>
        )}
        <header className={styles.screenHeader}>
          <div>
            <p className={styles.subtitle}>Good morning</p>
            <h1 className={styles.headerTitle}>{empty ? 'Day 1 - let us go' : 'Today'}</h1>
          </div>
          <div className={styles.avatar}>{profile?.display_name?.[0] ?? 'D'}</div>
        </header>

        {userLoading || mealsLoading || todayLoading ? (
          <HomeSkeleton />
        ) : empty ? (
          <HomeEmptyContent target={settings.daily_kcal_target} />
        ) : (
          <HomeFullContent meals={meals} settings={settings} today={today} />
        )}
      </div>
      {sheet ? <LogSheet /> : null}
    </AppScreen>
  )
}

function HomeFullContent({ meals, settings, today }: { meals: MealLog[]; settings: UserSettings; today: ReturnType<typeof useToday>['data'] }) {
  const navigate = useNavigate()
  const { data: weights } = useWeights(30)
  const { data: workouts } = useWorkouts(1)
  const latestWeight = weights[weights.length - 1]
  const todayWorkouts = workouts.filter((w) => w.date === getTodayKey())
  const totalWorkoutMin = todayWorkouts.reduce((sum, w) => sum + w.duration_min, 0)
  const workoutTarget = 60
  const workoutPct = Math.min(totalWorkoutMin / workoutTarget, 1)

  return (
    <>
      <Card raised padding={18}>
        <div className={styles.screenHeader}>
          <span className="dq-eyebrow">Today</span>
          <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 800 }}>
            {Math.max(settings.daily_kcal_target - today.totals.kcal, 0)} kcal left
          </span>
        </div>
        <Ring eaten={today.totals.kcal} protein={today.totals.protein_g} proteinTarget={settings.daily_protein_target} size={210} target={settings.daily_kcal_target} />
      </Card>

      <div className={styles.topStats}>
        <MiniStat color="#0EA5E9" icon="drop" label="Water" pct={Math.min(today.totals.water_ml / 3000, 1)} target="3.0 L" value={(today.totals.water_ml / 1000).toFixed(1)} />
        <MiniStat color="#10B981" icon="walk" label="Incline" pct={workoutPct} target={`${workoutTarget} min`} value={String(totalWorkoutMin)} />
      </div>

      <SectionLabel>Today's meals</SectionLabel>
      <div className={styles.mealList}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
          const meal = meals.find((item) => item.meal_type === type)
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
        <Habit done={today.habits.water_done || today.totals.water_ml >= 3000} label="Drink 3 L of water" sub={`${(today.totals.water_ml / 1000).toFixed(1)} / 3.0 L`} />
        <div className="dq-divider" />
        <Habit done={today.habits.walk_done} label="Incline walk 45 min" sub={today.habits.walk_done ? 'logged' : 'not logged yet'} />
        <div className="dq-divider" />
        <Habit done={today.habits.sleep_on_time} label="Sleep by 22:30" sub="goal - 7.5 hrs" />
      </div>

      {latestWeight ? (
        <>
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
      ) : null}
    </>
  )
}

function HomeEmptyContent({ target }: { target: number }) {
  const navigate = useNavigate()

  return (
    <>
      <Card raised padding={18}>
        <Ring eaten={0} label="not logged yet" protein={0} size={210} target={target} />
        <p className={styles.subtitle} style={{ textAlign: 'center', margin: '14px 0' }}>
          Log your first meal to start tracking. The streak starts with one tap.
        </p>
        <Button icon="plus" onClick={() => navigate('/log/meal')}>
          Log breakfast
        </Button>
      </Card>
      <SectionLabel>Today's meals</SectionLabel>
      <div className={styles.mealList}>
        <MealRow icon="AM" items="Tap to log" label="Breakfast" onClick={() => navigate('/log/meal')} />
        <MealRow icon="NO" items="Tap to log" label="Lunch" onClick={() => navigate('/log/meal')} />
        <MealRow icon="PM" items="Tap to log" label="Dinner" onClick={() => navigate('/log/meal')} />
      </div>
      <div className={styles.emptyBox}>
        <Icon color="var(--a1)" name="sparkle" />
        <strong>First log unlocks your streak</strong>
        <p className={styles.subtitle}>Log 6 days a week to keep it alive.</p>
      </div>
    </>
  )
}

function HomeSkeleton() {
  return (
    <>
      <Card raised padding={18} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
          <Skeleton width={80} height={14} variant="text" />
          <Skeleton width={60} height={14} variant="text" />
        </div>
        <Skeleton width={210} height={210} variant="circle" />
      </Card>

      <div className={styles.topStats} style={{ marginTop: 14 }}>
        <Card padding={14} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={28} height={28} variant="circle" />
          <Skeleton width="60%" height={20} variant="text" />
          <Skeleton width="40%" height={12} variant="text" />
          <Skeleton width="100%" height={6} radius="3px" />
        </Card>
        <Card padding={14} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={28} height={28} variant="circle" />
          <Skeleton width="60%" height={20} variant="text" />
          <Skeleton width="40%" height={12} variant="text" />
          <Skeleton width="100%" height={6} radius="3px" />
        </Card>
      </div>

      <div className={styles.sectionLabel} style={{ marginTop: 18, marginBottom: 8 }}>
        <Skeleton width={120} height={14} variant="text" />
      </div>
      <div className={styles.mealList} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width={32} height={32} variant="circle" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width="50%" height={16} variant="text" />
              <Skeleton width="80%" height={12} variant="text" />
            </div>
            <Skeleton width={16} height={16} variant="circle" />
          </Card>
        ))}
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
    { id: 'meal', label: 'Meal', sub: 'Preset - custom - recent', icon: 'fork', path: '/log/meal' },
    { id: 'water', label: 'Water', sub: '+250 ml - +500 ml', icon: 'drop', path: '/log/water' },
    { id: 'workout', label: 'Workout', sub: 'Incline walk - bodyweight', icon: 'walk', path: '/log/workout' },
    { id: 'weight', label: 'Weight', sub: 'Daily weigh-in', icon: 'trend', path: '/log/weight' },
    { id: 'sleep', label: 'Sleep', sub: 'Bedtime - wake - quality', icon: 'moon', path: '/log/sleep' },
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
          <span className={styles.subtitle}>Today</span>
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
