import { appStyles as styles } from '@/components/layout/AppScreen'

export function Stepper({
  label,
  value,
  suffix,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  suffix: string
  onChange: (val: number) => void
  min: number
  max: number
  step?: number
}) {
  const formattedValue = step % 1 !== 0 ? value.toFixed(1) : String(value)
  const isMin = value <= min
  const isMax = value >= max

  return (
    <div>
      <p className={styles.fieldLabel}>{label}</p>
      <div className={styles.stepper} style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-soft)',
        borderRadius: 'var(--r-pill)',
        padding: '6px 12px',
        height: '46px',
      }}>
        <button
          className={styles.smallRoundButton}
          type="button"
          onClick={() => {
            const nextVal = Number((value - step).toFixed(2))
            onChange(Math.max(nextVal, min))
          }}
          disabled={isMin}
          style={{ width: 32, height: 32, borderRadius: '50%', border: 0, background: 'var(--surface)', fontWeight: 'bold', cursor: 'pointer' }}
        >
          -
        </button>
        <span>
          <strong className="dq-num" style={{ fontSize: 18 }}>
            {formattedValue}
          </strong>{' '}
          <span className={styles.subtitle} style={{ fontSize: 12 }}>{suffix}</span>
        </span>
        <button
          className={styles.smallRoundButton}
          type="button"
          onClick={() => {
            const nextVal = Number((value + step).toFixed(2))
            onChange(Math.min(nextVal, max))
          }}
          disabled={isMax}
          style={{ width: 32, height: 32, borderRadius: '50%', border: 0, background: 'var(--surface)', fontWeight: 'bold', cursor: 'pointer' }}
        >
          +
        </button>
      </div>
    </div>
  )
}
