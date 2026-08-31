import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import AddMemberModal from '../../components/AddMemberModal'
import Pagination from '../../components/Pagination'
import MemberDetailModal from '../../components/MemberDetailModal'
import Icon from '../../components/ui/Icon'
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
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconWrap}`}><Icon name={icon} size={22} /></div>
        {badge && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-[1.9rem] leading-none font-bold text-gray-900 mt-1.5 tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

/** Assiduité réelle : présences du membre ÷ nombre total d'événements. */
function AttendanceBar({ count = 0, total = 0 }) {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2" title={`${count} présence(s) sur ${total} événement(s)`}>
      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: count > 0 ? color : '#e5e7eb' }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{count}/{total || '—'}</span>
    </div>
  )
}

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [meta, setMeta]       = useState(null)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState({ total: 0, newThisMonth: 0, totalEvents: 0 })
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

  // Statistiques réelles (nouveaux du mois, nb d'événements pour l'assiduité)
  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setStats(s => ({
        ...s,
        newThisMonth: res.data.stats?.members_this_month ?? 0,
        totalEvents: res.data.stats?.total_events ?? 0,
      })))
      .catch(() => {})
  }, [refreshKey])

  return (
    <AdminLayout>
      <PageShell title="Membres" subtitle="Gérez les membres de votre organisation.">

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
                  : <Icon name="download" size={18} />}
                Télécharger le badge
              </button>
              <button onClick={() => setCreated(null)} className="text-emerald-700 hover:text-emerald-900 text-sm">✕</button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-6">
          <StatCard
            label="Total des membres"
            value={stats.total.toLocaleString('fr-FR')}
            icon="groups"
          />
          <StatCard
            label="Nouveaux ce mois-ci"
            value={stats.newThisMonth}
            sub="Inscriptions du mois"
            iconWrap="bg-emerald-50 text-emerald-600"
            icon="person_add"
          />
          <StatCard
            label="Sur cette page"
            value={members.length}
            sub="Membres affichés"
            iconWrap="bg-accent-soft text-accent-dark"
            icon="visibility"
          />
          {/* CTA card */}
          <button onClick={() => setShowAdd(true)} className="group rounded-2xl p-5 text-left text-white flex flex-col justify-between shadow-lg shadow-brand/20 hover:bg-brand-dark hover:-translate-y-0.5 bg-brand min-h-[120px]">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-3 transition-transform group-hover:scale-110">
              <Icon name="person_add" size={22} />
            </div>
            <span className="font-semibold flex items-center gap-1">Ajouter un membre <Icon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-0.5" /></span>
          </button>
        </div>

        {/* Search toolbar */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Icon name="search" size={20} /></span>
            <input
              type="text"
              placeholder="Rechercher par nom ou téléphone…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-sand border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setBadgeBusy('cards'); setBadgeError(null)
                try { await downloadFile('/download/cards', 'cartes-membres.pdf') }
                catch (err) { setBadgeError(apiErrorMessage(err, 'Impossible de générer les cartes.')) }
                finally { setBadgeBusy(null) }
              }}
              disabled={badgeBusy === 'cards'}
              title="Imprimer les cartes de membre design (format carte de visite)"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-sand transition-colors disabled:opacity-60"
            >
              {badgeBusy === 'cards'
                ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                : <Icon name="badge" size={18} />}
              Cartes
            </button>
            <button
              onClick={downloadAllBadges}
              disabled={badgeBusy === 'all'}
              title="Télécharger les badges nominatifs des membres existants"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-sand transition-colors disabled:opacity-60"
            >
              {badgeBusy === 'all'
                ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                : <Icon name="download" size={18} />}
              Badges
            </button>
            {/* CTA principal : le flow idéal du système (badges pré-imprimés) */}
            <button
              onClick={generateBlankBadges}
              disabled={badgeBusy === 'blank'}
              title="Générer et imprimer des badges vierges — liés aux membres au premier scan"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl px-4 py-2 transition-colors bg-accent-dark hover:bg-accent shadow-lg shadow-accent-dark/25 disabled:opacity-60"
            >
              {badgeBusy === 'blank'
                ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                : <Icon name="qr_code_2" size={18} />}
              Générer badges vierges
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Membre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Téléphone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Assiduité</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Inscrit le</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" />
                  </td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Aucun membre trouvé.</td></tr>
                ) : members.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name} />
                        <button onClick={() => setDetailId(m.id)} className="font-medium text-gray-900 hover:text-brand transition-colors text-left">
                          {m.full_name}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{m.phone || '—'}</td>
                    <td className="px-5 py-4">
                      <AttendanceBar
                        count={m.attendance_count || 0}
                        total={stats.totalEvents}
                      />
                    </td>
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
                            : <Icon name="qr_code_2" size={20} />}
                        </button>
                        <button onClick={() => setDetailId(m.id)} title="Voir la fiche" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-sand transition-colors">
                          <Icon name="visibility" size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} page={page} onChange={setPage} count={members.length} label="membre(s)" />
        </div>

        <AddMemberModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={handleCreated} />
        <MemberDetailModal memberId={detailId} onClose={() => setDetailId(null)} onDownloadBadge={downloadBadge} badgeBusy={badgeBusy} />
      </PageShell>
    </AdminLayout>
  )
}
