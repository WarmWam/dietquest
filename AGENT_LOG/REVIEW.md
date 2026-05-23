# REVIEW — Claude → Antigravity

> **Last updated:** 2026-05-23 (after Phase 5.1 PASS)
> **Verdict on Phase 5.1:** ✅✅ **PASS** — 28/28 QA, best phase work yet
> **Active phase:** **Phase 6 — Polish + v1.0 Release** (the finale)

---

## Notes from Phase 5.1 (read once)

- Phase 5 core + Phase 5.1 fixes = backend + interactivity fully solid
- Outstanding QA discipline by Antigravity — keep this standard for Phase 6
- `scratch/` properly gitignored; do not commit cookies/session data anywhere
- Playwright suite at `scratch/run_qa.js` can be reused for Phase 6 regression
- Code style notes for consistency:
  - Conventional commits, per logical unit (~3-8 commits per phase)
  - Inline styles OK for ≤5 props, CSS Modules for layout
  - No `any` types
  - Use barrel exports
  - Use `useTheme()` not prop drilling

---

## Phase 6 Brief — Polish + v1.0 Release

Goal: Transform working app → polished v1.0 ready for daily use.

### Task list (suggested order; agent may reorder if defensible)

#### 6.1 — Loading skeletons (~3 hours)

Replace generic "Loading..." text with proper skeleton UIs that match final layout shape.

Screens needing skeletons:
- Home (calorie ring + meal cards + habit list)
- Progress (chart placeholder + summary cards)
- Log Meal (preset list)
- Plan
- Profile

Create `src/components/primitives/Skeleton.tsx`:
```typescript
interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number
  variant?: 'rect' | 'circle' | 'text'
}
```

Use CSS animation `pulse` already in design system (check tokens.css) or create one. Respect `prefers-reduced-motion`.

#### 6.2 — Toast notifications (~2 hours)

Add toast system for user feedback on actions.

Create `src/components/primitives/Toast.tsx` + `src/stores/toastStore.ts`:
- Position: top-center, slide-in
- Variants: success (green), error (red), info (neutral)
- Auto-dismiss after 3 seconds, swipe up to dismiss
- Stack up to 3 toasts

Wire to actions:
- Meal logged → "Saved · 350 kcal"
- Weight logged → "Logged 78.2 kg (-0.3)"
- Water added → "+ 250 ml (1.5L / 3L today)"
- Workout saved → "45 min · 320 kcal burned"
- Sleep saved → "7h 30m logged"
- Error states → "Couldn't save. Tap to retry."

Show toast from db.ts wrapper success/failure callbacks OR from each route's save handler.

#### 6.3 — Pull-to-refresh on Home (~1 hour)

Implement custom pull-to-refresh on Home screen:
- Pull down past threshold → release → animation runs while refetching
- Use existing `useToday()` and call `.refetch()` (if hook supports) OR force re-mount via key
- Custom indicator: small calorie ring spinning OR brand-style loader

Library option: `react-pull-to-refresh` (small, lightweight) — or hand-roll with touch events.

#### 6.4 — Haptic feedback (~1 hour)

Add subtle vibration on key actions (Web Vibration API):
- Meal save: `navigator.vibrate(10)`
- Water +250 button: `navigator.vibrate(5)`
- Milestone reached: `navigator.vibrate([15, 30, 15])`
- Error: `navigator.vibrate([20, 40, 20])`

Create helper `src/lib/haptic.ts`:
```typescript
export function haptic(pattern: number | number[]): void {
  if ('vibrate' in navigator && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}
```

Guard for browsers that don't support (Safari iOS desktop). Add user setting to disable.

#### 6.5 — Profile screen — make settings editable (~3 hours)

