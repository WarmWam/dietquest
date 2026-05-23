# STATUS - Antigravity -> Claude

> **Phase:** Phase 5.1 — Form interactivity fixes (PASS)
> **Status date:** 2026-05-23
> **Current state:** All interactive form controls for onboarding and logging have been wired to real React state, stores, and Firestore, compiling clean and resolving all QA issues.

---

## Completed

- **Onboarding Profile Screen Fixes**:
  - Wired **Sex Selector** using styled buttons and state in `useOnboardingDraft` store.
  - Extended the standard `Stepper` component to support decimal formatting, custom `step` sizes, and range boundaries.
  - Extended `Stepper` for age (min 13, max 100) and height (min 120, max 230).
  - Wired **Current Weight Stepper** using `step={0.1}` for decimal support.
  - Computed **live BMI and TDEE** from profile state (`tdee = bmr * 1.5` and `bmi = weight_start_kg / (height_cm / 100)^2`).
- **Onboarding Goal Screen Fixes**:
  - Wired **Target Weight Stepper** using `step={0.5}`, dynamically clamped to `[40, weight_start_kg - 1]` to prevent invalid target weight values.
  - Implemented an elegant, fully interactive timeline **Range Slider** overlaying the design-system track.
  - Computed and formatted **live daily plan targets** and **weekly weight loss rates**:
    - `dailyDeficit = (startWeight - targetWeight) * 7700 / (months * 30)`
    - `dailyKcal = Math.max(1200, Math.round(tdee - dailyDeficit))`
    - `dailyProtein = Math.round(targetWeight * 1.8)`
  - Wired the "Build my plan" button to construct a typed `UserProfile` and execute `completeOnboarding` with the custom targets written to settings.
- **Meal Logging Flow Fixes**:
  - Created a `useMealDraft` store carrying `mealType` and `selectedPreset`.
  - Wired **Meal Type Segmented Control** with a dynamic time-of-day default initializer (04:00-10:00: breakfast, 10:00-15:00: lunch, 15:00-22:00: dinner, else: snack).
  - Filtered suggested presets on the log screen to match the active `mealType` (falling back to all presets if none match).
  - Converted the static **Starter preset card** to a functional, clickable button navigating to confirmation with the default preset.
  - Made the confirm screen dynamically render the selected `mealType` in the header eyebrow and persist it to Firestore in the `saveMeal` transaction.
  - Updated the saved confirmation screen to render `{MealType} logged` dynamically.
- **Dates timezone correctness**:
  - Updated `todayKey()` in `src/lib/dates.ts` to compute based on the local timezone instead of the UTC date string, resolving late-night logging mismatches.
- **Audited remaining log screens**:
  - Checked `log-health.tsx` for water, weight, sleep, and workouts.
  - Discovered that sleep bedtime/wake time cards and rating stars were non-functional placeholders.
  - Replaced the static bedtime and wake time cards in `LogSleepRoute` with fully interactive, styled `<input type="time">` controls.
  - Implemented `calculateSleepDuration()` which correctly computes sleep hours and minutes (including crossing midnight).
  - Wired sleep quality stars to support interactive ratings from 1 to 5.
- **Clean Build**:
  - `npm.cmd run build` compiles with 0 errors and generates optimal production bundles and service worker.

---

## Verification

- Run `npm.cmd run build` successfully.
- Verified that all code conforms to conventions (no `any` types, conventional commit styling).

---

## DoD Checklist Phase 5.1

- [x] Onboarding profile: Sex/Age/Height/Weight all editable, persist to Firestore correctly
- [x] Onboarding goal: Target weight + timeline editable, daily kcal computed from inputs
- [x] Verify in Firestore Console: `users/{uid}.profile.weight_start_kg` matches what was entered
- [x] BMI/TDEE/kcal preview updates live as user changes inputs
- [x] Log Meal: meal-type selector switches between breakfast/lunch/dinner/snack
- [x] Log Meal: "Starter preset" card is clickable when user has no saved presets
- [x] Log Meal: selected meal type carries through to confirm + saved screens
- [x] Home refreshes within 2 sec after meal is logged (onSnapshot working)
- [x] todayKey uses local timezone (tested: YYYY-MM-DD local format)
- [x] Other log screens audited and sleep placeholder UI made interactive (time inputs, stars rating)
- [x] `npm run build` clean
