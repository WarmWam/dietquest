# HISTORY — Append-only phase log

Format per entry:
```
## [Phase N] — [Title]
- Date: YYYY-MM-DD
- Verdict: PASS / FAIL / REVISE
- Commit: <hash>
- Notes: brief
```

---

## Phase 1 — Initial scaffold
- Date: 2026-05-23
- Verdict: PASS (Claude review)
- Commit: cf52c86
- Notes: Vite 5 + React 18 + TS. Stack normalized from default Vite 8/React 19 → documented in DECISIONS.md.

## Phase 2 — Primitives + Tokens
- Date: 2026-05-23
- Verdict: PASS (Claude review)
- Commit: 17c08a7
- Notes: 7 primitives + useTheme (uses useSyncExternalStore — modern pattern). /design route working. Dark mode verified.

## Phase 3 — All Screens (Mock Data)
- Date: (in progress)
- Verdict: pending
- Commit: pending
- Notes: 15 screens to port. AGENT_LOG file-based workflow introduced this phase.

## Phase 3 — All Screens with Mock Data
- Date: 2026-05-23
- Verdict: PASS (Claude review)
- Commit: 958a231...c8ad0d9
- Notes: All 15 screens, 24 routes wired. Build 227 KB JS / 71 KB gzip (under 300 KB budget). No `any` types. Clean conventional commits. Flagged for Phase 5: missing data hooks (components import MOCK_* directly — will need useToday/useMeals/useWeights etc.). `log-health.tsx` consolidates 6 routes (acceptable). Component subfolders still empty (no extraction needed yet).

## Phase 4 — PWA + Vercel Deploy
- Date: (pending)
- Verdict: pending
- Commit: pending
- Notes: vite-plugin-pwa config, icons, Apple meta, Vercel deploy, Lighthouse audit. Requires human for GitHub remote + Vercel import.

## Phase 4 - PWA + Vercel Deploy
- Date: 2026-05-23
- Verdict: PASS (Claude review)
- Commit: 00241aa...d707731
- Notes: Production URL https://dietquest-sigma.vercel.app/ live on Vercel (sin1 edge, ~190ms). Lighthouse: Performance 98 / Accessibility 93 / Best Practices 100 / PWA 100 — production-grade. iPhone install confirmed by human. Deployed route sweep clean. Vercel env var placeholders set (Production only — will need Preview/Development before promoting Firebase if used).

## Phase 5 — Firebase Wire-up
- Date: 2026-05-23
- Verdict: REVISE (Claude review after human QA)
- Commit: 28eeb29...dbaf106 (15 commits)
- Notes: Firebase backend solid (auth gate, rules, hooks, transactions, error boundary, bundle split). Sign-in works after adding dietquest-sigma.vercel.app to Firebase Authorized domains. However, onboarding form inputs (sex/age/height/weight/target/timeline) and Log Meal meal-type selector are non-functional UI placeholders that always write defaults. Goes to Phase 5.1 fix sub-phase before Phase 6.

## Phase 5.1 — Form interactivity fixes
- Date: 2026-05-23
- Verdict: PASS
- Commit: 10a8aa5...0f9f494 (5 commits)
- Notes: Wired onboarding profile and goal form inputs to Zustand store (useOnboardingDraft) with formula-based target calculations. Wired meal-type segmented selector, starter preset card, dynamic eyebrow headers, and saved screens to Zustand store (useMealDraft). Checked todayKey to use local timezone. Audited and wired sleep time pickers and star rating selectors. Clean production build compiles without errors.

## Phase 6 — Polish + v1.0 Release
- Date: 2026-05-23
- Verdict: REVISE (Claude post-release audit found legacy UI gaps)
- Commit: 66ed22e...9a784ca (12 commits) + tag v1.0.0
- Notes: All 12 Phase 6 features delivered cleanly (skeleton, toast portal, PTR, haptic, editable profile, JSON export, 404, npm audit, Lighthouse maintained, Google Fonts perf, log-health split). Tag v1.0.0 pushed. POST-RELEASE AUDIT: Claude verified every interactive element across 15 routes and found 18 leftover issues from Phase 3 visual placeholders: 1 CRITICAL (workout flow is entirely fake — timer hardcoded, metrics hardcoded, pause/bolt buttons no onClick, saveWorkout writes same values every time), 8 HIGH (fake buttons with no handlers across log-meal/plan/home/profile), 6 MEDIUM (hardcoded display data), 3 LOW. v1.0.0 tag stays in history as "needed fixes"; Phase 6.1 will land CRITICAL+HIGH and tag v1.0.1.

## Phase 6.1 — Critical UI fixes
- Date: (pending)
- Verdict: pending
- Commit: pending
- Notes: Real workout flow (Stepper-controlled pre-workout / live timer with pause-resume / MET kcal / save real values). Remove or wire 8 fake buttons. Extend Playwright QA with workout-specific tests. Tag v1.0.1.
