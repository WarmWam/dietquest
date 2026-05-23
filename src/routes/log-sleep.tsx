import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { todayKey } from '@/lib/dates'
import { useSleep } from '@/hooks/useSleep'
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

function calculateSleepDuration(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  if (isNaN(bh) || isNaN(bm) || isNaN(wh) || isNaN(wm)) return 450
  
  let bedMinutes = bh * 60 + bm
  let wakeMinutes = wh * 60 + wm
  
  if (wakeMinutes < bedMinutes) {
    wakeMinutes += 24 * 60
  }
  
  return wakeMinutes - bedMinutes
}

export function LogSleepRoute() {
  const { data, upsert } = useSleep()
  const [bedtime, setBedtime] = useState('22:30')
  const [wakeTime, setWakeTime] = useState('06:00')
  const [quality, setQuality] = useState(4)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (data) {
      setBedtime(data.bedtime)
      setWakeTime(data.wake_time)
      setQuality(data.quality_1_5)
    }
  }, [data])

  const durationMin = calculateSleepDuration(bedtime, wakeTime)
  const hours = Math.floor(durationMin / 60)
  const minutes = durationMin % 60

  async function saveSleep() {
    if (saving) return
    setSaving(true)
    try {
      await upsert({
        date: todayKey(),
        bedtime,
        wake_time: wakeTime,
        duration_min: durationMin,
        quality_1_5: quality,
      })
      toast.success(`${hours}h ${minutes}m logged`)
      haptic(10)
      navigate('/')
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save sleep.")
      haptic([20, 40, 20])
    } finally {
      setSaving(false)
    }
  }

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
            {durationMin >= 7 * 60 && durationMin <= 9 * 60 ? (
              <p style={{ color: 'var(--success)', fontWeight: 800 }}>within target window</p>
            ) : durationMin < 7 * 60 ? (
              <p style={{ color: 'var(--warning)', fontWeight: 800 }}>below 7 hour target</p>
            ) : (
              <p style={{ color: 'var(--warning)', fontWeight: 800 }}>more than 9 hours</p>
            )}
          </div>
        </Card>
        <div className={styles.topStats}>
          <Card padding={14}>
            <p className="dq-eyebrow">Bedtime</p>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              style={{
                fontSize: 22,
                fontWeight: 800,
                border: 0,
                background: 'transparent',
                color: 'var(--t-1)',
                fontFamily: 'inherit',
                width: '100%',
                marginTop: 6,
                outline: 'none',
              }}
            />
            <p className={styles.subtitle}>last night</p>
          </Card>
          <Card padding={14}>
            <p className="dq-eyebrow">Wake</p>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              style={{
                fontSize: 22,
                fontWeight: 800,
                border: 0,
                background: 'transparent',
                color: 'var(--t-1)',
                fontFamily: 'inherit',
                width: '100%',
                marginTop: 6,
                outline: 'none',
              }}
            />
            <p className={styles.subtitle}>this morning</p>
          </Card>
        </div>
        <Card padding={16}>
          <p className={styles.fieldLabel}>Sleep quality</p>
          <div className={styles.screenHeader} style={{ justifyContent: 'space-around', padding: '4px 0' }}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setQuality(rating)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', outline: 'none' }}
              >
                <Icon
                  color={rating <= quality ? '#F59E0B' : 'var(--line-strong)'}
                  fill={rating <= quality ? '#F59E0B' : 'none'}
                  name="star"
                  size={30}
                />
              </button>
            ))}
          </div>
        </Card>
        <div className={styles.pageFooter} style={{ marginTop: 24 }}>
          <Button disabled={saving} onClick={() => void saveSleep()}>{saving ? 'Saving...' : 'Save sleep'}</Button>
        </div>
      </div>
    </AppScreen>
  )
}
