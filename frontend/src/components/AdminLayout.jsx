import { useState } from 'react'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

function TopBar({ search, onMenu }) {
  const { user } = useAuth()
  return (
    <header className="h-16 bg-white border-b border-black/5 flex items-center gap-3 px-4 sm:px-8 sticky top-0 z-20">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenu}
        className="md:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-gray-500 hover:bg-sand transition-colors"
        aria-label="Ouvrir le menu"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" /></svg>
      </button>

      <div className="flex-1 max-w-md">
        {search && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            <input
              type="text"
              placeholder="Rechercher un membre..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-sand border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-sand transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
        </button>
        <button className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-sand transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" /></svg>
        </button>
        <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold ml-1">
          {(user?.email?.[0] || 'A').toUpperCase()}
        </div>
      </div>
    </header>
  )
}

export default function AdminLayout({ children, search = false }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-sand">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar search={search} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="px-4 sm:px-8 py-4 text-xs text-gray-400 flex flex-col sm:flex-row items-center gap-2 sm:gap-0 sm:justify-between border-t border-black/5">
          <span>© 2026 Signiq · Gestion de présence par QR</span>
          <span>Fait avec ❤ pour les organisations</span>
        </footer>
      </div>
    </div>
  )
}
