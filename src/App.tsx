import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { DesignSystemRoute } from './routes/_design-system'
import { HomeRoute } from './routes/home'
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
        <Route element={<Navigate replace to="/login" />} path="*" />
      </Routes>
    </Router>
  )
}

export default App
