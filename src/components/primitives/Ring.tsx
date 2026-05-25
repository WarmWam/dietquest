type RingProps = {
  size?: number
  eaten?: number
  target?: number
  protein?: number
  proteinTarget?: number
  label?: string
  sub?: string
  // Per-meal breakdown in slot order [breakfast, lunch, dinner, snack].
  // Used to draw thin dividers between meal segments on each ring.
  calBySlot?: number[]
  proteinBySlot?: number[]
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

// Walk a per-slot array, return the cumulative percentage at the END of each
// slot. Only emit boundaries that fall inside the colored arc so we never
// place a marker on the empty grey track. The last slot's end is the arc
// tip — we skip it (the rounded linecap is its visual cap) but still emit
// the previous boundaries even if the cumulative equals filledPct.
function buildDividers(slots: number[] | undefined, target: number, filledPct: number): number[] {
  if (!slots || slots.length === 0 || target <= 0 || filledPct <= 0) return []
  const out: number[] = []
  let running = 0
  for (let i = 0; i < slots.length - 1; i++) {
    running += slots[i] || 0
    if (running <= 0) continue
    const pct = running / target
    // Allow up to filledPct but not the very tip — leave a hair of room so
    // the marker doesn't sit on top of the rounded linecap.
    if (pct > 0 && pct <= Math.min(filledPct, 1) - 0.001) out.push(pct)
  }
  return out
}

export function Ring({
  size = 220,
  eaten = 1240,
  target = 1950,
  protein = 78,
  proteinTarget = 140,
  label = 'eaten',
  sub = 'kcal',
  calBySlot,
  proteinBySlot,
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

  const cx = size / 2
  const cy = size / 2
  // Outer + inner divider points. The SVG is rotated -90deg so theta=0 sits at
  // 12 o'clock; we add positions clockwise from there as pct grows.
  const calDividers = buildDividers(calBySlot, target, pct)
  const proteinDividers = buildDividers(proteinBySlot, proteinTarget, pctProtein)
  // Marker size: bisect the stroke. Slight overshoot so the divider's
  // border reads clearly against the pastel arc on both sides.
  const outerMarkerR = stroke / 2 + 1
  const innerMarkerR = innerStroke / 2 + 1.5

  function pointOn(r: number, p: number) {
    const theta = 2 * Math.PI * p
    return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) }
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke="var(--bg-soft)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r1}
          fill="none"
          stroke={cal.stroke}
          strokeDasharray={c1}
          strokeDashoffset={c1 * (1 - pct)}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke="var(--bg-soft)" strokeWidth={innerStroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r2}
          fill="none"
          stroke={prot.stroke}
          strokeDasharray={c2}
          strokeDashoffset={c2 * (1 - pctProtein)}
          strokeLinecap="round"
          strokeWidth={innerStroke}
        />
        {/* Meal-segment dividers — small white circles bisecting each arc */}
        {calDividers.map((p, i) => {
          const { x, y } = pointOn(r1, p)
          return (
            <circle
              key={`cal-div-${i}`}
              cx={x}
              cy={y}
              r={outerMarkerR}
              fill="rgba(255,255,255,0.5)"
              stroke="none"
            />
          )
        })}
        {proteinDividers.map((p, i) => {
          const { x, y } = pointOn(r2, p)
          return (
            <circle
              key={`prot-div-${i}`}
              cx={x}
              cy={y}
              r={innerMarkerR}
              fill="rgba(255,255,255,0.5)"
              stroke="none"
            />
          )
        })}
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
