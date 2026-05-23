# REVIEW — Claude → Codex/Antigravity

> **Last updated:** 2026-05-23 (after Phase 5 QA found gaps)
> **Verdict on Phase 5:** ⚠️ **REVISE** — Firebase wiring is solid, but onboarding and meal selectors are non-functional UI placeholders
> **Active phase:** **Phase 5.1 — Fix form interactivity** (must complete before Phase 6)

---

## What's working (do not touch)

Phase 5 Firebase implementation is excellent — keep all of this:
- `src/lib/firebase.ts` + `src/lib/auth.ts` + `src/lib/db.ts`
- All 7 data hooks (useToday, useMeals, useWeights, useWater, useWorkouts, useSleep, usePresets) + useAuth + useUser + useOnboarding
- Firestore rules + auth gate + first-time user detection
- Transactional day-totals denormalization
- Error boundary + bundle splitting
- Routes migrated from MOCK_* (correct — keep)

QA results from human:
- ✅ Auth gate works
- ✅ Google sign-in works (after adding `dietquest-sigma.vercel.app` to Firebase Authorized domains)
- ✅ Onboarding does navigate to Home after "Build my plan"
- ❌ **Onboarding form inputs are non-functional** (write default profile regardless of user input)
- ❌ **Log Meal meal-type selector non-functional** (always saves as Breakfast)
- ❌ **"Starter preset" card not clickable** when user has no presets

---

## Phase 5.1 Brief — Fix form interactivity

These are interactive UI controls that look like inputs but have no state/handlers. Add real React state + handlers + persist to Firestore.

### Fix 1 — `src/routes/onboarding.tsx` OnboardingProfileRoute (line 55-109)

**Make all inputs real:**

1. **Sex selector** (line 67-73) — currently static `data-active={index === 0}`:
   - Add `useState<'male'|'female'|'other'>('male')`
   - Each `<span>` becomes `<button>` with `onClick={() => setSex(option)}`
   - `data-active={sex === option.toLowerCase()}`

2. **Age stepper** (Stepper component line 111-131) — `+` and `-` buttons have no onClick:
   - Convert `Stepper` to controlled component: `<Stepper value={age} onChange={setAge} min={13} max={100} />`
   - `+` button: `onClick={() => onChange(Math.min(value + 1, max))}`
   - `-` button: `onClick={() => onChange(Math.max(value - 1, min))}`
   - Disable buttons at min/max

3. **Height stepper** — same as age, range [120, 230] cm, step 1

4. **Current weight** (line 80-86) — currently just `<Card>` displaying text, NO INPUT:
   - Replace with stepper too, but with **decimal support**: step 0.1, range [30, 300] kg
   - Use a new `<DecimalStepper value={weight} onChange={setWeight} step={0.1} />` OR
   - Use `<input type="number" step="0.1" inputMode="decimal" />` styled to match design
   - Default value: 80.0 (current MOCK_USER weight)

5. **BMI · TDEE preview** (line 89-99) — currently hardcoded "28.0 BMI · 2,450 kcal":
   - Compute live from state: `bmi = weight / (height/100)^2`, `tdee = bmr * 1.5`
   - Use `src/lib/nutrition.ts` if it has functions, otherwise add `computeBMI()` and `computeTDEE()` there

6. **Continue button** — must pass state forward. Use a Zustand store `useOnboardingDraft` OR React Router state OR localStorage to carry the profile across the 3 onboarding screens.

   Recommended pattern: `src/stores/onboardingDraft.ts` Zustand store:
   ```typescript
   { sex, age, height_cm, weight_start_kg, weight_target_kg, target_months,
     setSex, setAge, setHeight, setStartWeight, setTargetWeight, setTargetMonths,
     reset }
   ```

### Fix 2 — `OnboardingGoalRoute` (line 133-201)

1. **Target weight** (line 145-160) — currently just `<Card>` displaying text:
   - Replace with stepper (decimal, step 0.5), range [40, weight_start_kg - 1]
   - Reads `weight_start_kg` from draft store

2. **Timeline** (line 163-175) — currently CSS-only "slider":
   - Replace with real `<input type="range" min={3} max={12} value={months} onChange={...} />`
   - Style to match the visual (sliderTrack/sliderFill/sliderThumb classes — wrap input)
   - Display computed end date: `by ${endDate.toLocaleDateString()}`

3. **Daily plan preview** (line 178-186) — currently hardcoded "1,950 kcal · 140g protein":
   - Compute from state using `nutrition.ts`:
     - `dailyDeficit = (startWeight - targetWeight) * 7700 / (months * 30)` kcal/day
     - `dailyKcal = tdee - dailyDeficit`
     - `dailyProtein = targetWeight * 1.8` g
   - Display computed values

4. **"Build my plan" button** — must use draft state, not DEFAULT_PROFILE:
   ```typescript
   const draft = useOnboardingDraft()
   await completeOnboarding({
     sex: draft.sex,
     age: draft.age,
     height_cm: draft.height_cm,
     weight_start_kg: draft.weight_start_kg,
     weight_target_kg: draft.weight_target_kg,
     target_date: addMonths(new Date(), draft.target_months),
   })
   draft.reset()
   navigate('/')
   ```

### Fix 3 — `src/routes/log-meal.tsx` LogMealRoute (line 16-74)

1. **Meal type segmented** (line 33-39) — currently `data-active={index === 0}` static:
   - Add `useState<MealType>('breakfast')`
   - Each `<span>` becomes `<button>` with onClick to update state
   - Default to current time of day:
     - 04:00-10:00 → breakfast
     - 10:00-15:00 → lunch
     - 15:00-22:00 → dinner
     - else → snack
   - Pass selected meal type to confirm screen via state

