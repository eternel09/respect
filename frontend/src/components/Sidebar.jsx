import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { navForModules } from '../lib/modules'
import brandIconWhite from '../assets/icon-white.png'

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const modules = user?.organization?.modules || []

  // Navigation = entrées des modules activés + « Applications » et « Réglages »
  // toujours présents (pour toujours pouvoir gérer sa suite).
  const links = [
    ...navForModules(modules),
    { to: '/admin/modules',  label: 'Applications', icon: AppsIcon },
    { to: '/admin/settings', label: 'Réglages',     icon: SettingsIcon },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <>
      {/* Overlay (mobile uniquement) */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 md:sticky md:top-0 md:inset-y-auto md:shrink-0 w-64 h-screen flex flex-col text-white
                    bg-gradient-to-b from-brand via-brand-light to-accent
                    transform transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={brandIconWhite} alt="Signiq" className="w-9 h-9" />
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight text-white truncate max-w-[150px]">{user?.organization?.name || 'Signiq'}</p>
              <p className="text-white/60 text-xs">Administration</p>
            </div>
          </div>
          {/* Fermer (mobile) */}
          <button onClick={onClose} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/20 text-white font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Quick actions — propre au module présence */}
        {modules.includes('presence') && (
          <div className="px-3 pb-4">
            <p className="text-white/50 text-xs px-3 mb-2 uppercase tracking-wider">Actions rapides</p>
            <button
              onClick={() => { onClose(); navigate('/admin/attendance') }}
              className="w-full text-brand text-sm font-semibold py-2.5 rounded-xl transition-colors bg-white hover:bg-white/90 flex items-center justify-center gap-2 shadow-lg shadow-black/20"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              Enregistrer une présence
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold text-white">
            {(user?.email?.[0] || 'A').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white/80 text-xs truncate">{user?.email || 'Administrator'}</p>
            <button onClick={handleLogout} className="text-white/50 hover:text-white text-xs transition-colors">
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

/* Icons */
function AppsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" /></svg>
}
function SettingsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>
}
