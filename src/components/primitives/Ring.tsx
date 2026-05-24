type RingProps = {
  size?: number
  eaten?: number
  target?: number
  protein?: number
  proteinTarget?: number
  label?: string
  sub?: string
}

// Pastel strokes (rings) + bold tints (numbers)
const STROKE = {
  green: '#86EFAC',
  yellow: '#FCD34D',
  red: '#FCA5A5',
}
const NUMBER = {
  green: '#16A34A',
  yellow: '#D97706',
  red: '#DC2626',
}

function calorieZone(pct: number) {
  if (pct >= 1) return { stroke: STROKE.red, number: NUMBER.red }
  if (pct >= 0.7) return { stroke: STROKE.yellow, number: NUMBER.yellow }
  return { stroke: STROKE.green, number: NUMBER.green }
}

function proteinZone(pct: number) {
  if (pct >= 1) return { stroke: STROKE.green, number: NUMBER.green }
  if (pct >= 0.7) return { stroke: STROKE.yellow, number: NUMBER.yellow }
  return { stroke: STROKE.red, number: NUMBER.red }
}

export function Ring({
  size = 220,
  eaten = 1240,
  target = 1950,
  protein = 78,
  proteinTarget = 140,
  label = 'eaten',
  sub = 'kcal',
}: RingProps) {
  // Slightly slimmer rings + tighter gap → more breathing room for the
  // centered text so PROTEIN row doesn't kiss the inner stroke.
  const stroke = 14
  const innerStroke = 6
  const r1 = (size - stroke) / 2
  const r2 = r1 - stroke - 3
  const c1 = 2 * Math.PI * r1
  const c2 = 2 * Math.PI * r2
  const rawCalPct = target > 0 ? eaten / target : 0
  const rawProteinPct = proteinTarget > 0 ? protein / proteinTarget : 0
  const pct = Math.min(rawCalPct, 1)
  const pctProtein = Math.min(rawProteinPct, 1)
  const cal = calorieZone(rawCalPct)
  const prot = proteinZone(rawProteinPct)

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r1} fill="none" stroke="var(--bg-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r1}
          fill="none"
          stroke={cal.stroke}
          strokeDasharray={c1}
          strokeDashoffset={c1 * (1 - pct)}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
        <circle cx={size / 2} cy={size / 2} r={r2} fill="none" stroke="var(--bg-soft)" strokeWidth={innerStroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r2}
          fill="none"
          stroke={prot.stroke}
          strokeDasharray={c2}
          strokeDashoffset={c2 * (1 - pctProtein)}
          strokeLinecap="round"
          strokeWidth={innerStroke}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          textAlign: 'center',
        }}
      >
        <div className="dq-eyebrow" style={{ color: 'var(--t-3)' }}>{label}</div>
        <div className="dq-num" style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, color: cal.number }}>
          {eaten.toLocaleString()}
        </div>
        <div style={{ color: 'var(--t-2)', fontSize: 12, fontWeight: 500 }}>
          / {target.toLocaleString()} {sub}
        </div>
        <div style={{ color: 'var(--t-2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, marginTop: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--t-2)' }} />
          PROTEIN&nbsp;<span style={{ color: prot.number, fontWeight: 800 }}>{Math.round(protein)}</span>/{Math.round(proteinTarget)}g
        </div>
      </div>
    </div>
  )
}
