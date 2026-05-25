import { useEffect, useState } from 'react'
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
  const allowDecimal = step % 1 !== 0
  const format = (val: number) => (allowDecimal ? val.toFixed(1) : String(val))

  // Local string state so the user can type/clear freely; we commit (and
  // clamp) to the parent on blur / Enter.
  const [draft, setDraft] = useState<string>(format(value))

  // Keep the input in sync when the parent updates the value via the +/-
  // buttons or external changes. Skip while the input itself is focused so
  // we don't fight the user mid-type.
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement?.tagName === 'INPUT') return
    setDraft(format(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, allowDecimal])

  const isMin = value <= min
  const isMax = value >= max

  function commit() {
    const trimmed = draft.trim()
    if (trimmed === '' || trimmed === '-' || trimmed === '.') {
      setDraft(format(value))
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      setDraft(format(value))
      return
    }
    const clamped = Math.min(Math.max(parsed, min), max)
    const rounded = allowDecimal ? Number(clamped.toFixed(2)) : Math.round(clamped)
    onChange(rounded)
    setDraft(format(rounded))
  }

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
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
          <input
            inputMode="decimal"
            type="text"
            value={draft}
            onChange={(e) => {
              const raw = e.target.value
              // Allow only digits, one dot, optional leading minus (if min < 0).
              const pattern = min < 0 ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/
              if (!pattern.test(raw)) return
              if (!allowDecimal && raw.includes('.')) return
              setDraft(raw)
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.currentTarget as HTMLInputElement).blur()
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
            className="dq-num"
            style={{
              width: `${Math.max(draft.length, 2)}ch`,
              maxWidth: 84,
              border: 0,
              background: 'transparent',
              outline: 'none',
              padding: 0,
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'inherit',
              color: 'var(--t-1)',
              textAlign: 'center',
            }}
          />
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
