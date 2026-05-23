# REVIEW — Claude → Codex

> **Last updated:** 2026-05-23 (after Phase 4 approval)
> **Verdict on Phase 4:** ✅✅ **PASS** — Lighthouse 98/93/100/100, production live
> **Active phase:** **Phase 5 — Firebase Wire-up** (the big one)

---

## Pre-flight — Human action required (Codex: check before starting)

If `.env.local` is missing or has empty values, write `## BLOCKED` in STATUS.md
and stop. Do not attempt Phase 5 without these.

Required in `dietquest/.env.local`:

```
VITE_FB_API_KEY=...
VITE_FB_AUTH_DOMAIN=...firebaseapp.com
VITE_FB_PROJECT_ID=...
VITE_FB_STORAGE_BUCKET=....firebasestorage.app
VITE_FB_MSG_SENDER_ID=...
VITE_FB_APP_ID=...
VITE_FB_VAPID_KEY=...
```

Verify presence with:
```bash
test -f .env.local && grep -c "^VITE_FB" .env.local
# Expected: 7
```

Also required: Firebase project must have these enabled in console:
- Authentication → Google sign-in method enabled
- Cloud Firestore → created, region **`us-west1`** (No cost location)
- Storage → created, region **`us-west1`** (No cost location — same as Firestore)
- Cloud Messaging → Web Push certificate generated (VAPID key)

Human will have done these before starting Phase 5. If not, ask via STATUS.md.

**Region note (2026-05-23):** Spark plan free tier requires US no-cost regions.
Chose `us-west1` (Oregon) for both Firestore and Storage — closest US region
to Thailand (~150-200ms latency). Firestore offline cache mitigates latency.

**Storage scope (2026-05-23):** Initially deferred due to thought Storage
required Blaze, but Firebase now offers free US-region Storage. Storage IS
included in Phase 5 scope. Step 11 (photo upload) remains in this phase.

---

## Phase 5 Brief — Firebase Wire-up

Goal: Replace all mock data with real Firebase reads/writes. App requires Google
sign-in. Data persists across devices and survives offline.

### Implementation order (do EXACTLY in this sequence)

#### Step 1 — Firebase init (30 min)

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const storage = getStorage(app);
```

**Verify:** `import { db } from '@/lib/firebase'` works without runtime error.

#### Step 2 — Security rules (30 min)

Create `firestore.rules` (project root):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Create `storage.rules` (project root):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Create `firebase.json` (project root):
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

Create empty `firestore.indexes.json`:
```json
{ "indexes": [], "fieldOverrides": [] }
```

**Deploy rules:** Need `firebase-tools` CLI. Install with `npm i -D firebase-tools`. Document this in DECISIONS.md.

For deploy, write a `## BLOCKED` if you need human to run `firebase login` once. After that, `npx firebase deploy --only firestore:rules,storage:rules --project <PROJECT_ID>` works.

#### Step 3 — Auth layer (1 day)

`src/lib/auth.ts`:
```typescript
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export const signInGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
export const watchAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);
```

`src/stores/authStore.ts` — Zustand store with current user + loading:
```typescript
// Listens to onAuthStateChanged in module init
// Exposes: { user, loading, signIn, signOut }
```

`src/hooks/useAuth.ts` — convenience hook over store.

#### Step 4 — Auth gate in App.tsx

Wrap routes with auth check:

```typescript
function App() {
  const { user, loading } = useAuth();

  if (loading) return <SplashRoute />;
  if (!user) return <LoginRoute />;  // bypass router entirely

  // existing routes...
}
```

Replace placeholder login (`/login`) implementation:
- Single button "Sign in with Google" → calls `signInGoogle()`
- On success, auth state changes → App re-renders → user sees Home

#### Step 5 — First-time user detection + onboarding hook

After sign-in, check if user doc exists in Firestore:
- If exists → go to `/`
- If missing → go to `/onboarding/welcome`
- Onboarding final step writes user doc

`src/hooks/useUser.ts`:
- Subscribes to `users/{uid}` doc
- Returns `{ user, profile, loading, exists }`

#### Step 6 — Typed Firestore wrappers in `src/lib/db.ts`

Per BUILD_HANDOFF section 4 schema, implement these typed functions:

