import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeForModules } from '../lib/modules'

export default function ProtectedRoute({ children, module }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/admin/login" replace />

  // Garde de module : une page dont le module n'est pas activé renvoie vers
  // l'accueil de la suite. Le super-admin garde l'accès à tout.
  const modules = user.organization?.modules || []
  if (module && user.role !== 'super_admin' && !modules.includes(module)) {
    return <Navigate to={homeForModules(modules)} replace />
  }

  return children
}
