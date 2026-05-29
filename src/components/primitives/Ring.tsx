type RingProps = {
  size?: number
  eaten?: number
  target?: number
  label?: string
  sub?: string
  // Per-meal breakdown in slot order [breakfast, lunch, dinner, snack].
  // When supplied, the ring renders as gap-separated segments instead of
  // a single continuous arc.
  calBySlot?: number[]
  // Planned kcal per slot (parallel to calBySlot). When supplied, each
  // calorie segment colours itself by actual-vs-plan ratio rather than by
  // cumulative-vs-daily-target — so the ring agrees with the meal card.
  calPlanBySlot?: number[]
  // Inner ring = sugar (a "don't exceed" metric, same zone logic as kcal).
  sugar?: number
  sugarTarget?: number
  sugarBySlot?: number[]
  // Legacy: inner ring = protein. Used only when sugarTarget is not given
  // (e.g. the design-system preview). Kept for backwards compatibility.
  protein?: number
  proteinTarget?: number
  proteinBySlot?: number[]
}

// Pastel strokes (zone-coded) + bold tints (numbers)
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

// "Don't exceed" zone (kcal, sugar): under 70% green, 70-99% yellow, over red.
function calorieZone(pct: number) {
  if (pct >= 1) return { stroke: STROKE.red, number: NUMBER.red }
  if (pct >= 0.7) return { stroke: STROKE.yellow, number: NUMBER.yellow }
  return { stroke: STROKE.green, number: NUMBER.green }
}

// Per-meal calorie zone — two colors only: green if at/under plan,
// red if over plan. No plan to compare → green.
function mealCalZone(actual: number, plan: number) {
  if (plan <= 0) return { stroke: STROKE.green }
  return actual > plan ? { stroke: STROKE.red } : { stroke: STROKE.green }
}

// "Hit target" zone (protein): under 70% red, 70-99% yellow, at/over green.
function proteinZone(pct: number) {
  if (pct >= 1) return { stroke: STROKE.green, number: NUMBER.green }
  if (pct >= 0.7) return { stroke: STROKE.yellow, number: NUMBER.yellow }
  return { stroke: STROKE.red, number: NUMBER.red }
}

type Segment = {
  startPct: number   // where the visible arc begins on the ring [0..1]
  lenPct: number     // visible length on the ring [0..1] (capped at remaining room)
  slotIdx: number    // 0=breakfast, 1=lunch, 2=dinner, 3=snack
  rawCumEnd: number  // uncapped cumulative ratio at this segment's end — used for zone color
}

// Build gap-separated segments capped at the target. Empty slots are
// skipped; cumulative length never exceeds 100% of the ring. We also
// keep the *uncapped* cumulative so per-segment color can still flag
// over-target (raw cum >= 1 → red zone).
function buildSegments(slots: number[] | undefined, target: number, fallbackValue: number): Segment[] {
  const effectiveSlots = slots && slots.length > 0 ? slots : [fallbackValue, 0, 0, 0]
  if (target <= 0) return []
  const out: Segment[] = []
  let cumVisible = 0
  let cumRaw = 0
  for (let i = 0; i < effectiveSlots.length; i++) {
    const val = effectiveSlots[i] || 0
    if (val <= 0) continue
    const rawLenPct = val / target
    cumRaw += rawLenPct
    const lenPct = Math.min(rawLenPct, Math.max(0, 1 - cumVisible))
    if (lenPct <= 0) continue
    out.push({ startPct: cumVisible, lenPct, slotIdx: i, rawCumEnd: cumRaw })
    cumVisible += lenPct
  }
  return out
}

export function Ring({
  size = 220,
  eaten = 1240,
  target = 1950,
  label = 'eaten',
  sub = 'kcal',
  calBySlot,
  calPlanBySlot,
  sugar,
  sugarTarget,
  sugarBySlot,
  protein = 78,
  proteinTarget = 140,
  proteinBySlot,
}: RingProps) {
  const stroke = 14
  const innerStroke = 6
  const r1 = (size - stroke) / 2
  const r2 = r1 - stroke - 3
  const c1 = 2 * Math.PI * r1
  const c2 = 2 * Math.PI * r2

  // Inner ring: sugar when a sugar target is provided, else legacy protein.
  const sugarMode = typeof sugarTarget === 'number' && sugarTarget > 0
  const innerValue = sugarMode ? (sugar ?? 0) : protein
  const innerTarget = sugarMode ? (sugarTarget as number) : proteinTarget
  const innerBySlot = sugarMode ? sugarBySlot : proteinBySlot
  const innerLabel = sugarMode ? 'SUGAR' : 'PROTEIN'

  const rawCalPct = target > 0 ? eaten / target : 0
  const cal = calorieZone(rawCalPct)
  // Sugar = don't-exceed (calorieZone); protein = hit-target (proteinZone).
  const rawInnerPct = innerTarget > 0 ? innerValue / innerTarget : 0
  const inner = sugarMode ? calorieZone(rawInnerPct) : proteinZone(rawInnerPct)

  const GAP_PX = 4

  const calSegments = buildSegments(calBySlot, target, eaten)
  const innerSegments = buildSegments(innerBySlot, innerTarget, innerValue)

  const cx = size / 2
  const cy = size / 2

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        {/* Outer track */}
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke="var(--bg-soft)" strokeWidth={stroke} />
        {/* Outer segments — one per meal slot, colored by per-meal
            actual-vs-plan ratio. Matches the meal card. */}
        {calSegments.map((seg, i) => {
          const segLenAbs = c1 * seg.lenPct
          const visibleLen = Math.max(segLenAbs - GAP_PX, 0.5)
          const slotActual = calBySlot?.[seg.slotIdx] ?? 0
          const slotPlan = calPlanBySlot?.[seg.slotIdx] ?? 0
          const segColor = mealCalZone(slotActual, slotPlan).stroke
          return (
            <circle
              key={`cal-seg-${i}`}
              cx={cx}
              cy={cy}
              r={r1}
              fill="none"
              stroke={segColor}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${visibleLen} ${c1}`}
              strokeDashoffset={-c1 * seg.startPct}
            />
          )
        })}

        {/* Inner track */}
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke="var(--bg-soft)" strokeWidth={innerStroke} />
        {/* Inner segments — sugar (don't-exceed) coloured by cumulative-end
            zone so later meals push the arc toward yellow/red; or legacy
            protein in a single zone color. */}
        {innerSegments.map((seg, i) => {
          const segLenAbs = c2 * seg.lenPct
          const visibleLen = Math.max(segLenAbs - GAP_PX, 0.5)
          const segColor = sugarMode ? calorieZone(seg.rawCumEnd).stroke : inner.stroke
          return (
            <circle
              key={`inner-seg-${i}`}
              cx={cx}
              cy={cy}
              r={r2}
              fill="none"
              stroke={segColor}
              strokeWidth={innerStroke}
              strokeLinecap="butt"
              strokeDasharray={`${visibleLen} ${c2}`}
              strokeDashoffset={-c2 * seg.startPct}
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
          {innerLabel}&nbsp;<span style={{ color: inner.number, fontWeight: 800 }}>{Math.round(innerValue)}</span>/{Math.round(innerTarget)}g
        </div>
      </div>
    </div>
  )
}
