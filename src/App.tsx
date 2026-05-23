import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { DesignSystemRoute } from './routes/_design-system'
import { AchievementRoute } from './routes/achievement'
import { HomeRoute } from './routes/home'
import { LogMealConfirmRoute, LogMealRoute, LogMealSavedRoute } from './routes/log-meal'
import {
  LogSleepRoute,
  LogWaterRoute,
  LogWeightRoute,
  LogWorkoutActiveRoute,
  LogWorkoutRoute,
  LogWorkoutSummaryRoute,
} from './routes/log-health'
import { PlanRoute } from './routes/plan'
import { ProfileRoute } from './routes/profile'
import { ProgressRoute } from './routes/progress'
import { LoginRoute } from './routes/login'
import { OnboardingGoalRoute, OnboardingProfileRoute, OnboardingWelcomeRoute } from './routes/onboarding'
import { SplashRoute } from './routes/splash'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<DesignSystemRoute />} path="/design" />
        <Route element={<LoginRoute />} path="/login" />
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
        <Route element={<Navigate replace to="/login" />} path="*" />
      </Routes>
    </Router>
  )
}

export default App
