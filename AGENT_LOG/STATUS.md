# STATUS - Codex -> Claude

> **Phase:** Phase 5 - Firebase Wire-up (REVISE → 5.1 active)
> **Status date:** 2026-05-23
> **Current state:** Phase 5 REVISE — see AGENT_LOG/REVIEW.md for Phase 5.1 fix list. Next agent must address Fix 1-6 before Phase 6.

---

## Completed

Phase 5 was resumed after Firebase CLI login and continued in the required sequence.

- Step 2 - Firestore rules deploy
  - `npx firebase deploy --only firestore:rules --project dietquest-prod` succeeded.
  - Unauthenticated REST read to `/users/test-user` returns HTTP 403.
- Step 3 - Auth layer
  - Added `src/lib/auth.ts`.
  - Replaced mock persisted auth store with Firebase Auth state, loading, sign-in, sign-out, and error handling.
  - Added `src/hooks/useAuth.ts`.
- Step 4 - Auth gate
  - App now requires Firebase auth before app routes.
  - Signed-out state renders the Google login screen.
  - Loading state renders Splash inside Router context.
- Step 5 - First-time user detection
  - Added `useUser()` subscription to `users/{uid}`.
  - Signed-in users without a user document are routed to onboarding.
  - Existing users are routed away from onboarding to Home.
- Step 6 - Typed Firestore wrappers
  - Added `src/lib/db.ts` with typed readers, watchers, writes, transactions, and Timestamp conversion.
  - Added `src/lib/dates.ts`.
- Step 7 - Data hooks
  - Added `useToday`, `useMeals`, `useWeights`, `useWater`, `useWorkouts`, `useSleep`, `usePresets`.
  - Hooks guard missing auth and clean up `onSnapshot` listeners.
- Step 8 - Route migration
  - Routes no longer import from `@/lib/mock`.
  - Loading/empty states added for migrated screens.
  - Progress Photos tab removed per Storage/photo scope removal.
- Step 9 - Denormalized day totals
  - Meal, water, workout, and sleep writes update relevant day documents through transactions.
  - Day totals hydrate partial Firestore docs into a complete UI shape.
- Step 10 - Onboarding writes user doc
  - Added `src/lib/nutrition.ts`.
  - Final onboarding step writes `users/{uid}` with profile/settings and computed kcal/protein targets.
- Error boundary added at app level.
- Firebase bundle split into its own chunk.
- Pushed to GitHub `main`; Vercel production picked up the new build.

## Commit Hash Range

`28eeb29...dbaf106`

Commits:

- `28eeb29 chore(firebase): init + env config`
- `3fe3029 feat(rules): firestore security rules`
- `415f91c chore(deploy): firestore rules deploy`
- `f88e558 feat(auth): google sign-in + auth gate`
- `104a114 feat(auth): first-time user detection`
- `f1a8fc5 feat(db): typed firestore wrappers`
- `e8d3c4e feat(hooks): user/today/meals`
- `993c2d1 feat(hooks): weights/water`
- `cdee0d5 feat(hooks): workouts/sleep/presets`
- `35c59a2 refactor(routes): migrate from mock to hooks`
- `01a237d feat(db): denormalized day totals via transaction`
- `eaf181a feat(auth): onboarding write`
- `ea2ca96 feat(auth): app error boundary`
- `0067a53 chore(build): split firebase bundle`
- `dbaf106 fix(auth): keep loading route inside router`

## Verification

- `.env.local` exists with 7 `VITE_FB_*` values and is gitignored.
- `npm run build` succeeds.
- Production URL deployed: `https://dietquest-sigma.vercel.app/`.
- Fresh Chrome profile against production renders Google sign-in screen.
- Local production preview rendered Google sign-in screen with 0 captured console warnings/errors.
- `rg "from '@/lib/mock'|MOCK_" src/routes src/stores src/hooks` returns no matches.
- `rg "firebase/storage|storage.rules|photo_paths|Photos" src firebase.json firestore.rules package.json` returns no matches.
- Firestore rules deployed successfully.
- Unauthenticated Firestore REST read returns HTTP 403 Forbidden.

## DoD Checklist

- [x] `.env.local` exists with 7 VITE_FB_* values (human-provided)
- [x] `src/lib/firebase.ts` initializes app + auth + db
- [x] Persistent local cache enabled (Firestore offline)
- [x] `firestore.rules` + `firebase.json` + `firestore.indexes.json` in repo
- [x] Rules deployed to Firebase project
- [x] Auth gate works in signed-out preview: signed out -> see login
- [ ] Auth gate works after sign-in: sign in -> see onboarding or home
- [ ] Google sign-in works in production
- [ ] First-time sign-in routes to onboarding; second time goes to home
- [ ] Onboarding writes user doc; can verify in Firestore console
- [x] All data hooks created + typed
- [x] All routes migrated from `MOCK_*` to hooks
- [x] Loading + empty states on migrated screens
- [ ] Logging a meal persists across reload
- [ ] Logging a meal updates day totals
- [ ] Open app on 2 devices simultaneously -> see real-time sync
- [ ] Airplane mode -> log meal -> re-enable network -> meal appears in server
- [ ] Security test with second Google account
- [x] `npm run build` clean
- [x] Deployed to Vercel; production URL serves Phase 5 build

## BLOCKED

Human account/device QA is required to finish Phase 5 DoD. Please test on production:

1. Open `https://dietquest-sigma.vercel.app/` in a fresh/private browser or clear the old PWA cache.
2. Sign in with Google.
3. If first-time user: complete onboarding and verify `users/{uid}` appears in Firestore.
4. Sign out and sign back in; confirm second sign-in routes to Home.
5. Log a meal; reload; confirm the meal persists and Home totals update.
6. Open the app on a second device/browser with the same account; confirm the meal appears.
7. Airplane/offline test: log a meal offline, reconnect, confirm it syncs to Firestore.
8. Optional security test: use a second Google account and confirm it cannot see the first user's data.

After this QA, tell Codex the results. If all pass, Codex should update STATUS/HISTORY for Phase 5 completion and STOP for Claude review. If anything fails, Codex should fix the listed failure before closing Phase 5.

## Deferred / Flags

- Storage/photo upload was intentionally removed from v1 scope. No Storage imports, `storage.rules`, or photo UI were added.
- `firebase-tools` install reported transitive audit warnings: 16 vulnerabilities (15 moderate, 1 high). No `npm audit fix` was run to avoid unrelated dependency churn.
