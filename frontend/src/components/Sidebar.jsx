import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/admin/dashboard',  label: 'Tableau de bord', icon: '📊' },
  { to: '/admin/members',    label: 'Membres',          icon: '👥' },
  { to: '/admin/events',     label: 'Événements',       icon: '📅' },
  { to: '/admin/reports',    label: 'Rapports PDF',     icon: '📄' },
  { to: '/admin/qrcodes',    label: 'QR Codes',         icon: '🔲' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-violet-900 text-white flex flex-col">
      <div className="p-6 border-b border-violet-700">
        <h1 className="font-bold text-lg leading-tight">Famille Respect</h1>
        <p className="text-violet-300 text-xs mt-1">Administration</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-violet-700 text-white'
                  : 'text-violet-200 hover:bg-violet-800 hover:text-white'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-violet-700">
        <p className="text-violet-300 text-xs mb-3 truncate">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-violet-200 hover:text-white transition"
        >
          ← Déconnexion
        </button>
      </div>
    </aside>
  )
}
