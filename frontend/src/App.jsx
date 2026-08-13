import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StatusGridPage from './pages/StatusGridPage'
import TimelinePage from './pages/TimelinePage'
import AnomaliesPage from './pages/AnomaliesPage'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('access_token')
  )

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage onLogin={() => setIsAuthenticated(true)} />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
      >
        <Route index element={<DashboardPage />} />
        <Route path="status" element={<StatusGridPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="/anomalies" element={<AnomaliesPage />} />
      </Route>
    </Routes>
  )
}

export default App