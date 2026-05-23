# REVIEW — Claude → Codex

> **Last updated:** 2026-05-23 (after Phase 2 approval)
> **Active phase:** **Phase 3 — All Screens with Mock Data**
> **Verdict on previous phase (Phase 2):** ✅ PASS — design system primitives are solid

---

## Phase 3 Brief

Port all 15 screens from `die-control/` prototype to `dietquest/`, using mock data only. Firebase comes later in Phase 5.

### Order of Work (do in this exact order)

1. **Create `src/lib/mock.ts` FIRST** — all mock data in one file per BUILD_HANDOFF section 5:
   - `MOCK_USER` (single user: male, 31, 169cm, 80kg → 65kg)
   - `MOCK_TODAY` (today's totals)
   - `MOCK_MEALS` (3 meals with realistic items, see diet_plan_claude content)
   - `MOCK_WEIGHTS` (30 data points, gradual 80 → 78.2)
   - `MOCK_PRESETS` (6 meal presets — เช้าปกติ, อกไก่+ข้าว, ปลา+ผัก, สเต๊ก, ก๋วยเตี๋ยวเรือ, Custom)
   - `MOCK_FRUITS` (6 fruits from diet plan with kcal)
2. Login screen (placeholder — single button "Sign in" that sets mock user in store)
3. Splash/loading screen
4. Onboarding 3 screens (Welcome / Profile / Goal)
5. **Home full** (most complex — validate primitives here first)
6. Home empty (day-1 state)
7. Bottom nav wired with React Router
8. Log Meal flow: 3 sub-screens (Presets → Confirm → Saved)
9. Log Sheet (FAB-triggered bottom sheet with 5 quick log options)
10. Log Water, Weight, Sleep
11. Log Workout: 3 sub-screens (Pre → Active → Summary)
12. Progress (4 tabs: Weight / Calorie / Activity / Photos)
13. Plan reference screen
14. Profile / Settings (theme toggle wired to useTheme)
15. Achievement modal

### Routes (use these exact paths)

```
/login
/splash                    (transient)
/onboarding/welcome
/onboarding/profile
/onboarding/goal
/                          (home full)
/?empty=1                  (home empty for testing)
/log/meal                  (presets)
/log/meal/confirm
/log/meal/saved
/log/water
/log/weight
/log/workout               (pre)
/log/workout/active
/log/workout/summary
/log/sleep
/progress?tab=weight       (default tab)
/progress?tab=kcal
/progress?tab=activity
/progress?tab=photos
/plan
/profile
/achievement               (modal route)
/design                    (keep existing dev-only)
```

### Rules

- **All data from `src/lib/mock.ts`** — no hardcoded data inside components
- **All buttons/CTAs functional** — but client-side state only
- **Visual match within 5%** of prototype (compare side-by-side at 390 × 844)
- **Dark mode must work on every screen** (use `useTheme()`)
- **No `any` types** in TS — define proper interfaces in `src/types/domain.ts`
- **Use CSS Modules for new files** (`*.module.css`), not inline styles for anything > 5 props
- **Lazy-load route components** with `React.lazy()` if total bundle > 300 KB

### Commit Convention (per major section, NOT one giant commit)

```
feat(mock): seed data
feat(auth): placeholder login + splash
feat(onboarding): 3-step setup
feat(home): full + empty states
feat(nav): bottom nav + routing
feat(log): meal flow
feat(log): water/weight/sleep
feat(log): workout flow
feat(progress): 4 tabs
feat(plan): reference screen
feat(profile): settings + theme toggle
feat(achievement): milestone modal
```

### DoD per screen

- [ ] Visual matches prototype (eyeball check at 390 × 844 viewport)
- [ ] Dark mode works
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] No browser console warnings or errors
- [ ] Navigation in/out works

### Phase 3 overall DoD

- [ ] All 15 screens reachable via navigation
- [ ] Can click through full user flow without errors
- [ ] `npm run build` succeeds with no warnings
- [ ] All commits follow convention above
- [ ] STATUS.md updated with final report

---

## Things to Watch (potential pitfalls)

1. **Don't keep `dark` prop chain from prototype** — use `useTheme()` hook, no prop drilling
2. **Image-slot was a web component** — make sure ImageSlot.tsx works in all contexts where prototype used `<image-slot>`
3. **Bottom sheet for LogSheet** — needs proper backdrop + dismiss-on-tap-outside
4. **Workout timer** must keep screen awake (`navigator.wakeLock.request('screen')`) — add graceful fallback for browsers without API
5. **Number animations on home Ring** — implement count-up but respect `prefers-reduced-motion`
6. **Photos tab in Progress** — for mock, use placeholder gradients or ImageSlot — no real photos yet (Phase 6)
7. **Thai font loading** — confirm IBM Plex Sans Thai loads (not just Plus Jakarta Sans)

---

## When Phase 3 Done

1. Run `npm run build` — must succeed
2. Update `AGENT_LOG/STATUS.md` with:
   - Phase 3 complete
   - DoD checklist filled
   - Final commit hash range (start...end)
   - Any decisions made → also in `DECISIONS.md`
   - Screenshot list (which screens you verified visually)
   - Any deferred items to flag
3. Append to `AGENT_LOG/HISTORY.md`
4. STOP — do not start Phase 4 (PWA + Deploy) until human approves Phase 3

---

## Open Questions (ask if blocking)

If unclear, prefer simpler choice + document in `DECISIONS.md`. Only ask if truly blocking:
- App icon for splash screen — use simple "DQ" text in gradient circle for now
- Real photo for Progress > Photos tab — use ImageSlot placeholder
- Sound on achievement — defer to Phase 6, skip for now
