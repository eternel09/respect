import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import api, { apiErrorMessage } from '../../lib/axios'

export const OCC_TYPES = {
  mariage:      { label: 'Mariage',      emoji: '💍', color: '#e08a3c' },
  gala:         { label: 'Gala',         emoji: '🥂', color: '#1e3a5f' },
  ceremonie:    { label: 'Cérémonie',    emoji: '🎓', color: '#059669' },
  anniversaire: { label: 'Anniversaire', emoji: '🎂', color: '#c9742b' },
  concert:      { label: 'Concert',      emoji: '🎵', color: '#7c3aed' },
  autre:        { label: 'Autre',        emoji: '📅', color: '#6b7280' },
}

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

function Tile({ icon, wrap, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${wrap}`}>{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function OccasionsPage() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api.get('/occasions')
      .then(res => setItems(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const totalGuests   = items.reduce((s, o) => s + (o.guests_count || 0), 0)
  const totalInvited  = items.reduce((s, o) => s + (o.invited_count || 0), 0)
  const totalConfirmed = items.reduce((s, o) => s + (o.confirmed_count || 0), 0)
  const upcoming = items.filter(o => !o.is_expired).length

  return (
    <AdminLayout>
      <PageShell title="Événements" subtitle="Mariages, galas et cérémonies — invités, plan de salle et invitations.">
        <div className="flex justify-end -mt-14 mb-6">
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-accent-dark hover:bg-accent rounded-xl px-4 py-2.5 shadow-lg shadow-accent-dark/25 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" /></svg>
            Nouvel événement
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-6">
          <Tile wrap="bg-brand/10 text-brand" label="Événements à venir" value={upcoming} sub={`sur ${items.length} au total`}
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>} />
          <Tile wrap="bg-accent-soft text-accent-dark" label="Invités (tous événements)" value={totalGuests.toLocaleString('fr-FR')}
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>} />
          <Tile wrap="bg-amber-50 text-amber-700" label="Invitations envoyées" value={totalInvited.toLocaleString('fr-FR')}
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5z" /></svg>} />
          <Tile wrap="bg-emerald-50 text-emerald-600" label="Confirmations reçues" value={totalConfirmed.toLocaleString('fr-FR')}
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>} />
        </div>

        {loading ? (
          <div className="py-16 text-center"><span className="inline-block animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-black/5 p-12 text-center text-gray-400">
            Aucun événement pour l'instant. Créez votre premier mariage, gala ou cérémonie.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {items.map(o => {
              const t = OCC_TYPES[o.type] || OCC_TYPES.autre
              const pct = o.guests_count ? Math.round((o.invited_count || 0) / o.guests_count * 100) : 0
              return (
                <button key={o.id} onClick={() => navigate(`/events/${o.id}`)}
                  className="relative text-left bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all overflow-hidden">
                  <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: t.color }} />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                    style={{ background: t.color + '22', color: t.color }}>{t.emoji} {t.label}</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-3">{o.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                    <span>📅 {fmtDate(o.date)}</span>
                    {o.location && <span>📍 {o.location}</span>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-[11.5px] text-gray-500 mb-1.5">
                      <span>{o.guests_count} invités · {o.tables_count} tables</span>
                      <span>{pct}% envoyées</span>
                    </div>
                    <div className="h-1.5 bg-sand rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {showCreate && <CreateOccasionModal onClose={() => setShowCreate(false)} onCreated={(o) => navigate(`/events/${o.id}`)} />}
      </PageShell>
    </AdminLayout>
  )
}

function CreateOccasionModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', type: 'mariage', date: '', starts_at: '', ends_at: '', location: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const payload = { ...form }
      // datetime-local → ISO (optionnels)
      if (!payload.starts_at) delete payload.starts_at
      if (!payload.ends_at) delete payload.ends_at
      const res = await api.post('/occasions', payload)
      onCreated(res.data)
    } catch (err) {
      const d = err.response?.data
      setError(d?.errors ? Object.values(d.errors)[0][0] : apiErrorMessage(err, 'Création impossible.'))
      setSaving(false)
    }
  }

  const input = 'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 sm:p-7" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900">Nouvel événement</h2>
        <p className="text-sm text-gray-500 mb-5">Mariage, gala, cérémonie… vous ajouterez ensuite le plan de salle et les invités.</p>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'événement</label>
            <input className={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mariage Sarah & David" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(OCC_TYPES).map(([k, t]) => (
                <button type="button" key={k} onClick={() => set('type', k)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${form.type === k ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:bg-sand'}`}
                  style={form.type === k ? { background: t.color } : {}}>{t.emoji} {t.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input type="date" className={input} value={form.date} onChange={e => set('date', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Lieu</label>
              <input className={input} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Salle Bonanza" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Début <span className="text-gray-400 font-normal">(opt.)</span></label>
              <input type="datetime-local" className={input} value={form.starts_at} onChange={e => set('starts_at', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Fin <span className="text-gray-400 font-normal">(opt.)</span></label>
              <input type="datetime-local" className={input} value={form.ends_at} onChange={e => set('ends_at', e.target.value)} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white bg-accent-dark hover:bg-accent transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Créer l'événement
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
