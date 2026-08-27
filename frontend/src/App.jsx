import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StatusGridPage from './pages/StatusGridPage'
import TimelinePage from './pages/TimelinePage'
import AnomaliesPage from './pages/AnomaliesPage'
import AlertLogsPage from './pages/AlertLogsPage'
import MaintenancePage from './pages/MaintenancePage'
import SLADashboardPage from './pages/SLADashboardPage'
import PlaybackPage from './pages/PlaybackPage'
import { useCurrentUser } from './hooks/useCurrentUser'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('access_token')
  )
  const { refreshUser } = useCurrentUser()

  const handleLogin = () => {
    setIsAuthenticated(true)
    refreshUser()
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
    refreshUser()
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage onLogin={handleLogin} />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />}
      >
        <Route index element={<DashboardPage />} />
        <Route path="status" element={<StatusGridPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="/anomalies" element={<AnomaliesPage />} />
        <Route path="/alert-logs" element={<AlertLogsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/sla" element={<SLADashboardPage />} />
        <Route path="/playback" element={<PlaybackPage />} />
      </Route>
    </Routes>
  )
}

export default App