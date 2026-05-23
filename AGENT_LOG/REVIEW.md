# REVIEW — Claude → Codex

> **Last updated:** 2026-05-23 (post v1.0.1 — index bug surfaced in production use)
> **Verdict on v1.0.1:** ✅ Functionally PASS, but **error visibility is poor** (1 silent failure already cost real debug time)
> **Active phase:** **Phase 6.2 — Error visibility + silent-failure hardening** (~1-2 hours, small fix)

---

## Context

After v1.0.1 tag and real user testing, a bug surfaced where Home Ring stayed at 0 even after logging meals. Root cause: `firestore.indexes.json` was empty, so the `watchMeals` query (`where date == x + orderBy logged_at`) failed with `FAILED_PRECONDITION: missing composite index`. The listener's error handler silently set `data: []` and the UI rendered the empty state.

**Claude already deployed the missing indexes** (commit `ea1a873`) — meals and water composite indexes are now live. So the immediate bug is gone.

But the broader issue is: **errors throughout the app are swallowed silently**. This will bite again. Phase 6.2 hardens against that.

---

## Phase 6.2 Brief — Surface silent failures

### Scope (3 fixes — all small)

#### Fix 1 — `src/lib/db.ts`: log all listener errors to console

Every `onSnapshot` error handler currently calls `cb({ data: [], error })` but doesn't log. In production with PWA service worker caching, debugging is painful without breadcrumbs.

Update every error handler in `db.ts`:

```typescript
// Before
(error) => cb({ data: [], error }),

// After
(error) => {
  console.error(`[Firestore] ${collectionName} listener failed:`, error)
  cb({ data: [], error })
},
```

Apply to: `watchMeals`, `watchWeights`, `watchWater`, `watchWorkouts`, `watchSleep`, `watchPresets`, `watchUser`, `watchDayTotals` — basically every onSnapshot call. Use a meaningful label in the log (collection name + uid + date if relevant).

Bonus: add a top-level helper to avoid copy-paste:

```typescript
function logFirestoreError(label: string) {
  return (error: Error) => {
    console.error(`[Firestore] ${label} listener failed:`, error)
    return error
  }
}
```

#### Fix 2 — Distinguish "empty" from "error" in Home

File: `src/routes/home.tsx` line 26

Currently:
```typescript
const empty = params.get('empty') === '1' || (!mealsLoading && meals.length === 0)
```

Problem: if `useMeals()` errors, it returns `meals: []` → empty becomes true → renders "Day 1 - let us go" → user can't tell something's wrong.

Update Home to handle 3 states explicitly:

```typescript
const { data: meals, loading: mealsLoading, error: mealsError } = useMeals()
const { data: today, loading: todayLoading, error: todayError } = useToday()
const hasError = mealsError || todayError
const empty = params.get('empty') === '1' || (!mealsLoading && meals.length === 0 && !hasError)
```

Then render:
- If `hasError` → show an error card (NOT empty state) with retry button:
  ```tsx
  <Card padding={18}>
    <strong>Couldn't load today</strong>
    <p className={styles.subtitle}>{mealsError?.message ?? todayError?.message}</p>
    <Button onClick={() => window.location.reload()}>Retry</Button>
  </Card>
  ```
- Else if `empty` → existing HomeEmptyContent
- Else → existing HomeFullContent

#### Fix 3 — Audit other screens that destructure data without error

Grep for `const { data` in `src/routes/` — for each screen that uses a data hook:
- If screen has a meaningful empty state, also handle error case
- At minimum: toast.error if error fires (use existing `toast` from `src/stores/toastStore.ts`)

Pattern to add per screen using a data hook:

```typescript
const { data, loading, error } = useSomething()

useEffect(() => {
  if (error) {
    toast.error(`Couldn't load ${label}. Try again.`)
  }
}, [error])
```

Files to audit:
- `home.tsx` (covered in Fix 2)
- `progress.tsx` (WeightTab, CaloriesTab, ActivityTab)
- `log-meal.tsx` (usePresets)
- `log-water.tsx` (useWater)
- `log-weight.tsx` (useWeights)
- `log-sleep.tsx` (useSleep)
- `log-workout.tsx` (useWorkouts)
- `plan.tsx` (useUser)
- `profile.tsx` (useUser, useWeights)

Pick the right severity per screen:
- Critical data screens (Home, Log Water, Log Weight) → show error card + toast
- Secondary (Progress, Plan, Profile) → toast only

---

## Why not bigger scope

Phase 6.2 is intentionally tiny. Bigger error-handling improvements (retry logic, error boundaries per route, structured logging service) → defer to v1.1.

This phase just makes the next silent failure DISCOVERABLE in ≤30 seconds via console + visible UI hint.

---

## DoD Phase 6.2

- [ ] Every onSnapshot error handler in `db.ts` logs with `console.error(label, error)`
- [ ] Home shows distinct error UI when meals or today fails (with reload button)
- [ ] Each log/progress screen at minimum fires a `toast.error` on error
- [ ] Manual test: disable network in DevTools → reload → see error UI on Home (not empty state)
- [ ] Manual test: keep network on, intentionally break a query (e.g., temporarily rename a field in `db.ts`), see console error AND user-visible feedback
- [ ] `npm run build` clean
- [ ] No new TypeScript errors
- [ ] Bundle size delta < +2 KB
- [ ] STATUS.md updated, HISTORY.md appended
- [ ] Pushed to main

---

## Verification (Antigravity Playwright suite reuse)

Reuse `scratch/run_qa.js` — add 1 new test:
- Block Firestore network requests via route interception
- Reload Home
- Assert: error UI visible (text "Couldn't load") instead of "Day 1 - let us go"

Optional. If too much effort, skip and rely on manual test.

---

## After Phase 6.2

- Claude reviews
- If PASS → tag `v1.0.2`
- Push tag

```bash
git tag -a v1.0.2 -m "v1.0.2 — Error visibility (no more silent failures)"
git push origin v1.0.2
```

---

## Commit convention

```
fix(db): log all listener errors to console with context label
fix(home): distinguish error state from empty state
fix(routes): surface query errors via toast on log + progress screens
test(qa): add error-state regression test (if extending Playwright)
docs: STATUS + HISTORY for Phase 6.2
chore(release): tag v1.0.2
```

---

## Rules

- DO NOT change Firestore data shape or schema
- DO NOT add retry logic (defer to v1.1)
- DO NOT touch existing Phase 6.1 working features
- DO add `console.error` calls (these are dev/debug aids, fine in production)
- DO use existing `toast` store, don't create new error UI primitive

---

## Background — why this matters (for context, not action)

Senior engineering principle: **silent failure is worse than loud failure**. The Phase 5 → Phase 6.1 work created a robust data layer, but the listener error handlers were written defensively to "not crash UI" — which is good, but they did so by **completely hiding errors**. Result: when Firestore index was missing, the app ran perfectly and showed empty state, with no signal that anything was wrong.

Phase 6.2 adds the missing signal. After this, similar bugs will surface in <1 min instead of requiring forensics.
