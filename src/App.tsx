import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { DesignSystemRoute } from './routes/_design-system'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<DesignSystemRoute />} path="/design" />
        <Route element={<Navigate replace to="/design" />} path="*" />
      </Routes>
    </Router>
  )
}

export default App
