# REVIEW — Claude → Antigravity

> **Last updated:** 2026-05-23 (Phase 6.1 expanded scope — all 18 issues)
> **Verdict on Phase 6:** ⚠️ **REVISE**
> **Active phase:** **Phase 6.1 — Full audit fixes (all 4 severity levels)**

---

## Context

Phase 6 shipped successfully but a comprehensive UI audit by Claude found 18 leftover issues — most are Phase 3 visual placeholders that never got wired through Phase 5/6. User wants ALL fixed before v1.0.1.

Estimated effort: **14-20 hours** (~2 work sessions). Tag v1.0.1 only after all pass.

---

## 🔴 CRITICAL — Fix 1: Workout flow real implementation

File: `src/routes/log-workout.tsx`

The entire 3-screen workout flow is visual mockup. Implement properly:

### 1.1 — Create `src/stores/workoutDraft.ts`

```typescript
import { create } from 'zustand'

type WorkoutType = 'incline_walk' | 'bodyweight' | 'other'

interface WorkoutDraftState {
  type: WorkoutType
  incline_pct: number       // 0-15
  speed_kmh: number         // 3.0-7.0
  target_duration_min: number  // 10-120
  startedAt: number | null  // Date.now() ms
  pausedAt: number | null   // ms when paused, null when running
  totalPausedMs: number     // accumulated paused time
  elapsedMs: number         // live elapsed (updated via tick)

  setType: (type: WorkoutType) => void
  setIncline: (pct: number) => void
  setSpeed: (kmh: number) => void
  setTargetDuration: (min: number) => void
  start: () => void
  pause: () => void
  resume: () => void
  tick: () => void
  reset: () => void
}

// Defaults: incline_walk, 8%, 5.5 km/h, 45 min
```

### 1.2 — `LogWorkoutRoute` (Pre-workout) editable

- Type selector (Incline walk / Bodyweight / Other) — segmented control wired
- Incline stepper (0-15%, step 0.5)
- Speed stepper (3.0-7.0 km/h, step 0.1)
- Target duration stepper (10-120 min, step 5)
- Reuse `Stepper` from profile.tsx (recommend extracting to `src/components/primitives/Stepper.tsx`)
- Start button → `workoutDraft.start()` → navigate to active

### 1.3 — `LogWorkoutActiveRoute` real timer

```typescript
useEffect(() => {
  if (!startedAt || pausedAt) return
  const id = setInterval(() => tick(), 1000)
  return () => clearInterval(id)
}, [startedAt, pausedAt])
```

- Timer displays `elapsedMs` as MM:SS (or HH:MM:SS if > 60min)
- kcal live via MET: `METs = 4.0 + (incline * 0.5)`, `kcal/min = (METs × 3.5 × weight_kg) / 200`
- Get `weight_kg` from `useUser().profile.weight_start_kg`
- Pause button: `onClick={pause}` → stops timer, button becomes "Resume"
- Resume button: `onClick={resume}` → continues, accumulates paused time
- Remove the Bolt button (or document as deferred)
- Stop button → navigate to summary
- Wake Lock stays (already implemented)

### 1.4 — `LogWorkoutSummaryRoute` real data + save

- Read `elapsedMs / incline / speed / kcal / distance` from draft
- Distance = `speed * (elapsedMs / 3600000)` rounded 1 decimal
- Save writes REAL values:
  ```typescript
  await add({
    date: todayKey(),
    type: draft.type,
    duration_min: Math.round(draft.elapsedMs / 60000),
    incline_pct: draft.incline_pct,
    speed_kmh: draft.speed_kmh,
    kcal_burned: computedKcal,
    mood: 'strong',
  })
  ```
- After save: `draft.reset()` → toast + haptic → navigate home

---

## 🟠 HIGH — Fix 2: 8 fake buttons (remove or wire)

### 2.1 — `log-meal.tsx` line 46-48: Search icon
**Remove.** Replace with `<span style={{ width: 40 }} />` spacer.

