import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import api from '../../lib/axios'

// Recharts attend des couleurs littérales (pas de classes Tailwind)
const BRAND = '#1e3a5f'

const CHART_DATA = [
  { month: 'Jan', value: 65 },
  { month: 'Fév', value: 72 },
  { month: 'Mar', value: 68 },
  { month: 'Avr', value: 80 },
  { month: 'Mai', value: 75 },
  { month: 'Jun', value: 85 },
]

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

function StatCard({ icon, iconWrap = 'bg-brand/10 text-brand', badge, badgeColor = 'text-emerald-600 bg-emerald-50', label, value, sub, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconWrap}`}>{icon}</div>
        {badge && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>}
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

  const stats = data?.stats || {}
  const todayList = data?.today_attendances || []

  return (
    <AdminLayout search>
      <motion.div variants={container} initial="hidden" animate="show" className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div variants={item} className="mb-7">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, Administrator. Here's what's happening today.</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
          <motion.div variants={item}>
            <StatCard
              label="Nombre de membres"
              value={(stats.total_members ?? 0).toLocaleString()}
              badge="+12%"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>}
            >
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: '74%' }} transition={{ duration: 0.8, delay: 0.3 }} />
              </div>
            </StatCard>
          </motion.div>

          <motion.div variants={item}>
            <StatCard
              label="Taux de participation"
              value="78.5%"
              badge="+8.4%"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" /></svg>}
            >
              <div className="flex items-end gap-1 mt-3 h-8">
                {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-sm bg-brand/15"
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                  />
                ))}
              </div>
            </StatCard>
          </motion.div>

          <motion.div variants={item}>
            <StatCard
              label="Activité récente"
              value="42 New"
              sub="Registrations this week"
              iconWrap="bg-accent-soft text-accent-dark"
              icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 117 7 6.96 6.96 0 01-4.95-2.05l-1.42 1.42A9 9 0 1013 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z" /></svg>}
            >
              <div className="flex -space-x-2 mt-3">
                {(todayList.length ? todayList : [{}, {}, {}]).slice(0, 4).map((a, i) => (
                  <Avatar key={i} name={a.member?.full_name || `M${i}`} size={7} />
                ))}
              </div>
            </StatCard>
          </motion.div>
        </div>

        {/* Chart + Check-ins */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <motion.div variants={item} className="lg:col-span-2 bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div>
                <h2 className="font-semibold text-gray-900">Attendance Trends</h2>
                <p className="text-xs text-gray-400">Yearly participation overview</p>
              </div>
              <select className="text-xs border border-black/5 rounded-lg px-3 py-1.5 text-gray-600 bg-sand">
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-transparent rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={CHART_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke={BRAND} strokeWidth={2.5} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Check-ins</h2>
            <div className="space-y-4">
              {todayList.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun pointage aujourd'hui.</p>
              ) : (
                todayList.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.member?.full_name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.member?.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{a.event?.name || 'Service'}</p>
                    </div>
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="w-full mt-5 text-sm font-medium py-2.5 rounded-xl border border-black/5 text-gray-700 hover:bg-sand transition-colors">
              View All Activity
            </button>
          </motion.div>
        </div>

        {/* Recent Members */}
        <motion.div variants={item} className="mt-6 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Members</h2>
            <button className="text-xs text-gray-500 flex items-center gap-1.5 hover:text-gray-700">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61z" /></svg>
              Filter
            </button>
          </div>
          {/* Scroll horizontal sur petit écran */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Member</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Join Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Chargement…</td></tr>
                ) : todayList.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Aucune donnée.</td></tr>
                ) : (
                  todayList.slice(0, 5).map(a => (
                    <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={a.member?.full_name} />
                          <div>
                            <p className="font-medium text-gray-900">{a.member?.full_name}</p>
                            <p className="text-xs text-gray-400">{a.member?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">Famille</td>
                      <td className="px-5 py-3 text-gray-500">{a.attended_date}</td>
                      <td className="px-5 py-3">
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full">ACTIVE</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                        </button>
                      </td>
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
