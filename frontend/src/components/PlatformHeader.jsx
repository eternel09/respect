import { NavLink } from 'react-router-dom'
import Icon from './ui/Icon'

const TABS = [
  { to: '/admin/organizations',  label: 'Organisations',       icon: 'domain' },
  { to: '/admin/print-requests', label: "Demandes d'impression", icon: 'print' },
]

/**
 * Barre de navigation de l'espace plateforme (opérateur / super-admin).
 * Partagée par les pages super-admin pour basculer entre les sections.
 */
export default function PlatformHeader({ user, onLogout }) {
  return (
    <header className="bg-white border-b border-black/5 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand">
            <Icon name="domain" size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-brand">Signiq</p>
            <p className="text-gray-400 text-xs">Plateforme · Super-admin</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {TABS.map(t => (
            <NavLink
              key={t.to} to={t.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-brand/10 text-brand font-semibold' : 'text-gray-500 hover:bg-sand'
                }`}
            >
              <Icon name={t.icon} size={18} />{t.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs text-gray-500">{user?.email}</span>
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Déconnexion</button>
        </div>
      </div>

      {/* Nav compacte (mobile) */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        {TABS.map(t => (
          <NavLink
            key={t.to} to={t.to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                isActive ? 'bg-brand/10 text-brand font-semibold' : 'text-gray-500 hover:bg-sand'
              }`}
          >
            <Icon name={t.icon} size={18} />{t.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
