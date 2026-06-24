import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Splash from './components/Loader'
import ConnectionToast from './components/ConnectionToast'
import { AuthProvider, useAuth } from './context/AuthContext'
import OnboardingPage from './pages/OnboardingPage'
import PresencePage from './pages/PresencePage'
import AttendancePage from './pages/admin/AttendancePage'
import DashboardPage from './pages/admin/DashboardPage'
import OrganizationsPage from './pages/admin/OrganizationsPage'
import SettingsPage from './pages/admin/SettingsPage'
import EventsPage from './pages/admin/EventsPage'
import LoginPage from './pages/admin/LoginPage'
import MembersPage from './pages/admin/MembersPage'
import QrCodesPage from './pages/admin/QrCodesPage'
import ReportsPage from './pages/admin/ReportsPage'

// Atterrissage selon le rôle : super-admin → organisations, sinon dashboard.
function AdminHome() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'super_admin' ? '/admin/organizations' : '/admin/dashboard'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Splash />
        <ConnectionToast />
        <Routes>
          {/* Public */}
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/presence"   element={<PresencePage />} />

          {/* Admin auth */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Plateforme (super-admin) */}
          <Route path="/admin/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />

          {/* Admin protected */}
          <Route path="/admin/dashboard"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
          <Route path="/admin/members"    element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/admin/events"     element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
          <Route path="/admin/reports"    element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/admin/qrcodes"    element={<ProtectedRoute><QrCodesPage /></ProtectedRoute>} />
          <Route path="/admin/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Fallbacks */}
          <Route path="/admin" element={<ProtectedRoute><AdminHome /></ProtectedRoute>} />
          <Route path="/"      element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
