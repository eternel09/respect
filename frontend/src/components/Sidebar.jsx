import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { navForModules } from '../lib/modules'
import Icon from './ui/Icon'
import brandIconWhite from '../assets/icon-white.png'

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const modules = user?.organization?.modules || []

  // Navigation = entrées des modules activés + « Réglages ». Le lanceur
  // « Applications » vit dans la topbar (à côté des notifications).
  const links = [
    ...navForModules(modules),
    // Réseau : organisation de 1er niveau (peut créer des sous-organisations et
    // en consulter le consolidé). Affiché même avant la 1re sous-organisation.
    ...(user?.organization?.can_manage_network
      ? [{ to: '/admin/reseau', label: 'Réseau', icon: () => <Icon name="account_tree" /> }]
      : []),
    { to: '/admin/settings', label: 'Réglages', icon: () => <Icon name="settings" /> },
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
                    bg-brand
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
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: LinkIcon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-white/15 text-white font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 -translate-x-1'}`} />
                  <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-accent' : ''}`}><LinkIcon /></span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Quick actions — propre au module présence */}
        {modules.includes('presence') && (
          <div className="px-3 pb-4">
            <p className="text-white/50 text-xs px-3 mb-2 uppercase tracking-wider">Actions rapides</p>
            <button
              onClick={() => { onClose(); navigate('/admin/attendance') }}
              className="w-full text-brand text-sm font-semibold py-2.5 rounded-xl bg-white hover:bg-white/90 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 shadow-lg shadow-black/20"
            >
              <Icon name="how_to_reg" size={18} />
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

