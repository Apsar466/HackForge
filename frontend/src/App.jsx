import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ParticipantDashboard from './pages/ParticipantDashboard'
import AdminDashboard from './pages/AdminDashboard'
import JudgeView from './pages/JudgeView'
import LeaderboardPage from './pages/LeaderboardPage'
import { useAuthStore } from './store/useAuthStore'

const AUTH_ROUTES = ['/login', '/register']

export default function App() {
  const { fetchCurrentUser, user } = useAuthStore()
  const location = useLocation()
  const isAuthPage = AUTH_ROUTES.includes(location.pathname)

  useEffect(() => { fetchCurrentUser() }, [])

  if (isAuthPage) {
    return (
      <div className="min-h-screen" style={{ background: '#0D1117' }}>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0D1117' }}>
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content — offset by sidebar width */}
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        <TopBar />

        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={
              user ? (
                user.role === 'admin' ? <Navigate to="/admin" replace /> :
                user.role === 'judge' ? <Navigate to="/judge" replace /> :
                <Navigate to="/participant" replace />
              ) : <Navigate to="/login" replace />
            } />

            <Route path="/participant" element={
              <ProtectedRoute allowedRoles={['participant','admin','judge']}>
                <ParticipantDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/judge" element={
              <ProtectedRoute allowedRoles={['judge','admin']}>
                <JudgeView />
              </ProtectedRoute>
            } />

            <Route path="/leaderboard" element={<LeaderboardPage />} />

            <Route path="/login"    element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