### 2.2 — `log-meal.tsx` line 198-200: Edit icon on Confirm
**Remove.** Item editing → v1.1.

### 2.3 — `plan.tsx` line 46-49: Search bar
**Remove** entire fake search card.

### 2.4 — `plan.tsx` line 54: "Open full plan" button
**Remove.** No external full-plan URL yet.

### 2.5 — `plan.tsx` line 57-78: Accordion items
**Wire.** Add state:
```typescript
const [openSection, setOpenSection] = useState<number | null>(0)
```
- Click header → toggle (null if same as current)
- Chevron flips: `arrowUp` if open, `chevron` if closed
- Show items only inside open section

### 2.6 — `plan.tsx` line 72: "Use" pills
**Remove.** Just show item name (using → v1.1).

### 2.7 — `home.tsx` line 152: "Edit" action on Today's meals
**Remove.** Remove `action="Edit"` prop on SectionLabel.

### 2.8 — `profile.tsx` line 233-237: About DietQuest row
**Wire.** Make it a button that opens a small modal/sheet:
- App version: v1.0.1 (after retag)
- "Built with Vite + React + Firebase"
- Repository link: https://github.com/WarmWam/dietquest
- Copyright/credit line

---

## 🟡 MEDIUM — Fix 3: Hardcoded display values

### 3.1 — `home.tsx` line 149: Incline mini-stat
Currently hardcoded `pct={today.habits.walk_done ? 0.75 : 0}` and `value={today.habits.walk_done ? '45' : '0'}`.

**Fix:** Compute from actual workout data:
```typescript
const { data: workouts } = useWorkouts(1)
const todayKey = todayKey()
const todayWorkouts = workouts.filter((w) => w.date === todayKey)
const totalMin = todayWorkouts.reduce((sum, w) => sum + w.duration_min, 0)
const target = 60  // or read from settings
```
Then `pct={Math.min(totalMin/target, 1)}` and `value={String(totalMin)}`.

### 3.2 — `progress.tsx` CaloriesTab line 127: 7-day bar chart fake
Currently: `const days = [0, 0, 0, 0, 0, 0, today.totals.kcal]`

**Fix:** Query 7-day day-totals from Firestore. Add new hook OR extend `useToday` to support `daysBack`:
```typescript
// new: useDayTotals(daysBack: number) returns DayTotals[]
const { data: weekTotals } = useDayTotals(7)
const days = weekTotals.map((t) => t.totals.kcal)
```
- If hook doesn't exist, create `src/hooks/useDayTotals.ts` using `getDoc` for each of last 7 days (batch via `Promise.all`)
- Also update labels `['M','T','W','T','F','S','S']` to actual day-of-week of those dates
- Highlight today's bar (already done with `index === 6`)

### 3.3 — `progress.tsx` ActivityTab line 178-187: Heatmap fake
Currently: `const active = workouts.length > week + day` — totally fake logic.

**Fix:** Render 13 weeks × 7 days = 91 cells representing last 91 days. For each cell:
```typescript
const cellDate = subDays(today, (12 - week) * 7 + (6 - day))
const cellKey = formatDate(cellDate, 'YYYY-MM-DD')
const hasWorkout = workouts.some((w) => w.date === cellKey)
```
- Show intensity (opacity 0.2 - 1.0) based on duration_min that day, OR binary 0.12 / 0.8
- Add tooltip on hover (optional v1.1)

### 3.4 — `progress.tsx` ActivityTab line 193: "Best week" hardcoded
Currently: `value={workouts.length ? 'active' : 'none'}`

**Fix:** Compute best week (most workout minutes in any 7-day window of last 90 days):
```typescript
// Group workouts by week, sum duration_min, find max
const bestWeekMin = ...
value={bestWeekMin ? `${bestWeekMin} min` : '—'}
```

### 3.5 — `profile.tsx` line 203: Goal progress bar 100% always
Currently: `<div className={styles.progressFill} style={{ width: '100%' }} />`

