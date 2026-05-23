import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { todayKey } from '@/lib/dates'
import { useWorkouts } from '@/hooks/useWorkouts'
import { toast } from '@/stores/toastStore'
import { haptic } from '@/lib/haptic'

function Header({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <header className={styles.screenHeader}>
      <button className={styles.iconButton} onClick={() => navigate('/')} type="button">
        <Icon name="x" />
      </button>
      <strong>{title}</strong>
      <span style={{ width: 40 }} />
    </header>
  )
}

export function LogWorkoutRoute() {
  const navigate = useNavigate()
  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <Header title="Workout" />
        <Card raised padding={20}>
          <p className="dq-eyebrow">Template</p>
          <h1 className={styles.headerTitle}>Incline walk</h1>
          <p className={styles.subtitle}>45 min - 8% incline - 5.5 km/h</p>
        </Card>
        <div className={styles.topStats}>
          <Metric label="Incline" sub="treadmill" value="8%" />
          <Metric label="Speed" sub="km/h" value="5.5" />
        </div>
        <div className={styles.pageFooter}>
          <Button icon="play" onClick={() => navigate('/log/workout/active')}>
            Start
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}

export function LogWorkoutActiveRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    if ('wakeLock' in navigator) {
      void navigator.wakeLock.request('screen').then((lock) => {
        wakeLock = lock
      }).catch(() => undefined)
    }
    return () => {
      void wakeLock?.release()
    }
  }, [])

  return (
    <AppScreen bg="linear-gradient(180deg, #5B6CFF 0%, #B17AFF 50%, #FF6B9D 100%)" hideNav statusDark={false}>
      <div className={`${styles.screen} ${styles.activeWorkout}`}>
        <div className={styles.screenHeader}>
          <span className="dq-pill" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>LIVE - Incline walk</span>
          <Icon color="#fff" name="bell" />
        </div>
        <div className={styles.fullCenter}>
          <div>
            <p style={{ fontWeight: 900, letterSpacing: '.14em' }}>ELAPSED</p>
            <div className={`dq-num ${styles.timer}`}>27:14</div>
            <p>of 45 min target</p>
            <div className={styles.metricGrid}>
              <Metric label="kcal" sub="" value="186" />
              <Metric label="incline" sub="" value="8%" />
              <Metric label="speed" sub="" value="5.5" />
              <Metric label="heart" sub="" value="132" />
            </div>
          </div>
        </div>
        <div className={styles.screenHeader} style={{ justifyContent: 'center' }}>
          <button className={styles.roundControl} type="button"><Icon color="#fff" name="pause" /></button>
          <button className={styles.roundControl} onClick={() => navigate('/log/workout/summary')} style={{ background: '#fff' }} type="button"><Icon color="#EF4444" name="stop" /></button>
          <button className={styles.roundControl} type="button"><Icon color="#fff" name="bolt" /></button>
        </div>
      </div>
    </AppScreen>
  )
}

export function LogWorkoutSummaryRoute() {
  const navigate = useNavigate()
  const { add } = useWorkouts(30)
  const [saving, setSaving] = useState(false)

  async function saveWorkout() {
    if (saving) return
    setSaving(true)
    try {
      await add({
        date: todayKey(),
        type: 'incline_walk',
        duration_min: 45,
        incline_pct: 8.2,
        speed_kmh: 5.5,
        kcal_burned: 328,
        mood: 'strong',
      })
      toast.success('45 min · 328 kcal burned')
      haptic(10)
      navigate('/')
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save workout.")
      haptic([20, 40, 20])
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <Header title="Workout complete" />
        <div className={styles.heroPanel} style={{ textAlign: 'center' }}>
          <Icon color="#fff" name="check" size={34} stroke={3} />
          <p>Incline walk</p>
          <div className={styles.heroKpi}>45:22</div>
          <p>2 sec over target. Nailed it.</p>
        </div>
        <div className={styles.metricGrid}>
          <Metric label="Calories" sub="kcal" value="328" />
          <Metric label="Distance" sub="km" value="3.6" />
          <Metric label="Avg incline" sub="%" value="8.2" />
          <Metric label="Avg speed" sub="km/h" value="5.5" />
        </div>
        <div className={styles.pageFooter}>
          <Button disabled={saving} onClick={() => void saveWorkout()}>{saving ? 'Saving...' : 'Save workout'}</Button>
        </div>
      </div>
    </AppScreen>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card padding={14}>
      <p className="dq-eyebrow">{label}</p>
      <strong className="dq-num" style={{ fontSize: 28 }}>
        {value}
      </strong>
      {sub ? <p className={styles.subtitle}>{sub}</p> : null}
    </Card>
  )
}