```typescript
// User
getUser(uid): Promise<User | null>
upsertUser(uid, partial: Partial<User>): Promise<void>

// Day totals (denormalized)
watchDayTotals(uid, date): Unsubscribe + observable
upsertDayTotals(uid, date, totals): Promise<void>

// Meals
addMeal(uid, meal): Promise<string>  // returns id
watchMeals(uid, date): observable
deleteMeal(uid, mealId): Promise<void>

// Weights
addWeight(uid, weight): Promise<void>  // doc ID = YYYY-MM-DD
watchWeights(uid, days: number): observable
deleteWeight(uid, date): Promise<void>

// Water
addWater(uid, ml): Promise<string>
watchWaterToday(uid, date): observable
deleteWater(uid, id): Promise<void>

// Workouts
addWorkout(uid, workout): Promise<string>
watchWorkouts(uid, daysBack): observable

// Sleep
upsertSleep(uid, sleep): Promise<void>  // doc ID = YYYY-MM-DD
watchSleep(uid, date): observable

// Presets
addPreset(uid, preset): Promise<string>
watchPresets(uid): observable
markPresetUsed(uid, presetId): Promise<void>  // bumps last_used_at, use_count
```

**Rules:**
- All functions strongly typed using `src/types/domain.ts`
- Convert Firestore Timestamp <-> Date at the boundary (never leak Timestamp into UI)
- Use `serverTimestamp()` for `logged_at` / `created_at` / `updated_at`
- All writes inside a transaction or batch when they update multiple docs

#### Step 7 — Data hooks (THE BIG ONE, ~1 day)

Create these hooks — each is a thin wrapper over the `db.ts` watchers, adds React lifecycle:

```typescript
src/hooks/
  useUser.ts          // current user + profile
  useToday.ts         // today's day totals doc
  useMeals.ts         // useMeals(date) → meals for that day
  useWeights.ts       // useWeights(daysBack) → recent weights
  useWater.ts         // useWater(date) → water logs for day, with sum
  useWorkouts.ts      // useWorkouts(daysBack) → recent workouts
  useSleep.ts         // useSleep(date) → sleep doc for date
  usePresets.ts       // user's meal presets
```

Each hook:
- Returns `{ data, loading, error }`
- Unsubscribes on unmount
- Uses Firestore SDK directly (NOT through Zustand — listeners are the store)

#### Step 8 — Migrate all routes from mock to hooks

Search all routes for `from '@/lib/mock'` and replace:

| Before | After |
|---|---|
| `import { MOCK_TODAY } from '@/lib/mock'` | `const { data: today } = useToday()` |
| `import { MOCK_MEALS } from '@/lib/mock'` | `const { data: meals } = useMeals(today)` |
| `import { MOCK_WEIGHTS } from '@/lib/mock'` | `const { data: weights } = useWeights(30)` |
| `import { MOCK_USER } from '@/lib/mock'` | `const { user, profile } = useUser()` |
| `import { MOCK_WATER_LOGS } from '@/lib/mock'` | `const { data: water } = useWater(today)` |
| `import { MOCK_WORKOUT } from '@/lib/mock'` | `const { data: workouts } = useWorkouts(30)` |
| `import { MOCK_SLEEP } from '@/lib/mock'` | `const { data: sleep } = useSleep(today)` |
| `import { MOCK_PRESETS } from '@/lib/mock'` | `const { data: presets } = usePresets()` |

**Add loading states:** every screen that fetches must render a skeleton/spinner during loading.

**Add empty states:** every list must handle 0 items gracefully.

After migration, `src/lib/mock.ts` may stay as **dev seed helper** for testing (don't import in production routes).

#### Step 9 — Denormalization (after meal/water/workout write)

After each write that affects the day's totals, also update the day totals doc.

Example: `addMeal(uid, meal)`:
1. Write meal doc
2. In same batch: read `users/{uid}/days/{date}`, increment totals, write back

Use Firestore `runTransaction` to avoid race conditions:

```typescript
import { runTransaction, doc, increment } from 'firebase/firestore';

await runTransaction(db, async (tx) => {
  const dayRef = doc(db, `users/${uid}/days/${date}`);
  const mealRef = doc(collection(db, `users/${uid}/meals`));

  tx.set(mealRef, meal);
  tx.set(dayRef, {
    date,
    totals: {
      kcal: increment(meal.total_kcal),
      protein_g: increment(meal.total_protein_g),
      // ...
    },
    updated_at: serverTimestamp(),
  }, { merge: true });
});
```

#### Step 10 — Onboarding writes user doc

On final onboarding step (Goal screen → "Create plan" button):
1. Compute initial daily_kcal_target from BMR + activity factor (see `src/lib/nutrition.ts` — create if missing)
2. Write `users/{uid}` doc with profile + settings
3. Navigate to `/`

#### Step 11 — Storage for weight photos

Create `src/lib/storage.ts`:
```typescript
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadWeightPhoto(uid: string, date: string, file: File): Promise<string> {
  // Resize/compress to ≤500 KB before upload (use browser canvas)
  const path = `users/${uid}/weights/${date}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return path;
}

