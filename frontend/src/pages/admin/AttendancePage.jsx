import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import Pagination from '../../components/Pagination'
import api from '../../lib/axios'

const todayStr = () => new Date().toISOString().slice(0, 10)

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

function StatCard({ icon, iconWrap = 'bg-brand/10 text-brand', label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconWrap}`}>{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AttendancePage() {
  const [rows, setRows]       = useState([])
  const [meta, setMeta]       = useState(null)
  const [events, setEvents]   = useState([])
  const [date, setDate]       = useState(todayStr())
  const [eventId, setEventId] = useState('')
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  // Liste des événements pour le filtre
  useEffect(() => {
    api.get('/admin/events')
      .then(res => setEvents(res.data.data || []))
      .catch(() => {})
  }, [])

  // Pointages selon les filtres
  useEffect(() => {
    setLoading(true)
    const params = { page }
    if (date) params.date = date
    if (eventId) params.event_id = eventId
    api.get('/admin/attendances', { params })
      .then(res => {
        setRows(res.data.data || [])
        setMeta(res.data.meta || null)
      })
      .catch(() => { setRows([]); setMeta(null) })
      .finally(() => setLoading(false))
  }, [date, eventId, page])

  const resetToday = () => { setDate(todayStr()); setEventId(''); setPage(1) }

  const selectedEvent = events.find(e => String(e.id) === String(eventId))
  const dateLabel = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Toutes dates'

  return (
    <AdminLayout>
      <PageShell title="Présences" subtitle="Suivez les pointages des membres par date et par événement.">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6">
          <StatCard
            label="Total pointages"
            value={(meta?.total ?? 0).toLocaleString()}
            sub="Pour le filtre actuel"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
          />
          <StatCard
            label="Date sélectionnée"
            value={dateLabel}
            iconWrap="bg-accent-soft text-accent-dark"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" /></svg>}
          />
          <StatCard
            label="Événement"
            value={selectedEvent ? selectedEvent.name : 'Tous'}
            iconWrap="bg-emerald-50 text-emerald-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>}
          />
        </div>

        {/* Barre de filtres */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm bg-sand border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Événement</label>
            <select
              value={eventId}
              onChange={e => { setEventId(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 text-sm bg-sand border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            >
              <option value="">Tous les événements</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:self-end">
            <button
              onClick={resetToday}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-sm font-medium text-white rounded-xl px-4 py-2 transition-colors hover:bg-brand-dark bg-brand"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Membre</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Événement</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Heure</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" />
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Aucun pointage pour ce filtre.</td></tr>
                ) : rows.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.member?.full_name} />
                        <div>
                          <p className="font-medium text-gray-900">{a.member?.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">{a.member?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-brand/10 text-brand px-2.5 py-1 rounded-full text-xs font-medium">{a.event?.name || 'Service'}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{a.attended_date}</td>
                    <td className="px-5 py-4 text-gray-500">{a.created_at?.slice(11, 16)}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        Présent
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} page={page} onChange={setPage} count={rows.length} label="pointage(s)" />
        </div>
      </PageShell>
    </AdminLayout>
  )
}