Currently Profile is static (per Codex's earlier work). Add:

- **Edit profile** — open modal/sheet with same Stepper inputs as onboarding
  - Sex, age, height, current weight, target weight, target months
  - Reuse `useOnboardingDraft` pattern with new `useProfileEditDraft` OR
  - Pre-fill with current profile, on save → `upsertUser(uid, { profile })`
- **Theme toggle** — wire to `useTheme()` (light / dark / auto)
- **Notification preferences** — UI only for v1 (functional in v1.1 when FCM added)
- **Sign out** — calls `logout()` then redirects to /login
- **Account info** — display email + uid (read-only)

#### 6.6 — Data export (~2 hours)

Add "Export my data" button in Profile → Settings.

Implementation:
- Query all collections for current user
- Bundle into single JSON: `{ profile, meals, weights, water, workouts, sleeps, presets }`
- Trigger browser download via Blob URL
- Filename: `dietquest-export-{YYYYMMDD}.json`

Why: GDPR-style right to export + manual backup option + portability.

#### 6.7 — Visual + UX details (~2 hours)

- Empty states with friendly copy on every list
- 404 / unknown route → friendly "Not found" + button back to home
- Confirm before destructive actions (delete meal, sign out)
- Loading states for sign-in button (spinner while OAuth popup)
- Disable submit buttons during pending writes (already partial — audit)

#### 6.8 — Maintenance (~2 hours)

- Run `npm audit` → review the 16 vulnerabilities Codex flagged (15 moderate, 1 high)
- For each: assess if it's transitive in dev dep (firebase-tools) or affects production
- Update what's safe; document any that can't be updated in DECISIONS.md
- Run `npm outdated` → consider patch/minor bumps that look safe
- Re-test build after updates

#### 6.9 — Refactor consideration (~1-2 hours, OPTIONAL)

Phase 3 flagged `src/routes/log-health.tsx` as a 226-line file containing 6 route components (water/weight/sleep + 3 workout). If you have budget after must-haves:
- Split into `log-water.tsx`, `log-weight.tsx`, `log-sleep.tsx`, `log-workout.tsx`
- Keep imports working in `App.tsx`
- Skip if time is short — current setup works

#### 6.10 — Final Lighthouse audit (~30 min)

Run Lighthouse against production after all changes:
- Target: maintain Phase 4 scores or improve
- Performance ≥ 90 (currently 98)
- Accessibility ≥ 93
- Best Practices = 100
- PWA = 100
- If any drops below threshold → fix top 2-3 issues

Save report to `AGENT_LOG/lighthouse-phase6.report.html` + screenshot.

#### 6.11 — README polish (~30 min)

Update README.md to reflect final v1.0:
- Add screenshots (use existing AGENT_LOG QA shots)
- Update "Phase status" section → "v1.0.0 released"
- Add "Local development" with full setup steps
- Add "Deploy your own" section (fork → Vercel)
- Add "License" if applicable (or `Private — personal project`)
- Link to live demo

#### 6.12 — Git tag v1.0.0 (~5 min)

After all above done + Claude approval:
```bash
git tag -a v1.0.0 -m "v1.0.0 — DietQuest first release"
git push origin v1.0.0
```

Vercel will create a permalink to v1.0.0 deployment.

---

## Rules for Phase 6

- DO NOT add Storage / photo upload (still out of v1 scope)
- DO NOT touch Firebase config (`firebase.ts`) — backend is stable
- DO NOT change Firestore schema (only ADD fields if needed, never rename/remove)
- Reuse Playwright QA script from `scratch/` for any retest needed
- Keep bundle under 350 KB JS gzipped (currently 71 KB — plenty of room)
- Match existing code style (named exports, tokens.css colors, etc.)

---

## Commit convention for Phase 6

```
feat(ui): skeleton loading components
feat(ui): toast notification system
feat(home): pull-to-refresh
feat(ux): haptic feedback on actions
feat(profile): editable settings and goals
feat(profile): theme selector
feat(profile): data export to JSON
feat(ux): empty states + 404 + confirm dialogs
chore(deps): npm audit cleanup
refactor(routes): split log-health into per-feature files  (if done)
chore(perf): lighthouse fixes if needed
docs: README polish for v1.0
chore(release): tag v1.0.0
```

---

## DoD Phase 6 (fill in STATUS.md when done)

### Must-have
- [ ] Skeletons on Home, Progress, Log Meal, Plan, Profile
- [ ] Toast system + wired to all save actions
- [ ] Pull-to-refresh on Home
- [ ] Haptic feedback on saves (with fallback for unsupported browsers)
- [ ] Profile editable (sex/age/height/weight/target/timeline) saves to Firestore
- [ ] Theme toggle in Profile (light/dark/auto)
- [ ] Sign out button works
- [ ] Data export downloads JSON of all user data
- [ ] Empty states + 404 page + confirmations on destructive actions
- [ ] `npm audit` reviewed (fixed or documented)
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 93, Best Practices ≥ 95, PWA = 100
- [ ] README polished for v1.0
- [ ] Git tag `v1.0.0` pushed
- [ ] Vercel production has the tagged version

### Nice-to-have (skip if time short)
- [ ] log-health.tsx split into per-feature files
- [ ] Playwright regression run against Phase 6 changes

### Sign-off
- [ ] STATUS.md updated with Phase 6 final report
- [ ] HISTORY.md appended with PASS + commit range
- [ ] All changes pushed to GitHub
- [ ] STOP and wait for Claude final review + v1.0 sign-off

---

## After v1.0 (out of scope, future versions)

These are deliberately deferred — do NOT do in Phase 6:
- Push notifications (FCM scheduling) — v1.1
- Photo upload + Progress photos tab — v1.1
- Weekly backup to Google Drive — v1.1
- Apple sign-in — v1.2
- Multi-user (couple mode) — v2.0
- Apple Health integration — v2.1

---

## How to QA Phase 6 (recommendation for agent)

After implementing, reuse + extend the Playwright script:
- Existing tests still pass
- New: toast appears on meal save
- New: pull-to-refresh triggers refetch
- New: profile edits persist
- New: data export downloads valid JSON
- New: Lighthouse via `lighthouse` CLI against production URL

Save extended QA report to `AGENT_LOG/phase6-qa-report.md`.

---

*Phase 6 estimated effort: 16-20 hours total. Could be split across 2-3 work sessions.*
