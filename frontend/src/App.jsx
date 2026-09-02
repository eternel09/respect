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
import RegisterPage from './pages/admin/RegisterPage'
import RegisterNetworkPage from './pages/admin/RegisterNetworkPage'
import MembersPage from './pages/admin/MembersPage'
import QrCodesPage from './pages/admin/QrCodesPage'
import ReportsPage from './pages/admin/ReportsPage'
import OccasionsPage from './pages/events/OccasionsPage'
import OccasionDetailPage from './pages/events/OccasionDetailPage'
import RsvpPage from './pages/events/RsvpPage'
import ModulesPage from './pages/admin/ModulesPage'
import NetworkPage from './pages/admin/NetworkPage'
import { homeForModules } from './lib/modules'

// Atterrissage : super-admin → organisations, agent d'événement → son
// événement, sinon accueil du 1ᵉʳ module actif.
function AdminHome() {
  const { user } = useAuth()
  if (user?.role === 'super_admin') return <Navigate to="/admin/organizations" replace />
  if (user?.occasion_id) return <Navigate to={`/events/${user.occasion_id}`} replace />
  return <Navigate to={homeForModules(user?.organization?.modules || [])} replace />
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
          <Route path="/register"    element={<RegisterPage />} />
          {/* Auto-inscription d'une sous-organisation via lien d'invitation réseau */}
          <Route path="/rejoindre/:token" element={<RegisterNetworkPage />} />
          {/* Confirmation de présence d'un invité (RSVP public + vidéo du couple) */}
          <Route path="/confirmer/:token" element={<RsvpPage />} />

          {/* Plateforme (super-admin) */}
          <Route path="/admin/organizations" element={<ProtectedRoute><OrganizationsPage /></ProtectedRoute>} />

          {/* Suite d'applications — toujours accessible (gérer ses modules) */}
          <Route path="/admin/modules"    element={<ProtectedRoute><ModulesPage /></ProtectedRoute>} />

          {/* Module « Gestion de présence » */}
          <Route path="/admin/dashboard"  element={<ProtectedRoute module="presence"><DashboardPage /></ProtectedRoute>} />
          {/* Vue consolidée du réseau — l'API refuse (403) si l'org n'est pas mère */}
          <Route path="/admin/reseau"     element={<ProtectedRoute module="presence"><NetworkPage /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute module="presence"><AttendancePage /></ProtectedRoute>} />
          <Route path="/admin/members"    element={<ProtectedRoute module="presence"><MembersPage /></ProtectedRoute>} />
          <Route path="/admin/events"     element={<ProtectedRoute module="presence"><EventsPage /></ProtectedRoute>} />
          <Route path="/admin/reports"    element={<ProtectedRoute module="presence"><ReportsPage /></ProtectedRoute>} />
          <Route path="/admin/qrcodes"    element={<ProtectedRoute module="presence"><QrCodesPage /></ProtectedRoute>} />
          <Route path="/admin/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Module « Invitations & événements » (URL distincte /events) */}
          <Route path="/events"     element={<ProtectedRoute module="occasions"><OccasionsPage /></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute module="occasions"><OccasionDetailPage /></ProtectedRoute>} />

          {/* Fallbacks */}
          <Route path="/admin" element={<ProtectedRoute><AdminHome /></ProtectedRoute>} />
          <Route path="/"      element={<Navigate to="/admin/login" replace />} />

          {/* Toute URL inconnue → connexion (évite la page blanche) */}
          <Route path="*"      element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
