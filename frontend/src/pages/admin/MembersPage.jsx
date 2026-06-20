import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import api from '../../lib/axios'

function Avatar({ name }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500']
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

function StatCard({ icon, iconWrap = 'bg-brand/10 text-brand', label, value, sub, badge }) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconWrap}`}>{icon}</div>
        {badge && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function AttendanceBar({ pct = 0 }) {
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 w-8">{pct}%</span>
    </div>
  )
}

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [meta, setMeta]       = useState(null)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState({ total: 0, avg: 84, new: 0 })

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/admin/members', { params: { search, page } }),
      api.get('/admin/dashboard'),
    ]).then(([membersRes, dashRes]) => {
      setMembers(membersRes.data.data)
      setMeta(membersRes.data.meta)
      const s = dashRes.data.stats
      setStats({ total: s.total_members, avg: 84, new: s.today_attendance_count })
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [search, page])

  return (
    <AdminLayout>
      <PageShell title="Member Directory" subtitle="Manage your community's active families and individuals.">

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-6">
          <StatCard
            label="Total Members"
            value={stats.total.toLocaleString()}
            badge="+12%"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>}
          />
          <StatCard
            label="Avg. Attendance"
            value={`${stats.avg}%`}
            sub="Past 30 days"
            iconWrap="bg-emerald-50 text-emerald-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" /></svg>}
          />
          <StatCard
            label="New Members"
            value={stats.new}
            sub="This month"
            iconWrap="bg-accent-soft text-accent-dark"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>}
          />
          {/* CTA card */}
          <button className="rounded-2xl p-5 text-left text-white flex flex-col justify-between shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark bg-brand min-h-[120px]">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
            </div>
            <span className="font-semibold">Ajouter un membre</span>
          </button>
        </div>

        {/* Search toolbar */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            <input
              type="text"
              placeholder="Search members by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-sand border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-sand">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61z" /></svg>
              Filter
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-sand">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" /></svg>
              Sort
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-medium text-white rounded-xl px-3 py-2 transition-colors hover:bg-brand-dark bg-brand">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
              Export
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Member</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Family Unit</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact Info</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Attendance Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Joined Date</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" />
                  </td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Aucun membre trouvé.</td></tr>
                ) : members.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name} />
                        <div>
                          <p className="font-medium text-gray-900">{m.full_name}</p>
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">Active</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">Famille</td>
                    <td className="px-5 py-4 text-gray-700">{m.phone}</td>
                    <td className="px-5 py-4"><AttendanceBar pct={Math.min(100, (m.attendance_count || 0) * 10)} /></td>
                    <td className="px-5 py-4 text-gray-500">{m.created_at?.slice(0, 10)}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && (
            <div className="px-5 py-4 border-t border-black/5 flex flex-col sm:flex-row items-center gap-3 sm:justify-between text-sm text-gray-500">
              <p>Showing {members.length} of {meta.total} members</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-sand"
                >‹</button>
                {Array.from({ length: Math.min(meta.last_page, 3) }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg border text-xs transition-colors ${
                      page === n ? 'bg-brand text-white border-brand' : 'border-gray-200 hover:bg-sand'
                    }`}
                  >{n}</button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                  disabled={page === meta.last_page}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-sand"
                >›</button>
              </div>
            </div>
          )}
        </div>
      </PageShell>
    </AdminLayout>
  )
}
