import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppScreen, appStyles as styles } from '@/components/layout/AppScreen'
import { Button, Icon } from '@/components/primitives'
import { todayKey } from '@/lib/dates'
import { useWeights } from '@/hooks/useWeights'
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

export function LogWeightRoute() {
  const { data, add } = useWeights(30)
  const latest = data[data.length - 1]
  const [value, setValue] = useState(latest?.weight_kg.toFixed(1) ?? '80.0')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (latest) setValue(latest.weight_kg.toFixed(1))
  }, [latest])

  async function saveWeight() {
    if (saving) return
    setSaving(true)
    try {
      await add({ date: todayKey(), weight_kg: Number(value) })
      toast.success(`Logged ${Number(value).toFixed(1)} kg`)
      haptic(10)
      navigate('/progress?tab=weight')
    } catch (err) {
      console.error(err)
      toast.error("Couldn't save weight.")
      haptic([20, 40, 20])
    } finally {
      setSaving(false)
    }
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
        <Button disabled={saving} onClick={() => void saveWeight()}>{saving ? 'Saving...' : 'Save weight'}</Button>
      </div>
    </AppScreen>
  )
}
