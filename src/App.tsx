import { useEffect, useRef, type ReactNode } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom'
import { DesignSystemRoute } from './routes/_design-system'
import { AchievementRoute } from './routes/achievement'
import { HomeRoute } from './routes/home'
import { LogMealConfirmRoute, LogMealRoute, LogMealSavedRoute } from './routes/log-meal'
import { LogSleepRoute } from './routes/log-sleep'
import { LogWaterRoute } from './routes/log-water'
import { LogWeightRoute } from './routes/log-weight'
import { LogWorkoutRoute, LogWorkoutActiveRoute, LogWorkoutSummaryRoute } from './routes/log-workout'
import { PlanRoute } from './routes/plan'
import { ProfileRoute } from './routes/profile'
import { ProgressRoute } from './routes/progress'
import { LoginRoute } from './routes/login'
import { OnboardingGoalRoute, OnboardingProfileRoute, OnboardingWelcomeRoute } from './routes/onboarding'
import { SplashRoute } from './routes/splash'
import { NotFoundRoute } from './routes/not-found'
import { useAuth } from './hooks/useAuth'
import { useUser } from './hooks/useUser'
import { ErrorBoundary } from './components/ErrorBoundary'
import { listenForForegroundNotifications } from './lib/notifications'
import { bulkAddFoods, getCatalogCount, getLegacyUserFoods } from './lib/db'
import { STARTER_FOODS } from './data/starterFoods'
import { STARTER_COM_FOODS } from './data/starterComFoods'

function App() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    void listenForForegroundNotifications().then((nextUnsubscribe) => {
      unsubscribe = nextUnsubscribe
    })
    return () => unsubscribe?.()
  }, [])

  return (
    <Router>
      <ErrorBoundary>
        <AuthGate />
      </ErrorBoundary>
    </Router>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  const seedAttempted = useRef(false)

  // One-time auto-seed of shared library catalog on first authenticated load.
  // If user has legacy per-user foods (pre-v1.4.0), migrate those first to
  // preserve any customizations. Otherwise fall back to hardcoded starter
  // pack. Idempotent: short-circuits if catalog already has any food.
  useEffect(() => {
    if (!user || seedAttempted.current) return
    seedAttempted.current = true
    void (async () => {
      try {
        const count = await getCatalogCount()
        if (count > 0) return
        const legacy = await getLegacyUserFoods(user.uid)
        const seed = legacy.length > 0 ? legacy : [...STARTER_FOODS, ...STARTER_COM_FOODS]
        await bulkAddFoods(seed)
        console.log(`[catalog] seeded ${seed.length} foods from ${legacy.length > 0 ? 'legacy library' : 'starter pack'}`)
      } catch (err) {
        console.error('[catalog] auto-seed failed:', err)
      }
    })()
  }, [user])

  if (loading) return <SplashRoute />
  if (!user) return <LoginRoute />

  return (
    <FirstTimeUserGate>
      <Routes>
        <Route element={<DesignSystemRoute />} path="/design" />
        <Route element={<Navigate replace to="/" />} path="/login" />
        <Route element={<SplashRoute />} path="/splash" />
        <Route element={<OnboardingWelcomeRoute />} path="/onboarding/welcome" />
        <Route element={<OnboardingProfileRoute />} path="/onboarding/profile" />
        <Route element={<OnboardingGoalRoute />} path="/onboarding/goal" />
        <Route element={<HomeRoute />} path="/" />
        <Route element={<LogMealRoute />} path="/log/meal" />
        <Route element={<LogMealConfirmRoute />} path="/log/meal/confirm" />
        <Route element={<LogMealSavedRoute />} path="/log/meal/saved" />
        <Route element={<LogWaterRoute />} path="/log/water" />
        <Route element={<LogWeightRoute />} path="/log/weight" />
        <Route element={<LogWorkoutRoute />} path="/log/workout" />
        <Route element={<LogWorkoutActiveRoute />} path="/log/workout/active" />
        <Route element={<LogWorkoutSummaryRoute />} path="/log/workout/summary" />
        <Route element={<LogSleepRoute />} path="/log/sleep" />
        <Route element={<ProgressRoute />} path="/progress" />
        <Route element={<PlanRoute />} path="/plan" />
        <Route element={<ProfileRoute />} path="/profile" />
        <Route element={<AchievementRoute />} path="/achievement" />
        <Route element={<NotFoundRoute />} path="*" />
      </Routes>
    </FirstTimeUserGate>
  )
}

function FirstTimeUserGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { exists, loading } = useUser()
  const isOnboarding = location.pathname.startsWith('/onboarding')
  const isUtilityRoute = location.pathname === '/design' || location.pathname === '/splash'

  if (loading) return <SplashRoute />
  if (!exists && !isOnboarding && !isUtilityRoute) return <Navigate replace to="/onboarding/welcome" />
  if (exists && isOnboarding) return <Navigate replace to="/" />

  return children
}

export default App
