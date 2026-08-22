import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import api, { apiErrorMessage } from '../../lib/axios'
import { OCC_TYPES } from './OccasionsPage'

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null

const INVITE = {
  pending: ['En attente', 'bg-amber-50 text-amber-700'],
  queued:  ['En file',    'bg-amber-50 text-amber-700'],
  sent:    ['Envoyée',    'bg-emerald-50 text-emerald-700'],
  failed:  ['Échec',      'bg-red-50 text-red-600'],
}
const Pill = ({ children, cls }) => <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full ${cls}`}>{children}</span>

export default function OccasionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null) // { occasion, tables, guests }
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('plan')
  const [modal, setModal] = useState(null) // 'table' | 'guest'
  const [err, setErr] = useState(null)
  const [sending, setSending] = useState(false)
  const [resendId, setResendId] = useState(null)
  const [flash, setFlash] = useState(null) // { ok: bool, text }
  const [bgBusy, setBgBusy] = useState(false)
  const bgInputRef = useRef(null)

  const load = useCallback(() => {
    api.get(`/occasions/${id}`)
      .then(res => setData(res.data))
      .catch(e => setErr(apiErrorMessage(e, 'Événement introuvable.')))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(load, [load])

  const assign = async (guestId, tableId) => {
    await api.put(`/guests/${guestId}`, { occasion_table_id: tableId || null })
    load()
  }
  const delGuest = async (guestId) => { if (confirm('Supprimer cet invité ?')) { await api.delete(`/guests/${guestId}`); load() } }

  const sendInvites = async () => {
    if (!confirm('Envoyer les invitations WhatsApp aux invités pas encore contactés ?')) return
    setSending(true); setFlash(null)
    try {
      const res = await api.post(`/occasions/${id}/send-invitations`)
      setFlash({ ok: true, text: res.data.message || 'Invitations envoyées.' })
      load()
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, "Échec de l'envoi des invitations.") })
    } finally { setSending(false) }
  }

  const uploadBg = async (file) => {
    if (bgInputRef.current) bgInputRef.current.value = '' // permet de re-choisir le même fichier
    if (!file) return
    setBgBusy(true); setFlash(null)
    try {
      const fd = new FormData(); fd.append('invitation', file)
      const res = await api.post(`/occasions/${id}/invitation-bg`, fd)
      setFlash({ ok: true, text: res.data.message || "Carton d'invitation enregistré." })
      load()
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du téléversement.') })
    } finally { setBgBusy(false) }
  }

  const removeBg = async () => {
    if (!confirm('Retirer le carton personnalisé ? Les invitations reprendront le design par défaut.')) return
    setBgBusy(true); setFlash(null)
    try {
      await api.delete(`/occasions/${id}/invitation-bg`)
      setFlash({ ok: true, text: "Carton d'invitation retiré." })
      load()
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du retrait.') })
    } finally { setBgBusy(false) }
  }

  const resend = async (guestId) => {
    setResendId(guestId); setFlash(null)
    try {
      const res = await api.post(`/guests/${guestId}/invite`)
      setFlash({ ok: true, text: res.data.message || 'Invitation envoyée.' })
      load()
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, "Échec de l'envoi.") })
    } finally { setResendId(null) }
  }

  if (loading) return <AdminLayout><div className="p-10 text-center"><span className="inline-block animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div></AdminLayout>
  if (err || !data) return <AdminLayout><div className="p-10 text-center text-gray-400">{err}</div></AdminLayout>

  const { occasion: o, tables, guests } = data
  const t = OCC_TYPES[o.type] || OCC_TYPES.autre

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <button onClick={() => navigate('/events')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" /></svg>Tous les événements
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 mb-5 flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ background: t.color + '22', color: t.color }}>{t.emoji} {t.label}</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2.5 tracking-tight">{o.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
              <span>📅 {fmtDate(o.date)}{fmtTime(o.starts_at) && ` · ${fmtTime(o.starts_at)}${fmtTime(o.ends_at) ? ' → ' + fmtTime(o.ends_at) : ''}`}</span>
              {o.location && <span>📍 {o.location}</span>}
            </div>
          </div>
          <button onClick={sendInvites} disabled={sending} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5b] rounded-xl px-4 py-2.5 transition-colors flex-shrink-0 disabled:opacity-60">
            {sending
              ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11.8 11.8 0 0 0 12 0C5.5 0 .16 5.33.16 11.9c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45c6.55 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.16-3.43-8.4z" /></svg>}
            {sending ? 'Envoi en cours…' : 'Envoyer les invitations'}
          </button>
        </div>

        {flash && (
          <div className={`mb-5 px-4 py-3 rounded-xl text-sm border ${flash.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {flash.text}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[['Invités', o.guests_count, `${o.tables_count} tables`, 'text-gray-900'],
            ['Invitations envoyées', o.invited_count, `${o.guests_count - (o.invited_count || 0)} en attente`, 'text-gray-900'],
            ['Confirmés', o.confirmed_count, 'réponses reçues', 'text-emerald-600'],
            ['Présents (jour J)', o.is_expired || o.checked_in_count ? o.checked_in_count : '—', o.is_expired ? 'événement passé' : 'à venir', 'text-gray-900']].map(([l, v, s, c]) => (
            <div key={l} className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5">
              <p className="text-sm text-gray-500">{l}</p>
              <p className={`text-2xl font-bold mt-1 ${c}`}>{v ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s}</p>
            </div>
          ))}
        </div>

        {/* Carton d'invitation personnalisé */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 mb-6 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">Carton d'invitation</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Téléversez votre visuel : l'app y ajoute automatiquement le QR code et le nom de chaque invité. Le même carton sert à tout l'événement. Sans carton, un design par défaut est généré.
            </p>
            <input ref={bgInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={e => uploadBg(e.target.files?.[0])} />
            <div className="flex flex-wrap gap-3 mt-3">
              <button onClick={() => bgInputRef.current?.click()} disabled={bgBusy}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 disabled:opacity-60">
                {bgBusy
                  ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>}
                {o.invitation_bg_url ? 'Remplacer le carton' : 'Téléverser un carton'}
              </button>
              {o.invitation_bg_url && (
                <button onClick={removeBg} disabled={bgBusy}
                  className="text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-sand disabled:opacity-60">
                  Retirer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">PNG, JPG ou WEBP — 4 Mo max. Portrait recommandé. Laissez de la place en bas (le QR et le nom s'y posent).</p>
          </div>
          {o.invitation_bg_url
            ? <img src={o.invitation_bg_url} alt="Carton d'invitation" className="w-24 h-32 object-cover rounded-xl ring-1 ring-black/10 flex-shrink-0" />
            : <div className="w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-[11px] text-center px-2 flex-shrink-0">Aucun carton</div>}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-5">
          {[['plan', 'Plan de salle'], ['guests', `Invités · ${guests.length}`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`pb-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors ${tab === k ? 'text-brand border-accent' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>

        {/* Plan de salle */}
        {tab === 'plan' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{tables.length} table(s) — assignez les invités depuis l'onglet Invités.</p>
              <button onClick={() => setModal('table')} className="text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-sand">+ Ajouter une table</button>
            </div>
            {tables.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-black/5 p-10 text-center text-gray-400">Aucune table. Ajoutez les tables de votre plan de salle.</div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                {tables.map(tb => {
                  const full = tb.occupied >= tb.seats
                  return (
                    <div key={tb.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
                      <div className={`w-14 h-14 mx-auto mb-2.5 rounded-full flex items-center justify-center font-extrabold text-lg ${full ? 'border-2 border-emerald-500 text-emerald-600' : 'border-2 border-dashed border-gray-300 text-brand'}`}>{tb.label.length > 3 ? '★' : tb.label}</div>
                      <div className="text-sm font-bold text-gray-800">{/^\d+$/.test(tb.label) ? 'Table ' + tb.label : tb.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tb.occupied}/{tb.seats} places</div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Invités */}
        {tab === 'guests' && (
          <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Liste des invités</h3>
              <button onClick={() => setModal('guest')} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-xl px-3.5 py-2">+ Ajouter</button>
            </div>
            {guests.length === 0 ? (
              <div className="p-10 text-center text-gray-400">Aucun invité. Ajoutez-les un par un ou par import.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead><tr className="border-b border-gray-100">
                    {['Invité', 'Téléphone', 'Table', 'Invitation', 'Confirmation', ''].map(h => <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {guests.map(g => {
                      const [il, ic] = INVITE[g.invite_status] || INVITE.pending
                      return (
                        <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-sand/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{g.name}</td>
                          <td className="px-4 py-3 text-gray-500">{g.phone || '—'}</td>
                          <td className="px-4 py-3">
                            <select value={g.occasion_table_id || ''} onChange={e => assign(g.id, e.target.value)}
                              className="text-[13px] bg-cream border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand/30">
                              <option value="">— non assignée</option>
                              {tables.map(tb => <option key={tb.id} value={tb.id}>{/^\d+$/.test(tb.label) ? 'Table ' + tb.label : tb.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3"><Pill cls={ic}>{il}</Pill></td>
                          <td className="px-4 py-3">
                            {g.confirmed ? <Pill cls="bg-emerald-50 text-emerald-700">Confirmé</Pill>
                              : g.declined ? <Pill cls="bg-red-50 text-red-600">Décliné</Pill>
                              : <Pill cls="bg-cream text-gray-500 border border-gray-200">Sans réponse</Pill>}
                            {g.checked_in && <span className="ml-2"><Pill cls="bg-emerald-50 text-emerald-700">✓ Présent</Pill></span>}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {g.phone && (
                              <button onClick={() => resend(g.id)} disabled={resendId === g.id}
                                className="text-[#25D366] hover:text-[#1ebe5b] mr-3 align-middle disabled:opacity-50"
                                title={g.invite_status === 'sent' ? "Renvoyer l'invitation" : "Envoyer l'invitation"}>
                                {resendId === g.id
                                  ? <span className="inline-block animate-spin h-4 w-4 border-2 border-[#25D366] border-t-transparent rounded-full align-middle" />
                                  : <svg className="w-4 h-4 inline align-middle" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg>}
                              </button>
                            )}
                            <button onClick={() => delGuest(g.id)} className="text-gray-300 hover:text-red-500 align-middle" title="Supprimer">
                              <svg className="w-4 h-4 inline align-middle" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {modal === 'table' && <AddTableModal occasionId={id} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
        {modal === 'guest' && <AddGuestModal occasionId={id} tables={tables} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
      </div>
    </AdminLayout>
  )
}

function Shell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>{children}
      </div>
    </div>
  )
}
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

function AddTableModal({ occasionId, onClose, onDone }) {
  const [label, setLabel] = useState(''); const [seats, setSeats] = useState(8)
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null)
  const submit = async (e) => { e.preventDefault(); setSaving(true); setErr(null)
    try { await api.post(`/occasions/${occasionId}/tables`, { label, seats: Number(seats) }); onDone() }
    catch (e2) { setErr(apiErrorMessage(e2, 'Ajout impossible.')); setSaving(false) } }
  return (
    <Shell title="Ajouter une table" onClose={onClose}>
      {err && <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
          <input className={inputCls} value={label} onChange={e => setLabel(e.target.value)} placeholder="Honneur, 7, A3…" autoFocus /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre de places</label>
          <input type="number" min="1" max="100" className={inputCls} value={seats} onChange={e => setSeats(e.target.value)} /></div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-60">Ajouter</button>
        </div>
      </form>
    </Shell>
  )
}

function AddGuestModal({ occasionId, tables, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', phone: '', occasion_table_id: '' })
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = async (e) => { e.preventDefault(); setSaving(true); setErr(null)
    try {
      const p = { name: form.name, phone: form.phone || null }
      if (form.occasion_table_id) p.occasion_table_id = Number(form.occasion_table_id)
      await api.post(`/occasions/${occasionId}/guests`, p); onDone()
    } catch (e2) { const d = e2.response?.data; setErr(d?.errors ? Object.values(d.errors)[0][0] : apiErrorMessage(e2)); setSaving(false) } }
  return (
    <Shell title="Ajouter un invité" onClose={onClose}>
      {err && <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Grâce Nkosi" autoFocus /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone WhatsApp <span className="text-gray-400 font-normal">(opt.)</span></label>
          <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+243 8X XXX XXXX" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Table <span className="text-gray-400 font-normal">(opt.)</span></label>
          <select className={inputCls} value={form.occasion_table_id} onChange={e => set('occasion_table_id', e.target.value)}>
            <option value="">— non assignée</option>
            {tables.map(tb => <option key={tb.id} value={tb.id}>{/^\d+$/.test(tb.label) ? 'Table ' + tb.label : tb.label}</option>)}
          </select></div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-60">Ajouter</button>
        </div>
      </form>
    </Shell>
  )
}
