import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import CreateOrganizationModal from '../../components/CreateOrganizationModal'
import Pagination from '../../components/Pagination'

export default function OrganizationsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [orgs, setOrgs]         = useState([])
  const [meta, setMeta]         = useState(null)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [showCreate, setShow]   = useState(false)
  const [created, setCreated]   = useState(null) // résultat de création (avec temp_password)
  const [refreshKey, setRefresh] = useState(0)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/organizations', { params: { page } })
      .then(res => { setOrgs(res.data.data); setMeta(res.data.meta) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey, page])

  const handleLogout = async () => { await logout(); navigate('/admin/login') }
  const handleCreated = result => { setShow(false); setCreated(result); setRefresh(k => k + 1) }

  return (
    <div className="min-h-screen bg-sand">
      {/* Barre plateforme */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight text-brand">Signiq</p>
              <p className="text-gray-400 text-xs">Plateforme · Super-admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-gray-500">{user?.email}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Déconnexion</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Organisations</h1>
              <p className="text-gray-500 text-sm mt-1">Créez et gérez les organisations clientes de la plateforme.</p>
            </div>
            <button onClick={() => setShow(true)}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl px-4 py-2.5 bg-brand hover:bg-brand-dark transition-colors shadow-lg shadow-brand/20">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              Nouvelle organisation
            </button>
          </div>

          {/* Bannière succès avec accès du nouvel admin */}
          {created && (
            <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-semibold text-emerald-800">{created.message}</p>
                <button onClick={() => setCreated(null)} className="text-emerald-700 hover:text-emerald-900 text-sm">✕</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-xl px-4 py-3 ring-1 ring-black/5">
                  <p className="text-xs text-gray-400">Email admin</p>
                  <p className="font-medium text-gray-800">{created.admin?.email}</p>
                </div>
                <div className="bg-white rounded-xl px-4 py-3 ring-1 ring-black/5">
                  <p className="text-xs text-gray-400">Mot de passe temporaire</p>
                  <p className="font-mono font-bold text-brand tracking-wide">{created.temp_password}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-700 mt-3">
                {created.email_sent
                  ? "Ces accès ont été envoyés par email à l'administrateur."
                  : "⚠️ L'email n'a pas pu être envoyé — communiquez ces accès manuellement."}
              </p>
            </div>
          )}

          {/* Liste */}
          <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Organisation</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Membres</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Créée le</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center"><div className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" /></td></tr>
                  ) : orgs.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Aucune organisation.</td></tr>
                  ) : orgs.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/60 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{o.name}</p>
                        <p className="text-xs text-gray-400">{o.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{o.admin_email || '—'}</td>
                      <td className="px-5 py-4 text-gray-600">{o.members_count}</td>
                      <td className="px-5 py-4">
                        <span className="bg-brand/10 text-brand text-xs font-medium px-2.5 py-1 rounded-full capitalize">{o.plan}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{o.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} page={page} onChange={setPage} count={orgs.length} label="organisation(s)" />
          </div>
        </motion.div>
      </main>

      <CreateOrganizationModal open={showCreate} onClose={() => setShow(false)} onCreated={handleCreated} />
    </div>
  )
}
