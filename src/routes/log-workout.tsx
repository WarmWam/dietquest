import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon, Stepper } from '@/components/primitives'
import { todayKey } from '@/lib/dates'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useUser } from '@/hooks/useUser'
import { useWorkoutDraft } from '@/stores/workoutDraft'
import { DEFAULT_PROFILE } from '@/data/defaults'
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

const TYPE_LABELS: Record<string, string> = {
  incline_walk: 'Incline walk',
  bodyweight: 'Bodyweight',
  other: 'Other',
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function computeKcal(inclinePct: number, weightKg: number, elapsedMs: number): number {
  const mets = 4.0 + inclinePct * 0.5
  const kcalPerMin = (mets * 3.5 * weightKg) / 200
  const minutes = elapsedMs / 60000
  return Math.round(kcalPerMin * minutes)
}

export function LogWorkoutRoute() {
  const navigate = useNavigate()
  const draft = useWorkoutDraft()

  return (
    <AppScreen hideNav>
      <div className={`${styles.screen} ${styles.scroll}`}>
        <Header title="Workout" />
        <Card raised padding={20}>
          <p className="dq-eyebrow">Template</p>
          <h1 className={styles.headerTitle}>{TYPE_LABELS[draft.type]}</h1>
          <p className={styles.subtitle}>
            {draft.target_duration_min} min - {draft.incline_pct}% incline - {draft.speed_kmh} km/h
          </p>
        </Card>

        <p className={styles.fieldLabel} style={{ marginTop: 18 }}>Type</p>
        <div className="dq-seg" style={{ width: '100%', marginBottom: 18 }}>
          {(['incline_walk', 'bodyweight', 'other'] as const).map((t) => (
            <button
              className="dq-seg-item"
              data-active={draft.type === t}
              key={t}
              onClick={() => draft.setType(t)}
              type="button"
              style={{ flex: 1, justifyContent: 'center', border: 0, background: 'transparent', outline: 'none' }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {draft.type === 'incline_walk' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Stepper label="Incline" suffix="%" value={draft.incline_pct} onChange={draft.setIncline} min={0} max={15} step={0.5} />
            <Stepper label="Speed" suffix="km/h" value={draft.speed_kmh} onChange={draft.setSpeed} min={3} max={7} step={0.1} />
          </div>
        ) : null}

        <Stepper label="Duration target" suffix="min" value={draft.target_duration_min} onChange={draft.setTargetDuration} min={10} max={120} step={5} />

        <div className={styles.pageFooter}>
          <Button icon="play" onClick={() => { draft.start(); navigate('/log/workout/active') }}>
            Start
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}

export function LogWorkoutActiveRoute() {
  const navigate = useNavigate()
  const draft = useWorkoutDraft()
  const { profile } = useUser()
  const weightKg = profile?.profile?.weight_start_kg ?? DEFAULT_PROFILE.weight_start_kg

  useEffect(() => {
    if (!draft.startedAt || draft.pausedAt) return
    const id = setInterval(() => draft.tick(), 1000)
    return () => clearInterval(id)
  }, [draft.startedAt, draft.pausedAt, draft.tick])

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

  const liveKcal = computeKcal(draft.incline_pct, weightKg, draft.elapsedMs)
  const isPaused = draft.pausedAt !== null
  const targetMs = draft.target_duration_min * 60 * 1000

  return (
    <AppScreen bg="linear-gradient(180deg, #5B6CFF 0%, #B17AFF 50%, #FF6B9D 100%)" hideNav statusDark={false}>
      <div className={`${styles.screen} ${styles.activeWorkout}`}>
        <div className={styles.screenHeader}>
          <span className="dq-pill" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>
            {isPaused ? 'PAUSED' : 'LIVE'} - {TYPE_LABELS[draft.type]}
          </span>
          <Icon color="#fff" name="bell" />
        </div>
        <div className={styles.fullCenter}>
          <div>
            <p style={{ fontWeight: 900, letterSpacing: '.14em' }}>ELAPSED</p>
            <div className={`dq-num ${styles.timer}`}>{formatTime(draft.elapsedMs)}</div>
            <p>of {draft.target_duration_min} min target</p>
            <div className={styles.metricGrid}>
              <Metric label="kcal" sub="" value={String(liveKcal)} />
              <Metric label="incline" sub="" value={`${draft.incline_pct}%`} />
              <Metric label="speed" sub="" value={String(draft.speed_kmh)} />
              <Metric label="progress" sub="" value={`${Math.min(100, Math.round((draft.elapsedMs / targetMs) * 100))}%`} />
            </div>
          </div>
        </div>
        <div className={styles.screenHeader} style={{ justifyContent: 'center' }}>
          {isPaused ? (
            <button className={styles.roundControl} onClick={() => draft.resume()} type="button">
              <Icon color="#fff" name="play" />
            </button>
          ) : (
            <button className={styles.roundControl} onClick={() => draft.pause()} type="button">
              <Icon color="#fff" name="pause" />
            </button>
          )}
          <button className={styles.roundControl} onClick={() => navigate('/log/workout/summary')} style={{ background: '#fff' }} type="button">
            <Icon color="#EF4444" name="stop" />
          </button>
        </div>
      </div>
    </AppScreen>
  )
}

export function LogWorkoutSummaryRoute() {
  const navigate = useNavigate()
  const { add } = useWorkouts(30)
  const { profile } = useUser()
  const draft = useWorkoutDraft()
  const [saving, setSaving] = useState(false)
  const weightKg = profile?.profile?.weight_start_kg ?? DEFAULT_PROFILE.weight_start_kg

  const durationMin = Math.round(draft.elapsedMs / 60000)
  const kcalBurned = computeKcal(draft.incline_pct, weightKg, draft.elapsedMs)
  const distance = Number((draft.speed_kmh * (draft.elapsedMs / 3600000)).toFixed(1))
  const overUnder = durationMin - draft.target_duration_min

  async function saveWorkout() {
    if (saving) return
    setSaving(true)
    try {
      await add({
        date: todayKey(),
        type: draft.type,
        duration_min: durationMin,
        incline_pct: draft.incline_pct,
        speed_kmh: draft.speed_kmh,
        kcal_burned: kcalBurned,
        mood: 'strong',
      })
      toast.success(`${durationMin} min · ${kcalBurned} kcal burned`)
      haptic(10)
      draft.reset()
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
          <p>{TYPE_LABELS[draft.type]}</p>
          <div className={styles.heroKpi}>{formatTime(draft.elapsedMs)}</div>
          <p>
            {overUnder === 0
              ? 'Right on target!'
              : overUnder > 0
                ? `${overUnder} min over target. 💪`
                : `${Math.abs(overUnder)} min under target.`}
          </p>
        </div>
        <div className={styles.metricGrid}>
          <Metric label="Calories" sub="kcal" value={String(kcalBurned)} />
          <Metric label="Distance" sub="km" value={String(distance)} />
          <Metric label="Avg incline" sub="%" value={String(draft.incline_pct)} />
          <Metric label="Avg speed" sub="km/h" value={String(draft.speed_kmh)} />
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
