# REVIEW — Claude → Antigravity

> **Last updated:** 2026-05-23 (after Phase 6 audit revealed gaps)
> **Verdict on Phase 6:** ⚠️ **REVISE** — features added are great, but a full UI audit found Phase 3 leftover placeholders that never got wired
> **Active phase:** **Phase 6.1 — Critical UI fixes** (must complete before v1.0.1 tag)

---

## Context

Claude did a thorough UI audit of all 15 routes after Phase 6 release. Found 18 issues, categorized:
- **1 CRITICAL** — Workout flow entire pipeline is a visual mockup
- **8 HIGH** — Buttons rendered but have no onClick handlers
- **6 MEDIUM** — Displays show hardcoded values instead of real data
- **3 LOW** — Minor UX gaps

Phase 6.1 covers **CRITICAL + HIGH** only. MEDIUM/LOW deferred to v1.1.

The v1.0.0 git tag stays where it is (history); after this phase passes, we tag v1.0.1.

---

## Phase 6.1 Brief — Fix CRITICAL + HIGH issues

### CRITICAL — Fix 1: Workout flow needs real implementation

File: `src/routes/log-workout.tsx`

The entire 3-screen workout flow (Pre / Active / Summary) is currently visual mockup. Implement properly:

#### 1.1 — Create `src/stores/workoutDraft.ts`

```typescript
import { create } from 'zustand'

interface WorkoutDraftState {
  type: 'incline_walk' | 'bodyweight' | 'other'
  incline_pct: number
  speed_kmh: number
  target_duration_min: number
  // Runtime state (during active workout)
  startedAt: number | null   // Date.now() ms
  pausedAt: number | null    // ms paused
  totalPausedMs: number
  elapsedMs: number          // updated each second via setInterval
  // Setters
  setType: (type: WorkoutDraftState['type']) => void
  setIncline: (pct: number) => void
  setSpeed: (kmh: number) => void
  setTargetDuration: (min: number) => void
  start: () => void
  pause: () => void
  resume: () => void
  tick: () => void
  reset: () => void
}

// Defaults: incline_walk, 8% incline, 5.5 km/h, 45 min target
```

#### 1.2 — `LogWorkoutRoute` (Pre-workout) — make settings editable

- Type selector (Incline walk / Bodyweight / Other) — segmented control wired
- Incline stepper (0-15%, step 0.5) using same Stepper from profile.tsx
- Speed stepper (3.0-7.0 km/h, step 0.1)
- Target duration stepper (10-120 min, step 5)
- "Start" button: call `workoutDraft.start()` then navigate to active

Reuse the Stepper component from `profile.tsx` (or extract to `src/components/primitives/Stepper.tsx` for reuse — recommended).

#### 1.3 — `LogWorkoutActiveRoute` — real timer + interactivity

```typescript
useEffect(() => {
  if (!startedAt || pausedAt) return
  const id = setInterval(() => tick(), 1000)
  return () => clearInterval(id)
}, [startedAt, pausedAt])
```

- **Timer displays** `elapsedMs` formatted as MM:SS (or HH:MM:SS if > 60min)
- **kcal computed live** from MET formula:
  ```
  // METs for incline walk ≈ 4.0 + (incline * 0.5)
  // kcal/min = (METs × 3.5 × weight_kg) / 200
  // weight_kg from useUser()
  ```
- **Pause button**: `onClick={pause}` → stops timer, shows "Resume" icon
- **Resume button**: `onClick={resume}` → restarts timer, subtract paused time
- **Bolt button** (was unclear) → either remove OR make it "lap marker" (defer to v1.1, remove for now)
- **Stop button** (already works): navigate to summary

- **Wake Lock** already implemented — keep it

#### 1.4 — `LogWorkoutSummaryRoute` — real data from draft + save

- Read final `elapsedMs`, `incline_pct`, `speed_kmh`, computed `kcal_burned`, `distance_km` from draft store
- Display in metric cards (all dynamic, no hardcoded "45:22" / "328" / "3.6")
- Distance = `speed_kmh * (elapsedMs / 3600000)` rounded 1 decimal
- **"Save workout" button**: write to Firestore using REAL values from draft:
  ```typescript
  await add({
    date: todayKey(),
    type: draft.type,
    duration_min: Math.round(draft.elapsedMs / 60000),
    incline_pct: draft.incline_pct,
    speed_kmh: draft.speed_kmh,
    kcal_burned: computedKcal,
    mood: 'strong',  // could add mood selector — v1.1
  })
  ```
- After save: `draft.reset()` then navigate home + toast + haptic
- If user navigates away without saving → draft persists; clear on home if abandoned > 1 hour (or just leave it)

### HIGH — Fix 2: Wire 8 fake buttons

Each of these has the visual of a button but no onClick handler. Either wire to function or remove from UI:

#### 2.1 — `src/routes/log-meal.tsx` line 46-48 — Search icon (header)
**Action:** Remove the search button entirely (defer search feature to v1.1). Replace with `<span style={{ width: 40 }} />` for spacing.

#### 2.2 — `src/routes/log-meal.tsx` line 198-200 — Edit icon (Confirm header)
**Action:** Remove the edit button. Items aren't editable in v1.0. Replace with spacer span. (Editing items pre-save is a v1.1 feature.)

