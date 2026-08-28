import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar from './Sidebar'
import Icon from './ui/Icon'
import api from '../lib/axios'
import { useAuth } from '../context/AuthContext'
import { MODULES, MODULE_ORDER } from '../lib/modules'

const ROLE_LABELS = {
  super_admin: 'Super-admin',
  admin: 'Administrateur',
  secretaire: 'Secrétaire',
  scanner: 'Scanner',
}

const SEEN_KEY = 'signiq.notifSeen'

/** « il y a 5 min », « il y a 2 h », « hier »… */
function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'hier' : `il y a ${d} j`
}

function Panel({ children, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="absolute right-0 top-12 z-40 w-80 bg-white rounded-2xl ring-1 ring-black/5 shadow-xl overflow-hidden"
      >
        {children}
      </motion.div>
    </>
  )
}

function TopBar({ onMenu }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(null) // 'apps' | 'notif' | 'profile' | null
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)

  // Applications activées de l'organisation (lanceur de modules).
  const modules = MODULE_ORDER.filter(k => (user?.organization?.modules || []).includes(k))

  const computeUnread = (items) => {
    const seen = localStorage.getItem(SEEN_KEY)
    return seen ? items.filter(n => n.at > seen).length : items.length
  }

  const loadNotifs = () =>
    api.get('/admin/notifications')
      .then(res => {
        const items = res.data.data || []
        setNotifs(items)
        setUnread(computeUnread(items))
      })
      .catch(() => {})

  // Badge à jour au chargement puis toutes les 60 s
  useEffect(() => {
    if (user?.role === 'super_admin') return
    loadNotifs()
    const t = setInterval(loadNotifs, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openNotifs = () => {
    setOpen(open === 'notif' ? null : 'notif')
    if (open !== 'notif') {
      loadNotifs()
      localStorage.setItem(SEEN_KEY, new Date().toISOString())
      setUnread(0)
    }
  }

  const handleLogout = async () => { await logout(); navigate('/admin/login') }

  return (
    <header className="h-16 bg-white border-b border-black/5 flex items-center px-4 sm:px-8 sticky top-0 z-20">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenu}
        className="md:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-gray-500 hover:bg-sand transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Icon name="menu" size={24} />
      </button>

      {/* Icônes ancrées au coin droit */}
      <div className="ml-auto flex items-center gap-1 relative">
        {/* Applications (lanceur de modules) */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === 'apps' ? null : 'apps')}
            title="Applications"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-sand transition-colors"
          >
            <Icon name="apps" size={22} />
          </button>

          <AnimatePresence>
            {open === 'apps' && (
              <Panel onClose={() => setOpen(null)}>
                <div className="px-4 py-3 border-b border-black/5 font-semibold text-gray-900 text-sm">Applications</div>
                <div className="p-2">
                  {modules.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-gray-400">Aucune application activée.</p>
                  ) : modules.map(key => {
                    const m = MODULES[key]
                    if (!m) return null
                    const Icon = m.icon
                    return (
                      <button
                        key={key}
                        onClick={() => { setOpen(null); navigate(m.home) }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-sand transition-colors text-left"
                      >
                        <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white" style={{ background: m.color }}><Icon /></span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-900 truncate">{m.label}</span>
                          <span className="block text-xs text-gray-400 truncate">{m.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="p-3 border-t border-black/5">
                  <Link
                    to="/admin/modules"
                    onClick={() => setOpen(null)}
                    className="block text-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl py-2 transition-colors"
                  >
                    Gérer les applications
                  </Link>
                </div>
              </Panel>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={openNotifs}
            title="Notifications"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-sand transition-colors"
          >
            <Icon name="notifications" size={22} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {open === 'notif' && (
              <Panel onClose={() => setOpen(null)}>
                <div className="px-4 py-3 border-b border-black/5 font-semibold text-gray-900 text-sm">Notifications</div>
                <div className="max-h-96 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">Aucune activité récente.</p>
                  ) : notifs.map(n => (
                    <div key={n.id} className="px-4 py-3 flex items-start gap-3 border-b border-gray-50 last:border-0 hover:bg-sand/60">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        n.type === 'checkin' ? 'bg-emerald-50 text-emerald-600' : 'bg-accent-soft text-accent-dark'
                      }`}>
                        <Icon name={n.type === 'checkin' ? 'how_to_reg' : 'person_add'} size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 truncate">{n.detail}</p>
                      </div>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(n.at)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </AnimatePresence>
        </div>

        {/* Profil */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === 'profile' ? null : 'profile')}
            title="Mon profil"
            className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold ml-1 hover:bg-brand-dark transition-colors"
          >
            {(user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
          </button>

          <AnimatePresence>
            {open === 'profile' && (
              <Panel onClose={() => setOpen(null)}>
                <div className="p-5 bg-gradient-to-r from-brand to-brand-light text-white">
                  <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-lg font-bold mb-3">
                    {(user?.name?.[0] || 'A').toUpperCase()}
                  </div>
                  <p className="font-bold truncate">{user?.name}</p>
                  <p className="text-xs text-white/70 truncate">{user?.email}</p>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Rôle</span>
                    <span className="font-medium text-gray-800">{ROLE_LABELS[user?.role] || user?.role}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Organisation</span>
                    <span className="font-medium text-gray-800 truncate max-w-[150px]">{user?.organization?.name || '—'}</span>
                  </div>
                </div>
                <div className="p-3 border-t border-black/5 flex gap-2">
                  <Link
                    to="/admin/settings"
                    onClick={() => setOpen(null)}
                    className="flex-1 text-center text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl py-2 transition-colors"
                  >
                    Réglages
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex-1 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-xl py-2 transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              </Panel>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-sand">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
        <footer className="px-4 sm:px-8 py-4 text-xs text-gray-400 flex flex-col sm:flex-row items-center gap-2 sm:gap-0 sm:justify-between border-t border-black/5">
          <span>© 2026 Signiq · Gestion de présence par QR</span>
          <span>Fait avec ❤ pour les organisations</span>
        </footer>
      </div>
    </div>
  )
}
