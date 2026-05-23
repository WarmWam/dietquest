import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { todayKey } from '@/lib/dates'
import { useSleep } from '@/hooks/useSleep'
import { useWater } from '@/hooks/useWater'
import { useWeights } from '@/hooks/useWeights'
import { useWorkouts } from '@/hooks/useWorkouts'

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

export function LogWaterRoute() {
  const { data, totalMl, add, loading } = useWater()
  const percent = Math.min(totalMl / 3000, 1)

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <Header title="Water" />
        <div className={styles.waterGlass}>
          <div className={styles.waterLevel} style={{ height: `${percent * 100}%` }} />
          <div className={styles.glassText}>
            <div>
              <strong className="dq-num" style={{ fontSize: 56 }}>
                {(totalMl / 1000).toFixed(1)}
              </strong>
              <p>of 3.0 L - {Math.round(percent * 100)}%</p>
            </div>
          </div>
        </div>
        <div className={styles.metricGrid}>
          <Button onClick={() => void add(250)} variant="secondary">+ 250 ml</Button>
          <Button onClick={() => void add(500)} variant="secondary">+ 500 ml</Button>
        </div>
        <Card padding={12}>
          {loading ? <p className={styles.subtitle}>Loading water logs...</p> : data.length === 0 ? <p className={styles.subtitle}>No water logged yet today.</p> : null}
          {data.map((log) => (
            <div className={styles.habitRow} key={log.id}>
              <Icon color="#0EA5E9" name="drop" />
              <span className={styles.rowText}>
                <strong>{log.ml} ml</strong>
                <span className={styles.rowSub}>{log.time}</span>
              </span>
            </div>
          ))}
        </Card>
      </div>
    </AppScreen>
  )
}

export function LogWeightRoute() {
  const { data, add } = useWeights(30)
  const latest = data[data.length - 1]
  const [value, setValue] = useState(latest?.weight_kg.toFixed(1) ?? '80.0')
  const navigate = useNavigate()

  useEffect(() => {
    if (latest) setValue(latest.weight_kg.toFixed(1))
  }, [latest])

  async function saveWeight() {
    await add({ date: todayKey(), weight_kg: Number(value) })
    navigate('/progress?tab=weight')
  }

  return (
    <AppScreen hideNav>
      <div className={styles.screen}>
        <Header title="Weight" />
        <div className={styles.fullCenter}>
          <div>
            <p className="dq-eyebrow">Today</p>
            <strong className="dq-num" style={{ fontSize: 88 }}>
              {Number(value || 0).toFixed(1)}
            </strong>
            <span className={styles.subtitle}> kg</span>
            <p className={styles.subtitle}>{latest ? `Previous ${latest.weight_kg.toFixed(1)} kg` : 'First weight log'}</p>
          </div>
        </div>
        <div className={styles.numberPad}>
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '<'].map((key) => (
            <button className={styles.padButton} key={key} onClick={() => setValue((current) => (key === '<' ? current.slice(0, -1) || '0' : `${current}${key}`))} type="button">
              {key}
            </button>
          ))}
        </div>
        <div style={{ height: 14 }} />
        <Button onClick={() => void saveWeight()}>Save weight</Button>
      </div>
    </AppScreen>
  )
}

export function LogSleepRoute() {
  const { data, upsert } = useSleep()
  const sleep = data ?? { id: todayKey(), date: todayKey(), bedtime: '22:30', wake_time: '06:00', duration_min: 450, quality_1_5: 4 }
  const hours = Math.floor(sleep.duration_min / 60)
  const minutes = sleep.duration_min % 60

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <Header title="Sleep" />
        <Card raised padding={22}>
          <div style={{ textAlign: 'center' }}>
            <Icon color="var(--a1)" name="moon" size={30} />
            <div className="dq-num" style={{ fontSize: 62, fontWeight: 900 }}>
              {hours}h {minutes}m
            </div>
            <p style={{ color: 'var(--success)', fontWeight: 800 }}>within target window</p>
          </div>
        </Card>
        <div className={styles.topStats}>
          <Metric label="Bedtime" sub="last night" value={sleep.bedtime} />
          <Metric label="Wake" sub="this morning" value={sleep.wake_time} />
        </div>
        <Card padding={16}>
          <p className={styles.fieldLabel}>Sleep quality</p>
          <div className={styles.screenHeader}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Icon color={rating <= sleep.quality_1_5 ? '#F59E0B' : 'var(--line-strong)'} fill={rating <= sleep.quality_1_5 ? '#F59E0B' : 'none'} key={rating} name="star" size={30} />
            ))}
          </div>
        </Card>
        <div className={styles.pageFooter}>
          <Button onClick={() => void upsert({ date: todayKey(), bedtime: sleep.bedtime, wake_time: sleep.wake_time, duration_min: sleep.duration_min, quality_1_5: sleep.quality_1_5 })}>Save sleep</Button>
        </div>
      </div>
    </AppScreen>
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

  async function saveWorkout() {
    await add({ date: todayKey(), type: 'incline_walk', duration_min: 45, incline_pct: 8.2, speed_kmh: 5.5, kcal_burned: 328, mood: 'strong' })
    navigate('/')
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
          <Button onClick={() => void saveWorkout()}>Save workout</Button>
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