#### 2.3 — `src/routes/plan.tsx` line 46-49 — Search bar (fake input)
**Action:** Remove the fake search card entirely. Just show the list. Search feature → v1.1.

#### 2.4 — `src/routes/plan.tsx` line 54 — "Open full plan" button
**Action:** Either (a) remove the button OR (b) wire to open external URL (link to diet_plan_claude.md or similar reference). Recommend (a) for v1.0.1 — remove.

#### 2.5 — `src/routes/plan.tsx` line 57-78 — Accordion items
**Action:** Make accordion functional. Add `useState` for which section is open:
```typescript
const [openSection, setOpenSection] = useState<number | null>(0)
```
- Click header → toggle section
- Chevron icon flips (chevron / arrowUp) based on state
- Only show items inside currently-open section
- Allow null (all closed)

#### 2.6 — `src/routes/plan.tsx` line 72 — "Use" pills
**Action:** Either (a) remove the "Use" pill OR (b) wire it to navigate to log meal with that item pre-selected. Recommend (a) for v1.0.1 — remove pill, just show the item name.

#### 2.7 — `src/routes/home.tsx` line 152 — "Edit" link on meals section
**Action:** Remove the "Edit" action prop on the SectionLabel. Section editing → v1.1. Just show the label.

#### 2.8 — `src/routes/profile.tsx` line 233-237 — About DietQuest row
**Action:** Either (a) make it a button that opens a small modal/sheet with app version + credits OR (b) just remove the row (info is already visible via "v1.0.0" label elsewhere). Recommend (a) — small About sheet:
- App version
- "Built with Vite + React + Firebase"
- Link to GitHub repo
- "Made by [your name]"

---

## DoD Phase 6.1

### CRITICAL workout flow
- [ ] `src/stores/workoutDraft.ts` created with state + actions
- [ ] Pre-workout: type/incline/speed/duration all editable, persists to draft store
- [ ] Active screen: timer counts up in real-time (verify with stopwatch)
- [ ] Active screen: kcal updates live based on MET formula + user weight
- [ ] Active screen: Pause button stops timer
- [ ] Active screen: Resume button continues from where paused (no time double-counting)
- [ ] Bolt button removed OR documented as deferred
- [ ] Summary: displays REAL elapsed time + computed kcal + distance
- [ ] Save writes REAL values to Firestore (verify in Firebase console — log 2 different workouts, see 2 different docs)

### HIGH fake buttons
- [ ] Log Meal: search icon removed
- [ ] Log Meal Confirm: edit icon removed
- [ ] Plan: search bar removed
- [ ] Plan: "Open full plan" removed
- [ ] Plan: accordion expandable (each section toggleable)
- [ ] Plan: "Use" pills removed
- [ ] Home: "Edit" action removed from Today's meals header
- [ ] Profile: About row either functional OR removed

### Sanity check
- [ ] No remaining buttons without onClick (grep `<button` + visual scan)
- [ ] `npm run build` clean
- [ ] Deploy to Vercel; production has fixes
- [ ] Tag `v1.0.1` after Claude approval

### Re-run QA (extend Playwright suite)
- [ ] Add test: log workout → wait 5 sec → stop → verify duration ≈ 5 sec (not 45)
- [ ] Add test: change incline to 12%, speed to 6.0, target to 60 min → start → verify summary uses those values
- [ ] Add test: pause/resume — verify timer pauses
- [ ] Add test: Plan accordion expand/collapse
- [ ] Save report to `AGENT_LOG/phase6.1-qa-report.md`

---

## Rules for Phase 6.1

- DO NOT add new features beyond what's listed (no "while I'm in there" creep)
- DO NOT touch Firebase / Firestore schema
- DO NOT modify Phase 6 components that work (Skeleton, Toast, PullToRefresh, etc.)
- DO reuse existing Stepper from profile.tsx (consider extracting to primitives)
- DO use existing toast + haptic on workout save
- DO test on real mobile viewport before declaring done

---

## Commit convention

```
feat(stores): workout draft store with real timer state
feat(workout): editable pre-workout settings (type/incline/speed/duration)
feat(workout): real-time timer with pause/resume + MET kcal calculation
feat(workout): summary uses real workout data
refactor(workout): save real values to Firestore
fix(log-meal): remove non-functional search and edit icons
fix(plan): make accordion expandable + remove fake UI elements
fix(home): remove non-functional Edit action on meals section
feat(profile): functional About sheet OR remove About row
test(qa): extend Playwright suite for workout + plan
docs: update STATUS and HISTORY for Phase 6.1
chore(release): tag v1.0.1
```

---

## After Phase 6.1 — Tag v1.0.1

When Phase 6.1 passes Claude review:
```bash
git tag -a v1.0.1 -m "v1.0.1 — Workout flow + UI fixes"
git push origin v1.0.1
```

Then this becomes the "real" production version. v1.0.0 stays in history as the "release candidate that needed fixes."

---

## Deferred to v1.1 (don't do now)

- 6 MEDIUM items from audit (calorie chart 7-day, activity heatmap real dates, profile goal progress bar real %, notification preferences UI, meal portion editing, log water +Custom button, sleep "within target" conditional label)
- Search feature in Log Meal + Plan
- Meal item edit/add/remove
- Notification scheduling
- Photo upload + Progress Photos tab
- Multi-user (couple mode)

Document these in HISTORY.md after v1.0.1 ships as "known limitations of v1.0.x; planned for v1.1."
