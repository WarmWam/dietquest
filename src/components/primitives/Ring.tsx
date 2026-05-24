type RingProps = {
  size?: number
  eaten?: number
  target?: number
  protein?: number
  proteinTarget?: number
  label?: string
  sub?: string
}

const ZONE_GREEN = '#16A34A'
const ZONE_YELLOW = '#F59E0B'
const ZONE_RED = '#DC2626'

function calorieColor(pct: number): string {
  // Eating budget: under 70% = good, 70-99% = warning, >=100% = over
  if (pct >= 1) return ZONE_RED
  if (pct >= 0.7) return ZONE_YELLOW
  return ZONE_GREEN
}

function proteinColor(pct: number): string {
  // Protein intake: under 70% = need more, 70-99% = close, >=100% = hit target
  if (pct >= 1) return ZONE_GREEN
  if (pct >= 0.7) return ZONE_YELLOW
  return ZONE_RED
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
  const stroke = 16
  const innerStroke = 8
  const r1 = (size - stroke) / 2
  const r2 = r1 - stroke - 6
  const c1 = 2 * Math.PI * r1
  const c2 = 2 * Math.PI * r2
  const rawCalPct = target > 0 ? eaten / target : 0
  const rawProteinPct = proteinTarget > 0 ? protein / proteinTarget : 0
  const pct = Math.min(rawCalPct, 1)
  const pctProtein = Math.min(rawProteinPct, 1)
  const calStroke = calorieColor(rawCalPct)
  const proteinStroke = proteinColor(rawProteinPct)

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r1} fill="none" stroke="var(--bg-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r1}
          fill="none"
          stroke={calStroke}
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
          stroke={proteinStroke}
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
        <div className="dq-eyebrow">{label}</div>
        <div className="dq-num" style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
          {eaten.toLocaleString()}
        </div>
        <div style={{ color: 'var(--t-2)', fontSize: 13, fontWeight: 500 }}>
          / {target.toLocaleString()} {sub}
        </div>
        <div style={{ color: proteinStroke, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, marginTop: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: proteinStroke }} />
          PROTEIN {Math.round(protein)}/{Math.round(proteinTarget)}g
        </div>
      </div>
    </div>
  )
}
