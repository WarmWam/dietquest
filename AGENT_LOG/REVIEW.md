# REVIEW — Claude → Codex

> **Last updated:** 2026-05-23 (after Phase 3 approval)
> **Verdict on Phase 3:** ✅ **PASS** — solid work, build clean, bundle 227 KB
> **Active phase:** **Phase 4 — PWA + Vercel Deploy**

---

## Notes from Phase 3 review (read once)

These are observations to keep in mind through remaining phases:

1. **Missing data hooks** — components import `MOCK_*` directly. Phase 5 must create `useToday`, `useMeals`, `useWeights`, `useWater`, `useWorkouts`, `useSleep`, `useUser` hooks AND search/replace all `MOCK_*` imports across all route files. Plan ~1 day for this conversion alone.
2. **`log-health.tsx` consolidation** — six routes (water/weight/sleep + 3 workout) live in one file. Leave as-is for Phase 4. If Phase 6 refactor budget allows, split into separate files for maintainability.
3. **Component subfolders empty** — all UI in route files. OK for now. If a UI fragment is repeated 3+ times in different routes during Phase 5-6, extract to `src/components/<feature>/`.
4. **Inline styles** — acceptable per BUILD_HANDOFF for ≤5 props. If a route file accumulates many large inline style blocks, extract to its own `*.module.css` during Phase 6.
5. **Working tree** — STATUS.md and HISTORY.md from Phase 3 are now committed (chore: phase 3 closeout).

---

## Phase 4 Brief — PWA + Vercel Deploy

Goal: App is installable as PWA on iPhone via Vercel-hosted URL.

### Pre-flight (human responsibility — confirm before starting)

Codex: before writing any code for Phase 4, check that these are TRUE. If not, ask human via `## BLOCKED` in STATUS.md.

- [ ] GitHub repo created (name: `dietquest`, private)
- [ ] Vercel account exists (signed in via GitHub)
- [ ] Human will provide GitHub remote URL when ready to push

### Tasks

1. **Configure PWA in `vite.config.ts`** — use `vite-plugin-pwa` (already installed):
   - `registerType: 'autoUpdate'`
   - Manifest:
     - `name: 'DietQuest'`
     - `short_name: 'DietQuest'`
     - `theme_color: '#5B6CFF'` (Aurora primary)
     - `background_color: '#F2F4F8'` (light bg) — or `#0F1419` (dark) — choose `#F2F4F8`
     - `display: 'standalone'`
     - `orientation: 'portrait'`
     - `start_url: '/'`
     - Icons: 192, 512, maskable (see icon task below)
   - Workbox: cache Google Fonts as `StaleWhileRevalidate`

2. **Create app icons** — `public/icons/`:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
   - `icon-maskable.png` (512x512, with 80px safe area padding)
   - Design: Simple "DQ" text in white, on Aurora gradient (`#5B6CFF → #B17AFF → #FF6B9D` 135°)
   - If you can't generate PNG programmatically, create SVG and convert via `sharp` (already a vite-plugin-pwa transitive dep) OR document in DECISIONS.md and request human upload

3. **Splash screen for iOS** — add `apple-touch-icon` link in `index.html` + Apple-specific meta tags:
   ```html
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="default" />
   <meta name="apple-mobile-web-app-title" content="DietQuest" />
   <link rel="apple-touch-icon" href="/icons/icon-192.png" />
   ```

4. **Offline strategy** — verify:
   - Build → preview → DevTools offline mode → already-visited routes still render
   - First-load offline = OK to show "no connection" page

5. **README.md** — write project README with:
   - Project name + one-line description
   - Tech stack list
   - Local dev: `npm install`, `npm run dev`
   - Build: `npm run build`, `npm run preview`
   - Env vars (link to .env.example)
   - Deploy: link to Vercel
   - Phase status (in progress, current = Phase 4)

6. **Deploy to Vercel** (after human provides GitHub remote):
   - Push to `main` branch
   - Wait for human to import repo into Vercel dashboard
   - Confirm build succeeds on Vercel
   - Get production URL
   - **Add Firebase env vars in Vercel dashboard as PLACEHOLDERS** (empty values) — agent cannot do this, ask human via STATUS.md
   - **DO NOT attempt to use Firebase config** — Phase 4 has no real Firebase code. Just placeholder env vars in Vercel.

7. **Test on real device**:
   - Human opens production URL in iPhone Safari
   - Confirm: Share → Add to Home Screen works
   - Confirm: Icon shows up, app opens fullscreen
   - Human will report visual check via your STATUS.md prompt

### Rules

- **DO NOT integrate Firebase in this phase** — Phase 4 is purely PWA + hosting infrastructure
- **DO NOT write any Firebase imports** — `src/lib/firebase.ts` does not exist yet (Phase 5)
- Keep all routes still using mock data
- Commit convention same as Phase 3 (conventional commits, per logical unit)

### DoD checklist (fill in STATUS.md when done)

- [ ] `vite-plugin-pwa` configured in `vite.config.ts`
- [ ] Manifest renders correct values (verify via `npm run preview` → DevTools → Application → Manifest)
- [ ] Icons present in `public/icons/` (192 + 512 + maskable)
- [ ] Apple meta tags in `index.html`
- [ ] Offline test: visited route works without network
- [ ] README.md complete
- [ ] Pushed to GitHub (commit hash range documented)
- [ ] Vercel deployment URL documented in STATUS.md
- [ ] Lighthouse PWA score ≥ 90 (run on production URL, paste score)
- [ ] Lighthouse Performance score reported (target ≥ 80)
- [ ] All previous routes still work on deployed version

### Commit convention for Phase 4

```
feat(pwa): configure vite-plugin-pwa manifest
feat(pwa): add app icons (192/512/maskable)
feat(pwa): apple-touch-icon and ios meta tags
docs: add README
chore(deploy): vercel config + first deploy
```

### Blockers expected (call out in STATUS.md)

These require human action — pause and ask via STATUS.md `## BLOCKED` section:
- GitHub remote URL needed for `git remote add origin`
- Vercel project import needs human at dashboard
- Adding env var placeholders in Vercel dashboard
- iPhone visual check needs human with device

### When Phase 4 done

1. `npm run build` succeeds
2. Production URL works
3. Lighthouse audited
4. Update STATUS.md with full report
5. Append HISTORY.md entry
6. STOP and wait

---

## Reminder: Phase 5 will require

Codex, when you reach Phase 5, the human will provide:
- `VITE_FB_API_KEY`
- `VITE_FB_AUTH_DOMAIN`
- `VITE_FB_PROJECT_ID`
- `VITE_FB_STORAGE_BUCKET`
- `VITE_FB_MSG_SENDER_ID`
- `VITE_FB_APP_ID`
- `VITE_FB_VAPID_KEY`

You will paste them into `.env.local` (gitignored). Then implement Firebase per BUILD_HANDOFF Phase 5 task list. Also create the data hooks mentioned in "Notes from Phase 3" above.
