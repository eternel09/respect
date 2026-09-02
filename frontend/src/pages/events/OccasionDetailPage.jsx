import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import Icon from '../../components/ui/Icon'
import api, { apiErrorMessage } from '../../lib/axios'
import { OCC_TYPES } from './OccasionsPage'
import { useAuth } from '../../context/AuthContext'

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
  const { user } = useAuth()
  // Agent confiné à cet événement (accueil/gestion) : masque les actions
  // réservées à l'organisateur. La gestion d'équipe est réservée à l'admin.
  const isEventAgent = !!user?.occasion_id
  const canManageTeam = user?.role === 'admin' && !isEventAgent
  const [data, setData] = useState(null) // { occasion, tables, guests }
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('plan')
  const [modal, setModal] = useState(null) // 'table' | 'guest' | 'import'
  const [editTable, setEditTable] = useState(null) // table en cours de renommage
  const [err, setErr] = useState(null)
  const [sending, setSending] = useState(false)
  const [resendId, setResendId] = useState(null)
  const [flash, setFlash] = useState(null) // { ok: bool, text }
  const [bgBusy, setBgBusy] = useState(false)
  const bgInputRef = useRef(null)
  const [preview, setPreview] = useState(null) // { loading, url, error }
  const [videoBusy, setVideoBusy] = useState(false)
  const videoInputRef = useRef(null)

  const load = useCallback(() => {
    api.get(`/occasions/${id}`)
      .then(res => setData(res.data))
      .catch(e => setErr(apiErrorMessage(e, 'Événement introuvable.')))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(load, [load])
  // Libère l'URL blob de l'aperçu quand elle change ou au démontage.
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview?.url])

  const assign = async (guestId, tableId) => {
    await api.put(`/guests/${guestId}`, { occasion_table_id: tableId || null })
    load()
  }
  const delGuest = async (guestId) => { if (confirm('Supprimer cet invité ?')) { await api.delete(`/guests/${guestId}`); load() } }
  const delTable = async (tb) => {
    if (!confirm(`Supprimer la table « ${tb.label} » ? Les invités assignés redeviennent « non assignés ».`)) return
    try { await api.delete(`/occasion-tables/${tb.id}`); load() }
    catch (e) { setFlash({ ok: false, text: apiErrorMessage(e, 'Suppression impossible.') }) }
  }

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
      const res = await api.post(`/occasions/${id}/invitation-bg`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
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

  const uploadVideo = async (file) => {
    if (videoInputRef.current) videoInputRef.current.value = ''
    if (!file) return
    setVideoBusy(true); setFlash(null)
    try {
      const fd = new FormData(); fd.append('video', file)
      const res = await api.post(`/occasions/${id}/rsvp-video`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFlash({ ok: true, text: res.data.message || 'Vidéo enregistrée.' })
      load()
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du téléversement de la vidéo.') })
    } finally { setVideoBusy(false) }
  }

  const removeVideo = async () => {
    if (!confirm('Retirer la vidéo du couple ?')) return
    setVideoBusy(true); setFlash(null)
    try {
      await api.delete(`/occasions/${id}/rsvp-video`)
      setFlash({ ok: true, text: 'Vidéo retirée.' })
      load()
    } catch (e) {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Échec du retrait.') })
    } finally { setVideoBusy(false) }
  }

  const openPreview = async () => {
    setPreview({ loading: true, url: null, error: null })
    try {
      const res = await api.get(`/occasions/${id}/invitation-preview`, { responseType: 'blob' })
      setPreview({ loading: false, url: URL.createObjectURL(res.data), error: null })
    } catch (e) {
      const msg = e.response?.status === 503
        ? 'Service WhatsApp injoignable — l’aperçu nécessite que le service soit démarré.'
        : "Échec de la génération de l’aperçu."
      setPreview({ loading: false, url: null, error: msg })
    }
  }

  const closePreview = () => {
    setPreview(p => { if (p?.url) URL.revokeObjectURL(p.url); return null })
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
          <Icon name="arrow_back" size={18} />Tous les événements
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 mb-5 flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ background: t.color + '22', color: t.color }}>{t.emoji} {t.label}</span>
            <h1 className="font-display text-[1.9rem] font-medium text-gray-900 mt-2.5 tracking-tight">{o.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
              <span>📅 {fmtDate(o.date)}{fmtTime(o.starts_at) && ` · ${fmtTime(o.starts_at)}${fmtTime(o.ends_at) ? ' → ' + fmtTime(o.ends_at) : ''}`}</span>
              {o.location && <span>📍 {o.location}</span>}
            </div>
          </div>
          {!isEventAgent && (
            <button onClick={sendInvites} disabled={sending} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5b] rounded-xl px-4 py-2.5 transition-colors flex-shrink-0 disabled:opacity-60">
              {sending
                ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                : <Icon name="send" size={18} />}
              {sending ? 'Envoi en cours…' : 'Envoyer les invitations'}
            </button>
          )}
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

        {!isEventAgent && (<>
        {/* Carton d'invitation personnalisé */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 mb-6 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">Carton d'invitation</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Téléversez votre visuel : l'app y ajoute automatiquement le QR code et le nom de chaque invité. Le même carton sert à tout l'événement. Sans carton, un design par défaut est généré.
            </p>
            <input ref={bgInputRef} type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf"
              className="hidden" onChange={e => uploadBg(e.target.files?.[0])} />
            <div className="flex flex-wrap gap-3 mt-3">
              <button onClick={() => bgInputRef.current?.click()} disabled={bgBusy}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 disabled:opacity-60">
                {bgBusy
                  ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  : <Icon name="upload" size={18} />}
                {o.invitation_bg_url ? 'Remplacer le carton' : 'Téléverser un carton'}
              </button>
              {o.invitation_bg_url && (
                <button onClick={removeBg} disabled={bgBusy}
                  className="text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-sand disabled:opacity-60">
                  Retirer
                </button>
              )}
              <button onClick={openPreview} disabled={bgBusy}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-sand disabled:opacity-60">
                <Icon name="visibility" size={18} />
                Aperçu
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG, WEBP, HEIC (iPhone) ou PDF — 12 Mo max. Portrait recommandé. Laissez de la place en bas (le QR et le nom s'y posent).</p>
          </div>
          {o.invitation_bg_url
            ? <img src={o.invitation_bg_url} alt="Carton d'invitation" className="w-24 h-32 object-cover rounded-xl ring-1 ring-black/10 flex-shrink-0" />
            : <div className="w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-[11px] text-center px-2 flex-shrink-0">Aucun carton</div>}
        </div>

        {/* Vidéo du couple (page de confirmation) */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 mb-6 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">Vidéo du couple</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Montrée à l'invité sur la page de confirmation, quand il ouvre le lien reçu dans l'invitation. Format vertical (short) recommandé.
            </p>
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" className="hidden"
              onChange={e => uploadVideo(e.target.files?.[0])} />
            <div className="flex flex-wrap gap-3 mt-3">
              <button onClick={() => videoInputRef.current?.click()} disabled={videoBusy}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 disabled:opacity-60">
                {videoBusy
                  ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  : <Icon name="videocam" size={18} />}
                {o.rsvp_video_url ? 'Remplacer la vidéo' : 'Téléverser une vidéo'}
              </button>
              {o.rsvp_video_url && (
                <button onClick={removeVideo} disabled={videoBusy}
                  className="text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-sand disabled:opacity-60">
                  Retirer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">MP4, MOV ou WEBM — 100 Mo max.</p>
          </div>
          {o.rsvp_video_url
            ? <video src={o.rsvp_video_url} className="w-24 h-32 object-cover rounded-xl ring-1 ring-black/10 bg-black flex-shrink-0" muted playsInline preload="metadata" />
            : <div className="w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-[11px] text-center px-2 flex-shrink-0">Aucune vidéo</div>}
        </div>
        </>)}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-5">
          {[['plan', 'Plan de salle'], ['guests', `Invités · ${guests.length}`], ...(canManageTeam ? [['team', 'Équipe']] : [])].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`pb-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors ${tab === k ? 'text-brand border-accent' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>

        {/* Plan de salle */}
        {tab === 'plan' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{tables.length} table(s) — assignez les invités depuis l'onglet Invités.</p>
              {!isEventAgent && (
                <button onClick={() => setModal('table')} className="text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-sand">+ Ajouter une table</button>
              )}
            </div>
            {tables.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-black/5 p-10 text-center text-gray-400">Aucune table. Ajoutez les tables de votre plan de salle.</div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                {tables.map(tb => {
                  const full = tb.occupied >= tb.seats
                  return (
                    <div key={tb.id} className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
                      {!isEventAgent && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button onClick={() => setEditTable(tb)} title="Renommer / modifier"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand hover:bg-sand">
                            <Icon name="edit" size={16} />
                          </button>
                          <button onClick={() => delTable(tb)} title="Supprimer la table"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      )}
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
              <button onClick={() => setModal('import')} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl px-3.5 py-2 hover:bg-sand">
                <Icon name="upload_file" size={18} />
                Importer Excel
              </button>
              <button onClick={() => setModal('guest')} className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-xl px-3.5 py-2">+ Ajouter</button>
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
                                  : <Icon name="send" size={18} className="inline align-middle" />}
                              </button>
                            )}
                            <button onClick={() => delGuest(g.id)} className="text-gray-300 hover:text-red-500 align-middle" title="Supprimer">
                              <Icon name="delete" size={18} className="inline align-middle" />
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

        {/* Équipe de l'événement */}
        {tab === 'team' && canManageTeam && <TeamPanel occasionId={id} />}

        {modal === 'table' && <AddTableModal occasionId={id} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
        {editTable && <AddTableModal occasionId={id} table={editTable} onClose={() => setEditTable(null)} onDone={() => { setEditTable(null); load() }} />}
        {modal === 'guest' && <AddGuestModal occasionId={id} tables={tables} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
        {modal === 'import' && <ImportGuestsModal occasionId={id} onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}

        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={closePreview}>
            <div className="bg-white rounded-2xl shadow-xl p-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Aperçu de l'invitation</h3>
                <button onClick={closePreview} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
              </div>
              {preview.loading && (
                <div className="py-16 text-center">
                  <span className="inline-block animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-500 mt-3">Génération de l'aperçu…</p>
                </div>
              )}
              {preview.error && <div className="py-8 px-3 text-center text-sm text-red-600">{preview.error}</div>}
              {preview.url && <img src={preview.url} alt="Aperçu de l'invitation" className="w-full rounded-xl ring-1 ring-black/10" />}
              {preview.url && <p className="text-xs text-gray-400 mt-3 text-center">Exemple avec un invité. Le QR et le nom réels sont posés à l'envoi.</p>}
            </div>
          </div>
        )}
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

function AddTableModal({ occasionId, table = null, onClose, onDone }) {
  const editing = !!table
  const [label, setLabel] = useState(table?.label ?? ''); const [seats, setSeats] = useState(table?.seats ?? 8)
  const [saving, setSaving] = useState(false); const [err, setErr] = useState(null)
  const submit = async (e) => { e.preventDefault(); setSaving(true); setErr(null)
    try {
      if (editing) await api.put(`/occasion-tables/${table.id}`, { label, seats: Number(seats) })
      else await api.post(`/occasions/${occasionId}/tables`, { label, seats: Number(seats) })
      onDone()
    }
    catch (e2) { setErr(apiErrorMessage(e2, editing ? 'Modification impossible.' : 'Ajout impossible.')); setSaving(false) } }
  return (
    <Shell title={editing ? 'Modifier la table' : 'Ajouter une table'} onClose={onClose}>
      {err && <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
          <input className={inputCls} value={label} onChange={e => setLabel(e.target.value)} placeholder="Honneur, 7, A3…" autoFocus /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre de places</label>
          <input type="number" min="1" max="100" className={inputCls} value={seats} onChange={e => setSeats(e.target.value)} /></div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-60">{editing ? 'Enregistrer' : 'Ajouter'}</button>
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

/* ── Import Excel des invités ─────────────────────────────────────────── */
const norm = (h) => String(h ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const findCol = (headers, patterns) => headers.findIndex(h => patterns.some(p => norm(h).includes(p)))

function ColSelect({ label, value, onChange, optional, headers }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{optional && <span className="text-gray-400 font-normal"> (opt.)</span>}</label>
      <select className={inputCls} value={value} onChange={e => onChange(Number(e.target.value))}>
        {optional && <option value={-1}>— aucune</option>}
        {headers.map((h, i) => <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>)}
      </select>
    </div>
  )
}

function ImportGuestsModal({ occasionId, onClose, onDone }) {
  const [headers, setHeaders] = useState(null)   // libellés de colonnes
  const [rows, setRows] = useState([])           // lignes de données (tableaux)
  const [map, setMap] = useState({ first: -1, name: -1, phone: -1 })
  const [error, setError] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const onFile = async (file) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setError(null); setParsing(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
      const nonEmpty = aoa.filter(r => r.some(c => String(c).trim() !== ''))
      if (nonEmpty.length < 2) { setError('Le fichier semble vide ou ne contient pas de données sous les entêtes.'); return }
      const hs = nonEmpty[0].map(h => String(h).trim())
      const nameIdx = findCol(hs, ['nom complet', 'invite', 'name', 'guest'])
      const firstIdx = findCol(hs, ['prenom'])
      const lastIdx = findCol(hs, ['nom'])
      const phoneIdx = findCol(hs, ['tel', 'phone', 'whatsapp', 'numero', 'contact', 'gsm', 'mobile'])
      setHeaders(hs)
      setRows(nonEmpty.slice(1))
      setMap({
        first: nameIdx < 0 && firstIdx >= 0 ? firstIdx : -1,
        name: nameIdx >= 0 ? nameIdx : (lastIdx >= 0 ? lastIdx : 0),
        phone: phoneIdx,
      })
    } catch {
      setError('Impossible de lire ce fichier. Utilisez un .xlsx, .xls ou .csv.')
    } finally { setParsing(false) }
  }

  const guests = useMemo(() => {
    if (!headers) return []
    return rows.map(r => {
      const first = map.first >= 0 ? String(r[map.first] ?? '').trim() : ''
      const last = map.name >= 0 ? String(r[map.name] ?? '').trim() : ''
      const name = `${first} ${last}`.trim()
      const phone = map.phone >= 0 ? String(r[map.phone] ?? '').trim() : ''
      return { name, phone: phone || null }
    }).filter(g => g.name)
  }, [headers, rows, map])

  const submit = async () => {
    if (guests.length === 0) { setError('Aucun invité valide (la colonne du nom est-elle bien choisie ?).'); return }
    setSaving(true); setError(null)
    try {
      for (let i = 0; i < guests.length; i += 500) {
        await api.post(`/occasions/${occasionId}/guests/bulk`, { guests: guests.slice(i, i + 500) })
      }
      onDone()
    } catch (e) {
      setError(apiErrorMessage(e, "Échec de l'import."))
      setSaving(false)
    }
  }

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([['Nom complet', 'Téléphone'], ['Grâce Nkosi', '+243 81 234 5678']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Invités')
    XLSX.writeFile(wb, 'modele-invites.xlsx')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Importer des invités (Excel)</h2>
        <p className="text-sm text-gray-500 mb-4">Un fichier .xlsx, .xls ou .csv avec une ligne d'entête. L'app détecte les colonnes ; vous pouvez les ajuster.</p>

        {error && <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600">{error}</div>}

        {!headers ? (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden"
              onChange={e => onFile(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={parsing}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand hover:bg-sand text-gray-500 flex flex-col items-center gap-2 disabled:opacity-60">
              {parsing
                ? <span className="animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" />
                : <Icon name="upload_file" size={28} className="text-gray-400" />}
              <span className="text-sm font-medium">{parsing ? 'Lecture…' : 'Choisir un fichier'}</span>
            </button>
            <button onClick={downloadTemplate} className="mt-3 text-sm text-brand font-medium hover:underline">Télécharger un modèle Excel</button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ColSelect label="Prénom" optional headers={headers} value={map.first} onChange={v => setMap(m => ({ ...m, first: v }))} />
              <ColSelect label="Nom" headers={headers} value={map.name} onChange={v => setMap(m => ({ ...m, name: v }))} />
              <ColSelect label="Téléphone" optional headers={headers} value={map.phone} onChange={v => setMap(m => ({ ...m, phone: v }))} />
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">{guests.length} invité(s) détecté(s) <span className="font-normal text-gray-400">— aperçu</span></p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-cream"><th className="text-left px-3 py-2 text-[11px] font-bold text-gray-400 uppercase">Nom</th><th className="text-left px-3 py-2 text-[11px] font-bold text-gray-400 uppercase">Téléphone</th></tr></thead>
                  <tbody>
                    {guests.slice(0, 5).map((g, i) => (
                      <tr key={i} className="border-t border-gray-50"><td className="px-3 py-1.5 text-gray-800">{g.name}</td><td className="px-3 py-1.5 text-gray-500">{g.phone || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
                {guests.length > 5 && <p className="px-3 py-1.5 text-xs text-gray-400">…et {guests.length - 5} autre(s)</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => { setHeaders(null); setRows([]); setError(null) }} className="py-2.5 px-4 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Changer de fichier</button>
              <button onClick={submit} disabled={saving || guests.length === 0} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Importer {guests.length} invité(s)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Équipe de l'événement ──────────────────────────────────────────────
 * L'admin crée des comptes confinés à cet événement :
 *  - Agent d'accueil (rôle scanner) : scanne les QR des invités depuis l'app.
 *  - Gestion des invités (rôle secrétaire) : ajoute/gère les invités (web).
 * Ces comptes ne voient que cet événement.
 */
const AGENT_ROLES = {
  scanner:    { label: "Agent d'accueil",   icon: 'qr_code_scanner', desc: "Scanne les QR des invités à l'entrée (app mobile).", cls: 'bg-brand/10 text-brand' },
  secretaire: { label: 'Gestion des invités', icon: 'group_add',      desc: "Ajoute et gère la liste des invités (back-office).", cls: 'bg-accent-soft text-accent-dark' },
}

function TeamPanel({ occasionId }) {
  const [agents, setAgents] = useState(null)
  const [err, setErr] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(() => {
    api.get(`/occasions/${occasionId}/team`)
      .then(res => setAgents(res.data.data || []))
      .catch(e => setErr(apiErrorMessage(e, "Chargement de l'équipe impossible.")))
  }, [occasionId])
  useEffect(load, [load])

  const remove = async (a) => {
    if (!confirm(`Supprimer le compte de ${a.name} ? Cette personne perdra l'accès.`)) return
    try { await api.delete(`/occasion-team/${a.id}`); load() }
    catch (e) { setErr(apiErrorMessage(e, 'Suppression impossible.')) }
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div>
          <h3 className="font-bold text-gray-900">Équipe de l'événement</h3>
          <p className="text-xs text-gray-500 mt-0.5">Comptes réservés à cet événement — accueil (scan) et gestion des invités.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-xl px-3.5 py-2">
          <Icon name="person_add" size={18} />
          Ajouter un membre
        </button>
      </div>

      {err && <div className="mx-4 mt-4 px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-600 border border-red-200">{err}</div>}

      {agents === null ? (
        <div className="p-10 text-center"><span className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" /></div>
      ) : agents.length === 0 ? (
        <div className="p-10 text-center text-gray-400">
          Aucun membre pour l'instant. Ajoutez un agent d'accueil (pour scanner à l'entrée) ou un gestionnaire d'invités.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {agents.map(a => {
            const r = AGENT_ROLES[a.role] || AGENT_ROLES.secretaire
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/50">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.cls}`}><Icon name={r.icon} size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 truncate">{a.email}</p>
                </div>
                <Pill cls={r.cls}>{r.label}</Pill>
                <button onClick={() => remove(a)} className="text-gray-300 hover:text-red-500 ml-1" title="Supprimer le compte">
                  <Icon name="delete" size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {showAdd && <AddAgentModal occasionId={occasionId} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddAgentModal({ occasionId, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'scanner' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      await api.post(`/occasions/${occasionId}/team`, form)
      onDone()
    } catch (e2) {
      const d = e2.response?.data
      setErr(d?.errors ? Object.values(d.errors)[0][0] : apiErrorMessage(e2, 'Création impossible.'))
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

  return (
    <Shell title="Ajouter un membre de l'équipe" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="px-4 py-2.5 rounded-xl text-sm bg-red-50 text-red-600 border border-red-200">{err}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(AGENT_ROLES).map(([k, r]) => (
              <button type="button" key={k} onClick={() => set('role', k)}
                className={`text-left p-3 rounded-xl border transition-colors ${form.role === k ? 'border-brand ring-2 ring-brand/30 bg-brand/5' : 'border-gray-200 hover:bg-sand'}`}>
                <span className="flex items-center gap-2 font-semibold text-sm text-gray-900"><Icon name={r.icon} size={18} />{r.label}</span>
                <span className="block text-xs text-gray-500 mt-1">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jean Kalala" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (identifiant de connexion)</label>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@exemple.cd" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input type="text" className={inputCls} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Au moins 6 caractères" />
          <p className="text-xs text-gray-400 mt-1">Communiquez ces identifiants au membre. Il se connecte {form.role === 'scanner' ? "sur l'app mobile pour scanner." : 'au back-office pour gérer les invités.'}</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
          <button type="submit" disabled={saving} className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
            Créer le compte
          </button>
        </div>
      </form>
    </Shell>
  )
}
