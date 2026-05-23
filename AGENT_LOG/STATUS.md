# STATUS - Codex -> Claude

> **Phase:** Phase 6.2 - Error visibility + silent-failure hardening
> **Status date:** 2026-05-23
> **Current state:** Human-reported UI follow-ups complete after v1.0.2. Listener visibility work remains intact; Progress tabs are visible again, the prototype-only fake iOS status bar has been removed, and Profile settings layout has been simplified per QA feedback. Awaiting Claude/human review before any further release action.

---

## DoD Checklist

- [x] Every `onSnapshot` error handler in `src/lib/db.ts` logs with `console.error(label, error)`
  - Verified 8 `onSnapshot` calls and 8 `listenerError(...)` handlers:
    `watchUser`, `watchDayTotals`, `watchMeals`, `watchWeights`, `watchWaterToday`, `watchWorkouts`, `watchSleep`, `watchPresets`.
- [x] Home shows distinct error UI when meals or today fails
  - Added `Couldn't load today`, error message, and Retry button (`window.location.reload()`).
  - Error state renders before empty state, so it does not show `Day 1 - let us go`.
- [x] Each log/progress screen at minimum fires `toast.error` on hook error
  - Covered `home.tsx`, `progress.tsx`, `log-meal.tsx`, `log-water.tsx`, `log-weight.tsx`, `log-sleep.tsx`, `log-workout.tsx`, `plan.tsx`, `profile.tsx`.
- [x] Critical data screens show error card + toast
  - Home, Log Water, Log Weight.
- [ ] Manual test: disable network in DevTools -> reload -> see Home error UI
  - Not executed locally because the available QA harness targets production and can mutate the signed-in production account. Code path is implemented and build-verified.
- [ ] Manual test: intentionally break a query -> console error and user-visible feedback
  - Not executed for the same production-account safety reason. Static verification confirms every snapshot error path now calls `console.error` and propagates hook error state.
- [x] `npm run build` clean
  - `tsc -b && vite build` succeeded.
- [x] No new TypeScript errors
  - Covered by `npm run build`.
- [x] Bundle size delta < +2 KB
  - Final app chunk: `assets/index-CzZHSdix.js` 100.95 kB / 27.43 kB gzip.
  - Last intermediate Phase 6.2 build after Home pass: 99.30 kB / 27.11 kB gzip.
  - Delta: +1.65 kB raw / +0.32 kB gzip.
- [x] STATUS.md updated, HISTORY.md appended
- [x] Pushed to main
  - Code commits plus this docs closeout commit are pushed together after STATUS/HISTORY are committed.
- [x] Human follow-up UI regression fixed
  - Removed fake `9:41` / battery / signal mock status bar from `Phone`.
  - Moved app screens to real safe-area padding instead of reserving the old 54px mock status slot.
  - Made Progress tabs full-width and non-scroll-clipped so `Weight`, `Calories`, and `Activity` stay visible.
- [x] Profile QA feedback fixed
  - Replaced the text `Edit` button with a small pencil icon inside the top-right of the profile card.
  - Removed visible `Data` section from Profile.
  - Normalized settings rows so Theme/Vibrations/Notifications do not overlap and remain tappable.
  - Styled `Sign out` as dark red destructive text.
- [x] Profile overlap follow-up fixed
  - Prevented scroll-screen children and settings sections from flex-shrinking, which was compressing Theme/Vibrations/Notifications into each other on mobile viewport.

---

## Commits

- `56ab8f4` - `fix(db): log all listener errors to console with context label`
- `58481db` - `fix(home): distinguish error state from empty state`
- `280e5e6` - `fix(routes): surface query errors via toast on log + progress screens`
- `9f5b9b4` - `fix(ui): remove mock status bar and restore progress tabs`
- `de82459` - `fix(profile): simplify settings layout`
- pending - `fix(profile): prevent settings sections from overlapping`
- Phase 6.2 range: `56ab8f4...efb6c0f`
- Follow-up UI range: `9f5b9b4...HEAD`

---

## Decisions Made

- No new architectural decisions.
- Kept Phase 6.2 scoped to visibility only: console logging, visible route feedback, and reload retry buttons on critical error cards. No retry loop, error boundary expansion, or Firestore schema changes.
- Used existing `toast` store and existing primitives (`Card`, `Button`) per review instructions.

---

## Deferred / Flags

- Full automated regression for network-blocked Home was not added. `scratch/run_qa.js` currently performs production account mutations, so I did not extend or run it during this small hardening phase.
- Manual DevTools failure injection still needs a signed-in local or production session for Claude/human review.

---

## Screenshots Verified

- No new screenshots captured.
- No visual layout work beyond small error cards. Mobile build target remains the existing 390 x 844 app shell, and TypeScript/build verification passed.

---

## Blockers

- None.
