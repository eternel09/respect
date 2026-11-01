import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeForModules } from '../lib/modules'

const CHANGE_PASSWORD_PATH = '/admin/mot-de-passe'

export default function ProtectedRoute({ children, module }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />

  // Mot de passe temporaire : rien d'autre n'est accessible avant d'en choisir un.
  if (user.must_change_password && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  // Garde de module : une page dont le module n'est pas activé renvoie vers
  // l'accueil de la suite. Le super-admin garde l'accès à tout.
  const modules = user.organization?.modules || []
  if (module && user.role !== 'super_admin' && !modules.includes(module)) {
    return <Navigate to={homeForModules(modules)} replace />
  }

  return children
}
