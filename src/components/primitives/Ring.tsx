type RingProps = {
  size?: number
  eaten?: number
  target?: number
  protein?: number
  proteinTarget?: number
  label?: string
  sub?: string
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
  const pct = Math.min(eaten / target, 1)
  const pctProtein = Math.min(protein / proteinTarget, 1)
  const gid = `dq-ring-${size}-${target}`

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--a1)" />
            <stop offset="50%" stopColor="var(--a2)" />
            <stop offset="100%" stopColor="var(--a3)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r1} fill="none" stroke="var(--bg-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r1}
          fill="none"
          stroke={`url(#${gid})`}
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
          opacity="0.6"
          stroke="var(--a1)"
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
        <div style={{ color: 'var(--a1)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, marginTop: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--a1)', opacity: 0.6 }} />
          PROTEIN {protein}/{proteinTarget}g
        </div>
      </div>
    </div>
  )
}
