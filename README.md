# DietQuest v1.0.0 🍽️✨

A highly polished, mobile-first Progressive Web Application (PWA) designed to track meals, water, weight, workouts, sleep, and habits to achieve target diet goals (80 kg to 65 kg). Fully integrated with Firebase Firestore and real-time synchronizations.

Live Demo: [https://dietquest-sigma.vercel.app/](https://dietquest-sigma.vercel.app/)

---

## Technical Stack

*   **Core:** React 18 + TypeScript + Vite 5
*   **Routing:** React Router v6
*   **State Management:** Zustand (custom modularized draft stores)
*   **Styling:** Pure CSS & CSS Modules leveraging unified neumorphic `tokens.css` design system (support for Light / Dark / Auto themes and accent palettes)
*   **PWA Integrations:** `vite-plugin-pwa` + Workbox service workers with offline-precached resources
*   **Backend Databases:** Firebase Authentication (Google Sign-In) + Firestore Real-time Collections + Transactional aggregates
*   **Testing & Quality:** Playwright E2E Automated QA Suite + Chrome headless Lighthouse audits
*   **Hosting:** Deployed via GitHub CD to Vercel global edge network

---

## Local Development

### 1. Installation
Clone the repository and install the development dependencies:
```bash
npm install
```

### 2. Configure Environment variables
Create a `.env.local` file at the root of the project matching the shape of [.env.example](./.env.example):
```bash
VITE_FB_API_KEY=your-api-key
VITE_FB_AUTH_DOMAIN=your-auth-domain
VITE_FB_PROJECT_ID=your-project-id
VITE_FB_STORAGE_BUCKET=your-storage-bucket
VITE_FB_MSG_SENDER_ID=your-sender-id
VITE_FB_APP_ID=your-app-id
VITE_FB_VAPID_KEY=your-vapid-key
```

### 3. Start Development Server
```bash
npm run dev
```
The dev server launches at `http://localhost:5173`.

### 4. Build and Preview PWA locally
Generate production bundles and preview offline pre-caching behaviors locally:
```bash
npm run build
npm run preview
```

---

## E2E QA Verification

We manage a custom E2E regression check utilizing **Playwright/Chrome** at `scratch/run_qa.js`:
- Deletes trial accounts in the database to guarantee clean welcoming sandboxes.
- Asserts onboarding (BMI/TDEE math, range sliders, profile forms).
- Asserts time-of-day meal logging, presets, sleep crossed-midnight duration, and haptic preferences.

To execute tests locally (requires setting up Chrome profile cookies):
```bash
node scratch/run_qa.js
```

---

## Release Status Map

*   **Phase 1 — Scaffold:** ✅ Vite + React 18 scaffolding.
*   **Phase 2 — Tokens:** ✅ Primitives and dynamic theme cascades.
*   **Phase 3 — UI Screens:** ✅ Designed all 15 screens with interactive layers.
*   **Phase 4 — PWA & Deploy:** ✅ Precached assets, service worker, and Vercel CD pipelines.
*   **Phase 5 — Firebase Backend:** ✅ Wired Google authentication, real-time syncs, and transactional integrity checks.
*   **Phase 5.1 — Form Interactivity:** ✅ Wired onboarding draft stores, steppers, sleep inputs, and timezone-correct dates.
*   **Phase 6 — Polish & Release:** ✅ Loaded shimmer skeletons, top-center portal toasts, pull-to-refresh home swiping, haptics vibration control, data downloads, 404 views, and font optimizations.

---

## License

Private — Personal Project