export async function getWeightPhotoUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

export async function deleteWeightPhoto(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}
```

Wire to `LogWeight` screen:
- Optional photo upload (camera input on mobile: `<input type="file" accept="image/*" capture="environment">`)
- Show selected photo preview before save
- On save: upload photo first, store path in weight doc's `photo_paths` array
- Limit: 1 photo per weight log for v1.0 (multi-photo in v1.1)
- Client-side compress to ≤500 KB to stay well under Spark Storage limits

### Rules

- **NEVER write Firestore from outside `src/lib/db.ts`** — components only use hooks
- **NEVER assume user is signed in inside a hook** — guard with `if (!uid) return`
- **NEVER store Date in Firestore** — always Timestamp via `serverTimestamp()` or `Timestamp.fromDate()`
- **NEVER skip cleanup** — every `onSnapshot` listener must unsubscribe in useEffect cleanup
- **NEVER use `getDocs` for screens that need realtime** — use `onSnapshot`
- **DO use `getDoc` (one-shot)** for: onboarding check, profile read
- **DO add an error boundary** at App level to catch Firebase errors

### Commit convention for Phase 5

```
chore(firebase): init + env config
feat(rules): firestore + storage security rules
feat(auth): google sign-in + auth gate
feat(auth): first-time user detection + onboarding write
feat(db): typed firestore wrappers
feat(hooks): user/today/meals
feat(hooks): weights/water
feat(hooks): workouts/sleep/presets
refactor(routes): migrate from mock to hooks
feat(db): denormalized day totals via transaction
feat(storage): weight photo upload
chore(deploy): firestore rules deploy
```

### DoD checklist (fill in STATUS.md when done)

- [ ] `.env.local` exists with 7 VITE_FB_* values (human-provided)
- [ ] `src/lib/firebase.ts` initializes app + auth + db + storage
- [ ] Persistent local cache enabled (Firestore offline)
- [ ] `firestore.rules` + `storage.rules` + `firebase.json` + `firestore.indexes.json` in repo
- [ ] Rules deployed to Firebase project
- [ ] Auth gate works: sign out → see login, sign in → see home
- [ ] Google sign-in works in production (test on deployed URL)
- [ ] First-time sign-in routes to onboarding; second time goes to home
- [ ] Onboarding writes user doc; can verify in Firestore console
- [ ] All 7 data hooks created + typed
- [ ] All routes migrated from `MOCK_*` to hooks (grep for remaining imports)
- [ ] Loading + empty states on every screen
- [ ] Logging a meal persists across reload
- [ ] Logging a meal updates day totals (denormalization works)
- [ ] Open app on 2 devices simultaneously → see real-time sync
- [ ] Airplane mode → log meal → re-enable network → meal appears in server
- [ ] Security test: create test user via emulator OR second Google account; confirm they cannot read your data
- [ ] `npm run build` clean
- [ ] Deployed to Vercel; production URL works with real Firebase
- [ ] STATUS.md updated, HISTORY.md appended

### Blockers expected (call out in STATUS.md)

These require human action:
- `.env.local` values (human must provide if missing)
- `firebase login` once (one-time CLI auth)
- `firebase use <PROJECT_ID>` to select project
- Adding REAL Firebase env vars to Vercel (replacing placeholders from Phase 4)
- After Vercel env vars updated: redeploy to pick them up
- Production sign-in test with real Google account

### When Phase 5 done

1. `npm run build` succeeds
2. Production URL works with real Firebase
3. Sign-in / log / persistence all working end-to-end
4. Multi-device sync verified
5. Update STATUS.md + HISTORY.md
6. STOP — wait for review before Phase 6 polish

---

## Why this is the most complex phase

- **Type discipline** — Firebase Timestamp <-> Date is a common bug source
- **Listener leaks** — `onSnapshot` without cleanup = memory leak + ghost writes
- **Race conditions** — concurrent writes need transactions
- **Auth state** — handling loading/signed-in/signed-out states without flicker
- **Security rules** — must test, not just write
- **Migration scope** — every route file touched

Plan for ~3 days. If hit blocker, write to STATUS.md early, don't grind.

Phase 6 (polish) becomes much faster once this is solid.
