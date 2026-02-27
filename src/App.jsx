import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import DrinkTracker from './pages/DrinkTracker'
import CalibrationSurvey from './pages/CalibrationSurvey'
import Social from './pages/Social'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import SessionSummary from './pages/SessionSummary'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-buzz-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/track"
          element={<ProtectedRoute><DrinkTracker /></ProtectedRoute>}
        />
        <Route
          path="/calibration"
          element={<ProtectedRoute><CalibrationSurvey /></ProtectedRoute>}
        />
        <Route
          path="/social"
          element={<ProtectedRoute><Social /></ProtectedRoute>}
        />
        <Route
          path="/leaderboard"
          element={<ProtectedRoute><Leaderboard /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><Profile /></ProtectedRoute>}
        />
        <Route
          path="/session/:sessionId"
          element={<ProtectedRoute><SessionSummary /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
