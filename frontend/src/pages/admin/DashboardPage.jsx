import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import api from '../../lib/axios'

// Recharts attend des couleurs littérales (pas de classes Tailwind)
const BRAND = '#1e3a5f'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

const AVATAR_SIZES = { 7: 'w-7 h-7', 9: 'w-9 h-9' }

function Avatar({ name, size = 9 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`${AVATAR_SIZES[size] || 'w-9 h-9'} ${color} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

function StatCard({ icon, iconWrap = 'bg-brand/10 text-brand', label, value, sub, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconWrap}`}>{icon}</div>
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    api.get('/admin/dashboard')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const stats     = data?.stats || {}
  const todayList = data?.today_attendances || []
  const monthly   = data?.monthly || []
  const last7     = data?.last7 || []
  const recent    = data?.recent_members || []
  const maxDay    = Math.max(1, ...last7)

  return (
    <AdminLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="p-4 sm:p-6 lg:p-8">
        {/* En-tête */}
        <motion.div variants={item} className="mb-7">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-1">Bon retour ! Voici l'activité de votre organisation.</p>
        </motion.div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
          <motion.div variants={item}>
            <StatCard
              label="Membres"
              value={(stats.total_members ?? 0).toLocaleString('fr-FR')}
              sub={`${stats.members_this_month ?? 0} nouveau(x) ce mois-ci`}
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>}
            />
          </motion.div>

          <motion.div variants={item}>
            <StatCard
              label="Taux de participation"
              value={stats.participation_rate != null ? `${stats.participation_rate} %` : '—'}
              sub="Présences ÷ (événements × membres), 30 derniers jours"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" /></svg>}
            >
              <div className="flex items-end gap-1 mt-3 h-8" title="Présences des 7 derniers jours">
                {last7.map((v, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-sm ${v > 0 ? 'bg-brand/60' : 'bg-gray-100'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, (v / maxDay) * 100)}%` }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Présences · 7 derniers jours</p>
            </StatCard>
          </motion.div>

          <motion.div variants={item}>
            <StatCard
              label="Présences aujourd'hui"
              value={stats.today_attendance_count ?? 0}
              sub={`${(stats.total_attendances ?? 0).toLocaleString('fr-FR')} au total`}
              iconWrap="bg-accent-soft text-accent-dark"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            >
              {todayList.length > 0 && (
                <div className="flex -space-x-2 mt-3">
                  {todayList.slice(0, 5).map((a, i) => (
                    <Avatar key={i} name={a.member?.full_name} size={7} />
                  ))}
                </div>
              )}
            </StatCard>
          </motion.div>
        </div>

        {/* Graphe + pointages du jour */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <motion.div variants={item} className="lg:col-span-2 bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div>
                <h2 className="font-semibold text-gray-900">Tendance des présences</h2>
                <p className="text-xs text-gray-400">6 derniers mois</p>
              </div>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-transparent rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v, 'Présences']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2.5} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Pointages du jour</h2>
            <div className="space-y-4">
              {todayList.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun pointage aujourd'hui.</p>
              ) : (
                todayList.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.member?.full_name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.member?.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{a.event?.name || 'Événement'}</p>
                    </div>
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link
              to="/admin/attendance"
              className="block w-full mt-5 text-sm font-medium py-2.5 rounded-xl border border-black/5 text-gray-700 hover:bg-sand transition-colors text-center"
            >
              Voir toutes les présences
            </Link>
          </motion.div>
        </div>

        {/* Derniers membres inscrits */}
        <motion.div variants={item} className="mt-6 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Derniers membres inscrits</h2>
            <Link to="/admin/members" className="text-xs text-brand hover:text-brand-dark font-medium">
              Tous les membres →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Membre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Téléphone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Chargement…</td></tr>
                ) : recent.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Aucun membre.</td></tr>
                ) : (
                  recent.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.full_name} />
                          <p className="font-medium text-gray-900">{m.full_name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{m.phone || '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{m.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </AdminLayout>
  )
}