**Fix:** Compute progress from weight loss:
```typescript
const { data: weights } = useWeights(60)
const latest = weights[weights.length - 1]
const totalToLose = userProfile.weight_start_kg - userProfile.weight_target_kg
const lost = userProfile.weight_start_kg - (latest?.weight_kg ?? userProfile.weight_start_kg)
const pct = totalToLose > 0 ? Math.min(Math.max(lost / totalToLose, 0), 1) : 0
// width: `${pct * 100}%`
```
Add text under bar: `{lost.toFixed(1)} kg of {totalToLose.toFixed(1)} kg ({Math.round(pct * 100)}%)`

### 3.6 — Notification preferences UI (missing entirely)
Add a new section in Profile (above "Data" section):

```
Notifications
├─ Breakfast reminder    [toggle]
├─ Lunch reminder        [toggle]
├─ Water (every 2h)      [toggle]
├─ Workout reminder      [toggle]
└─ Bedtime reminder      [toggle]
```

For v1.0.1: **UI only** — toggles persist to `users/{uid}.settings.notifications` in Firestore. **Actual scheduling deferred to v1.1** (needs FCM + cron). Show small caption: `"Coming soon — preferences saved for v1.1"`.

Use same `<button className={styles.switch}>` pattern as the haptic toggle for visual consistency.

---

## 🔵 LOW — Fix 4: UX polish

### 4.1 — Log Meal: portion/items not editable
Edit icon was removed in Fix 2.2 (HIGH). User still wants ability to skip an item OR adjust portion.

**Minimum for v1.0.1:**
- Add `−` and `+` button next to each item to adjust portion (0.5 step, min 0.25, max 5)
- Live recompute meal total kcal/protein/carb/fat as portion changes
- No add/remove items in v1.0.1 (deferred)

If portion adjustment is too complex, alternative simpler approach:
- Add "Skip" button per item that excludes it from save
- Items just have a checkbox; recompute totals from checked items

Pick the simpler implementation.

### 4.2 — Log Water: add "+ Custom" button
File: `src/routes/log-water.tsx`

Add a third button after +250 / +500: `+ Custom`
- Opens a small inline input or sheet
- User types ml (number)
- Save same as other amounts

Simplest implementation: `prompt('How many ml?')` then validate number > 0 and < 5000. For polish, use a small modal with number input — but `prompt()` is acceptable for v1.0.1.

### 4.3 — Log Sleep: "within target window" should be conditional
File: `src/routes/log-sleep.tsx` line 91

Currently: `<p style={{ color: 'var(--success)', fontWeight: 800 }}>within target window</p>` (always shows)

**Fix:** Make it conditional on actual duration:
```typescript
const totalMin = durationMin
const isGood = totalMin >= 7 * 60 && totalMin <= 9 * 60  // 7-9 hours

{isGood ? (
  <p style={{ color: 'var(--success)' }}>Within target window</p>
) : totalMin < 7 * 60 ? (
  <p style={{ color: 'var(--warning)' }}>Below 7 hour target</p>
) : (
  <p style={{ color: 'var(--warning)' }}>More than 9 hours</p>
)}
```

---

## DoD Phase 6.1 (all 18 must check)

### CRITICAL
- [ ] workoutDraft store with timer state
- [ ] Pre-workout: type/incline/speed/duration editable
- [ ] Active screen: timer counts up in real-time (verify ~30 sec = ~30 sec)
- [ ] Active screen: kcal live calculation (verify increases each second)
- [ ] Pause button stops timer
- [ ] Resume continues without double-counting paused time
- [ ] Bolt button removed
- [ ] Summary shows REAL data (not 45:22 / 328)
- [ ] Save writes REAL values (verify 2 different workouts in Firestore = 2 different durations)

### HIGH (each removed or wired)
- [ ] log-meal search icon removed
- [ ] log-meal confirm edit icon removed
- [ ] plan search bar removed
- [ ] plan "Open full plan" removed
- [ ] plan accordion expand/collapse works
- [ ] plan "Use" pills removed
- [ ] home "Edit" action removed
- [ ] profile About row functional (opens modal/sheet)

