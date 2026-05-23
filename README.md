# DietQuest

Mobile-first PWA for tracking meals, water, weight, workouts, sleep, and progress toward a 80 kg to 65 kg diet goal.

## Stack

- Vite + React 18 + TypeScript
- React Router v6
- Zustand
- Plain CSS, CSS Modules, and `tokens.css`
- vite-plugin-pwa + Workbox
- Firebase planned for Phase 5
- Vercel hosting

## Local Development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

`npm run preview` serves the production build locally for PWA/offline testing.

## Environment Variables

Firebase is not wired in Phase 4. The canonical env list lives in [.env.example](./.env.example). Phase 5 will use:

- `VITE_FB_API_KEY`
- `VITE_FB_AUTH_DOMAIN`
- `VITE_FB_PROJECT_ID`
- `VITE_FB_STORAGE_BUCKET`
- `VITE_FB_MSG_SENDER_ID`
- `VITE_FB_APP_ID`
- `VITE_FB_VAPID_KEY`

Do not commit `.env.local`.

## Deploy

The app is intended to deploy on [Vercel](https://vercel.com) from the GitHub `main` branch.

Default settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Phase Status

Current phase: Phase 4 - PWA + Vercel Deploy.

Completed:

- Phase 1: Vite scaffold
- Phase 2: primitives + tokens
- Phase 3: all mock-data screens

Pending:

- Vercel import by human
- Production Lighthouse audit
- iPhone Add to Home Screen check
