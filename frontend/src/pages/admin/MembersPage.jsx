import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import AddMemberModal from '../../components/AddMemberModal'
import MemberDetailModal from '../../components/MemberDetailModal'
import api, { downloadFile, apiErrorMessage } from '../../lib/axios'

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
  const [badgeBusy, setBadgeBusy] = useState(null) // id du membre, ou 'all'
  const [badgeError, setBadgeError] = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [created, setCreated]     = useState(null) // { member, message } après ajout
  const [refreshKey, setRefreshKey] = useState(0)
  const [detailId, setDetailId]   = useState(null) // membre dont on affiche la fiche

  const handleCreated = (member, message) => {
    setShowAdd(false)
    setCreated({ member, message })
    setRefreshKey(k => k + 1)
  }

  const slugify = name => (name || 'membre').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const downloadBadge = async m => {
    setBadgeBusy(m.id); setBadgeError(null)
    try {
      await downloadFile(`/download/badge/${m.id}`, `badge-${slugify(m.full_name)}.pdf`)
    } catch (err) {
      setBadgeError(apiErrorMessage(err, "Impossible de générer le badge."))
    } finally { setBadgeBusy(null) }
  }

  const downloadAllBadges = async () => {
    setBadgeBusy('all'); setBadgeError(null)
    try {
      await downloadFile('/download/badges', 'badges-famille-respect.pdf')
    } catch (err) {
      setBadgeError(apiErrorMessage(err, "Impossible de générer les badges."))
    } finally { setBadgeBusy(null) }
  }

  // Badges vierges : QR pré-imprimés non liés — le membre est créé et lié
  // au premier scan sur le terrain (onboarding express).
  const generateBlankBadges = async () => {
    const raw = window.prompt('Combien de badges vierges générer ? (max 200)', '20')
    if (raw === null) return
    const count = parseInt(raw, 10)
    if (!count || count < 1 || count > 200) {
      setBadgeError('Quantité invalide (1 à 200).')
      return
    }
    setBadgeBusy('blank'); setBadgeError(null)
    try {
      const res = await api.post('/admin/badges/blank', { count })
      await downloadFile(res.data.download_path, `badges-vierges-${res.data.batch}.pdf`)
    } catch (err) {
      setBadgeError(apiErrorMessage(err, 'Impossible de générer les badges vierges.'))
    } finally { setBadgeBusy(null) }
  }

  useEffect(() => {
    setLoading(true)
    api.get('/admin/members', { params: { search, page } })
      .then(res => {
        setMembers(res.data.data)
        setMeta(res.data.meta)
        setStats(s => ({ ...s, total: res.data.meta?.total ?? res.data.data.length }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, page, refreshKey])

  return (
    <AdminLayout>
      <PageShell title="Member Directory" subtitle="Manage your community's active families and individuals.">

        {badgeError && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
            {badgeError}
          </div>
        )}

        {created && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="flex-1">{created.message}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadBadge(created.member)}
                disabled={badgeBusy === created.member.id}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60"
              >
                {badgeBusy === created.member.id
                  ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>}
                Télécharger le badge
              </button>
              <button onClick={() => setCreated(null)} className="text-emerald-700 hover:text-emerald-900 text-sm">✕</button>
            </div>
          </div>
        )}

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
            label="Sur cette page"
            value={members.length}
            sub="Membres affichés"
            iconWrap="bg-accent-soft text-accent-dark"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>}
          />
          {/* CTA card */}
          <button onClick={() => setShowAdd(true)} className="rounded-2xl p-5 text-left text-white flex flex-col justify-between shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark bg-brand min-h-[120px]">
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
            <button
              onClick={generateBlankBadges}
              disabled={badgeBusy === 'blank'}
              title="Générer et imprimer des badges vierges (liés au premier scan)"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-medium text-accent-dark border border-accent-dark/40 rounded-xl px-3 py-2 hover:bg-accent-soft transition-colors disabled:opacity-60"
            >
              {badgeBusy === 'blank'
                ? <span className="animate-spin h-4 w-4 border-2 border-accent-dark border-t-transparent rounded-full" />
                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm13-1h2v2h2v2h-2v2h-2v-2h-2v-2h2v-2z" /></svg>}
              Badges vierges
            </button>
            <button
              onClick={downloadAllBadges}
              disabled={badgeBusy === 'all'}
              title="Télécharger tous les badges en PDF"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-medium text-white rounded-xl px-3 py-2 transition-colors hover:bg-brand-dark bg-brand disabled:opacity-60"
            >
              {badgeBusy === 'all'
                ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>}
              Badges
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
                          <button onClick={() => setDetailId(m.id)} className="font-medium text-gray-900 hover:text-brand transition-colors text-left">
                            {m.full_name}
                          </button>
                          <div><span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">Active</span></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">Famille</td>
                    <td className="px-5 py-4 text-gray-700">{m.phone}</td>
                    <td className="px-5 py-4"><AttendanceBar pct={Math.min(100, (m.attendance_count || 0) * 10)} /></td>
                    <td className="px-5 py-4 text-gray-500">{m.created_at?.slice(0, 10)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => downloadBadge(m)}
                          disabled={badgeBusy === m.id}
                          title="Télécharger le badge"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-sand transition-colors disabled:opacity-50"
                        >
                          {badgeBusy === m.id
                            ? <span className="animate-spin h-4 w-4 border-2 border-brand border-t-transparent rounded-full" />
                            : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm12 0h2v2h-2v-2zm0 4h2v2h-2v-2zm-2-4h2v2h-2v-2zm4 0h2v2h-2v-2zm0 4h2v2h-2v-2z" /></svg>}
                        </button>
                        <button onClick={() => setDetailId(m.id)} title="Voir la fiche" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-sand transition-colors">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" /></svg>
                        </button>
                      </div>
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

        <AddMemberModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={handleCreated} />
        <MemberDetailModal memberId={detailId} onClose={() => setDetailId(null)} onDownloadBadge={downloadBadge} badgeBusy={badgeBusy} />
      </PageShell>
    </AdminLayout>
  )
}