2. **"Starter preset" card** (line 47-51) — when presets.length === 0:
   - Convert from `<Card>` to `<button>` (or wrap Card in button)
   - onClick: navigate to confirm with default preset

3. **Pass meal type to confirm screen:**
   - Either via React Router state: `navigate('/log/meal/confirm', { state: { mealType, presetId } })`
   - Or via small Zustand store `useMealDraft`
   - LogMealConfirmRoute reads it; falls back to breakfast if missing

### Fix 4 — `LogMealConfirmRoute` (line 76-156)

1. Replace `useSelectedPreset()` (which always returns `data[0]`) with the actual selected preset from navigation state / draft store
2. Display the meal type from selection (not hardcoded "Breakfast" in header line 112)
3. `saveMeal()` uses `meal_type: selectedMealType` (not `preset.meal_type`)
4. Confirm message in LogMealSavedRoute should say "{Mealtype} logged" not always "Breakfast logged" (line 169)

### Fix 5 — Verify Home refresh after meal log

User reported "ไม่มีข้อมูลแสดง" after save. Check:

1. `src/lib/dates.ts` `todayKey()` — must return local timezone date in YYYY-MM-DD format. If using UTC, late-night logs go to wrong date.
   ```typescript
   export function todayKey(): string {
     const now = new Date()
     const y = now.getFullYear()
     const m = String(now.getMonth() + 1).padStart(2, '0')
     const d = String(now.getDate()).padStart(2, '0')
     return `${y}-${m}-${d}`
   }
   ```

2. `useToday()` must subscribe to the SAME date key. If it computes today separately, mismatch is possible.

3. `useMeals(date)` must use `onSnapshot` not `getDocs` — confirm in `src/lib/db.ts`

4. Test manually: log meal → check Firestore Console → see doc appeared in `users/{uid}/meals/`. Then check `users/{uid}/days/{today}/totals` updated. If write succeeded but UI didn't refresh = listener issue.

### Fix 6 — Other forms that might have the same issue (audit)

Codex/Antigravity: grep for similar patterns and fix:
- `src/routes/log-water.tsx` or wherever water input is — check "Add 250 / 500 / Custom" buttons are wired
- `src/routes/log-weight.tsx` — confirm weight input is real
- `src/routes/log-sleep.tsx` — confirm time pickers actually work
- `src/routes/log-workout.tsx` — confirm incline/speed sliders are real inputs
- `src/routes/profile.tsx` — settings (theme toggle should already work via useTheme; goals editing may not)

For each screen with "input-looking UI", verify:
- State exists
- onChange handlers fire
- Submit uses the state value (not a default const)

---

## Commit convention for Phase 5.1

```
fix(onboarding): wire profile form inputs to real state
fix(onboarding): wire goal form inputs to real state
feat(stores): onboarding draft store
fix(log): wire meal-type selector and preset selection
fix(log): persist meal type through confirm flow
fix(dates): ensure todayKey uses local timezone
fix(log): audit and wire remaining log-* screens
```

---

## DoD Phase 5.1 (fill in STATUS.md when done)

- [ ] Onboarding profile: Sex/Age/Height/Weight all editable, persist to Firestore correctly
- [ ] Onboarding goal: Target weight + timeline editable, daily kcal computed from inputs
- [ ] Verify in Firestore Console: `users/{uid}.profile.weight_start_kg` matches what was entered
- [ ] BMI/TDEE/kcal preview updates live as user changes inputs
- [ ] Log Meal: meal-type selector switches between breakfast/lunch/dinner/snack
- [ ] Log Meal: "Starter preset" card is clickable when user has no saved presets
- [ ] Log Meal: selected meal type carries through to confirm + saved screens
- [ ] Home refreshes within 2 sec after meal is logged (onSnapshot working)
- [ ] todayKey uses local timezone (test: log meal at 23:30 local, should appear under today's date)
- [ ] Other log screens audited and any placeholder UI fixed
- [ ] `npm run build` clean
- [ ] Deployed to Vercel; production has fixes
- [ ] STATUS.md updated, HISTORY.md appended (entry: "Phase 5.1 — form interactivity fixes")

When done, STOP for Claude review.

---

## Notes for next agent (if switching from Codex to Antigravity)

This is Antigravity's first phase on this project. To onboard quickly:

1. Read `AGENT_LOG/README.md` (the loop)
2. Read this REVIEW.md (current task — Phase 5.1 fixes)
3. Read `AGENT_LOG/STATUS.md` (Codex's last report — what was built)
4. Read `AGENT_LOG/HISTORY.md` (phase outcomes so far)
5. Read `BUILD_HANDOFF.md` (project spec) — sections 2, 4, 6 are most relevant
6. Read `src/lib/mock.ts`, `src/types/domain.ts`, `src/lib/db.ts` — to understand data shape
7. Then start fixing per the Fix 1-6 list above

Coding style observed so far: Inline styles for small (≤5 props), CSS Modules for layout. Conventional commits. No `any` types. CSS variables from `tokens.css` for colors. Use `appStyles as styles` import pattern from `@/components/layout/AppScreen`. Components use named exports (not default).

The previous agent (Codex) wrote ~15 commits per phase, well-scoped. Follow the same granularity.

---

## After Phase 5.1 → Phase 6 brief (will be provided when 5.1 closes)

Phase 6 will cover: toasts, skeletons, pull-to-refresh, haptic, data export, npm audit, Lighthouse re-audit, README polish, v1.0.0 tag. Do NOT start Phase 6 until 5.1 is reviewed and approved.
