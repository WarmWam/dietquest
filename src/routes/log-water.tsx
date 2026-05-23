import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Card, Icon } from '@/components/primitives'
import { useWater } from '@/hooks/useWater'
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

export function LogWaterRoute() {
  const { data, totalMl, add, loading } = useWater()
  const [saving, setSaving] = useState(false)
  const percent = Math.min(totalMl / 3000, 1)

  async function handleAdd(ml: number) {
    if (saving) return
    setSaving(true)
    try {
      await add(ml)
      const nextTotal = totalMl + ml
      toast.success(`+ ${ml} ml (${(nextTotal / 1000).toFixed(1)}L / 3.0L today)`)
      haptic(5)
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save water.")
      haptic([20, 40, 20])
    } finally {
      setSaving(false)
    }
  }

  function handleCustom() {
    const input = prompt('How many ml?')
    if (!input) return
    const ml = Number(input)
    if (isNaN(ml) || ml <= 0 || ml > 5000) {
      toast.error('Enter a valid amount (1-5000 ml)')
      return
    }
    void handleAdd(ml)
  }

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Button disabled={saving} onClick={() => void handleAdd(250)} variant="secondary">+ 250 ml</Button>
          <Button disabled={saving} onClick={() => void handleAdd(500)} variant="secondary">+ 500 ml</Button>
          <Button disabled={saving} onClick={handleCustom} variant="secondary">+ Custom</Button>
        </div>
        <Card padding={12}>
          {loading ? (
            <p className={styles.subtitle}>Loading water logs...</p>
          ) : data.length === 0 ? (
            <p className={styles.subtitle}>No water logged yet today.</p>
          ) : null}
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