### MEDIUM
- [ ] home Incline mini-stat reflects actual workout duration today
- [ ] Calories tab 7-day chart shows real data (create useDayTotals if needed)
- [ ] Activity heatmap maps to real dates (last 91 days)
- [ ] Activity "Best week" shows computed value
- [ ] Profile Goal progress bar shows real % (with text)
- [ ] Profile Notifications section added (UI only, saves toggles to Firestore)

### LOW
- [ ] Log Meal portion adjustable per item (or skip checkbox — simpler one)
- [ ] Log Water + Custom button added
- [ ] Log Sleep target window label conditional on duration

### Sanity
- [ ] grep `<button` across src/ — no button without onClick
- [ ] `npm run build` clean, no TS errors
- [ ] Bundle stays under 350 KB JS gzipped
- [ ] Lighthouse Performance still ≥ 90, all others ≥ Phase 6 baseline
- [ ] Pushed to Vercel; production has all fixes

### QA (extend Playwright)
- [ ] workout: change settings → start → wait 5s → stop → verify duration ≈ 5s, kcal ≈ 0-1
- [ ] workout: pause for 3s → resume → verify timer doesn't include paused time
- [ ] plan: tap section header → expands → tap again → collapses
- [ ] profile: tap About → modal opens → close works
- [ ] calories tab: shows real 7 bars from past week (or skeleton if empty)
- [ ] activity heatmap: log workout today → reload → today's cell visible
- [ ] profile goal bar: width matches lost/totalToLose ratio
- [ ] notification toggles: switch on → reload → still on (Firestore persisted)
- [ ] log water +Custom: type 350 → save → see "+350 ml" log
- [ ] log sleep 4hr: see "Below target" message instead of "Within target"
- [ ] Save Playwright report to `AGENT_LOG/phase6.1-qa-report.md`

### Final
- [ ] STATUS.md updated
- [ ] HISTORY.md appended
- [ ] All pushed to main
- [ ] Wait for Claude review
- [ ] Tag `v1.0.1` only after approval

---

## Rules

- DO NOT add features beyond the 18 listed
- DO NOT touch Firebase backend / Firestore schema
- DO NOT remove existing working features
- DO reuse Stepper across all uses (extract to primitives if not already)
- DO use existing toast + haptic for new save actions
- DO keep `prompt()` as fallback for Custom water if modal is too time-consuming
- DO match existing code conventions (named exports, CSS modules, inline ≤5 props, no `any`)

---

## Commit convention

```
feat(stores): workout draft store with timer
feat(workout): editable pre-workout settings
feat(workout): live timer with pause-resume + MET kcal
feat(workout): real summary data + save
refactor(primitives): extract Stepper component
fix(log-meal): remove non-functional icons
fix(plan): accordion + remove fake UI
fix(home): remove Edit action stub
feat(profile): About sheet
feat(hooks): useDayTotals for 7-day chart
fix(progress): real 7-day calories chart
fix(progress): real activity heatmap and best week
fix(profile): goal progress bar real percent
feat(profile): notification preferences UI (persist only)
feat(log-meal): per-item portion adjustment
feat(log-water): custom amount button
fix(log-sleep): conditional target window message
test(qa): extend Playwright for Phase 6.1
docs: STATUS + HISTORY update
chore(release): tag v1.0.1
```

---

## After Phase 6.1

```bash
git tag -a v1.0.1 -m "v1.0.1 — Full UI audit fixes (workout flow + 17 other)"
git push origin v1.0.1
```

This becomes the true production version. v1.0.0 stays in history as initial release that needed fixes.

---

## Deferred to v1.1 (still out of scope)

- Search feature (Log Meal + Plan)
- Meal item add/remove (only portion editable in v1.0.1)
- Activity heatmap tooltips
- Notification scheduling backend (FCM + cron)
- Photo upload + Progress Photos tab
- Multi-user (couple mode)
- Apple Health integration
