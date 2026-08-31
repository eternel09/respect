import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import Icon from '../../components/ui/Icon'
import api from '../../lib/axios'

// Recharts attend des couleurs littérales (pas de classes Tailwind)
const BRAND = '#1e3a5f'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

function Avatar({ name, size = 9 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  const cls = size === 7 ? 'w-7 h-7' : 'w-9 h-9'
  return (
    <div className={`${cls} ${color} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ring-2 ring-white`}>
      {initials}
    </div>
  )
}

function StatCard({ icon, iconWrap, label, value, sub, trend, children }) {
  return (
    <div className="group bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm h-full transition-all duration-200 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${iconWrap}`}>
          <Icon name={icon} size={22} fill={1} />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-1">
            <Icon name="trending_up" size={14} /> {trend}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-[2rem] leading-none font-bold text-gray-900 mt-1.5 tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
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

  const stats = data?.stats || {}
  const todayList = data?.today_attendances || []
  const monthly = data?.monthly || []
  const last7 = data?.last7 || []
  const recent = data?.recent_members || []
  const maxDay = Math.max(1, ...last7)
  const newThisMonth = stats.members_this_month ?? 0

  return (
    <AdminLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="p-4 sm:p-6 lg:p-8">
        {/* En-tête */}
        <motion.div variants={item} className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[1.85rem] sm:text-[2.15rem] leading-tight font-medium text-gray-900 tracking-tight">Tableau de bord</h1>
            <p className="text-gray-500 text-sm mt-1">Bon retour ! Voici l'activité de votre organisation.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 bg-white ring-1 ring-black/5 rounded-full px-3 py-1.5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Temps réel · mis à jour toutes les 30 s
          </span>
        </motion.div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-5">
          <motion.div variants={item}>
            <StatCard
              icon="groups"
              iconWrap="bg-gradient-to-br from-brand to-brand-light text-white"
              label="Membres"
              value={(stats.total_members ?? 0).toLocaleString('fr-FR')}
              sub={`${newThisMonth} nouveau(x) ce mois-ci`}
              trend={newThisMonth > 0 ? `+${newThisMonth}` : null}
            />
          </motion.div>

          <motion.div variants={item}>
            <StatCard
              icon="query_stats"
              iconWrap="bg-brand/10 text-brand"
              label="Taux de participation"
              value={stats.participation_rate != null ? `${stats.participation_rate} %` : '—'}
              sub="Présences ÷ (événements × membres), 30 j"
            >
              <div className="flex items-end gap-1 mt-4 h-9" title="Présences des 7 derniers jours">
                {last7.map((v, i) => (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-t-md ${v > 0 ? 'bg-gradient-to-t from-brand/50 to-brand/80' : 'bg-gray-100'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, (v / maxDay) * 100)}%` }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Présences · 7 derniers jours</p>
            </StatCard>
          </motion.div>

          <motion.div variants={item}>
            <StatCard
              icon="how_to_reg"
              iconWrap="bg-gradient-to-br from-accent to-accent-dark text-white"
              label="Présences aujourd'hui"
              value={stats.today_attendance_count ?? 0}
              sub={`${(stats.total_attendances ?? 0).toLocaleString('fr-FR')} au total`}
            >
              {todayList.length > 0 && (
                <div className="flex -space-x-2 mt-4">
                  {todayList.slice(0, 6).map((a, i) => <Avatar key={i} name={a.member?.full_name} size={7} />)}
                </div>
              )}
            </StatCard>
          </motion.div>
        </div>

        {/* Graphe + pointages du jour */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <motion.div variants={item} className="lg:col-span-2 bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><Icon name="show_chart" size={18} /></span>
              <div>
                <h2 className="font-semibold text-gray-900 leading-tight">Tendance des présences</h2>
                <p className="text-xs text-gray-400">6 derniers mois</p>
              </div>
            </div>
            {loading ? (
              <div className="h-52 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-transparent rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={monthly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [v, 'Présences']}
                    cursor={{ stroke: BRAND, strokeOpacity: 0.25, strokeWidth: 1 }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(20,42,71,0.14)', fontSize: 12, padding: '8px 12px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2.5} fill="url(#grad)"
                    dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-dark flex items-center justify-center"><Icon name="bolt" size={18} fill={1} /></span>
              <h2 className="font-semibold text-gray-900">Pointages du jour</h2>
            </div>
            <div className="space-y-3.5 flex-1">
              {todayList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-6">
                  <Icon name="event_busy" size={32} className="text-gray-300" />
                  <p className="text-gray-400 text-sm mt-2">Aucun pointage aujourd'hui.</p>
                </div>
              ) : (
                todayList.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.member?.full_name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.member?.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{a.event?.name || 'Événement'}</p>
                    </div>
                    <span className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600">
                      <Icon name="check" size={16} />
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link to="/admin/attendance"
              className="group flex items-center justify-center gap-1.5 w-full mt-5 text-sm font-medium py-2.5 rounded-xl border border-black/5 text-gray-700 hover:bg-sand hover:border-brand/20">
              Voir toutes les présences
              <Icon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>

        {/* Derniers membres inscrits */}
        <motion.div variants={item} className="mt-5 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
          <div className="px-5 py-4 border-b border-black/5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><Icon name="person_add" size={18} /></span>
            <h2 className="font-semibold text-gray-900">Derniers membres inscrits</h2>
            <Link to="/admin/members" className="ml-auto inline-flex items-center gap-1 text-xs text-brand hover:text-brand-dark font-semibold">
              Tous les membres <Icon name="arrow_forward" size={15} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Membre</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Téléphone</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Chargement…</td></tr>
                ) : recent.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">Aucun membre.</td></tr>
                ) : (
                  recent.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.full_name} />
                          <p className="font-medium text-gray-900">{m.full_name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 tabular-nums">{m.phone || '—'}</td>
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
