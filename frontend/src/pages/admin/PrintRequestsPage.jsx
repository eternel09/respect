import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { apiErrorMessage } from '../../lib/axios'
import Pagination from '../../components/Pagination'
import PlatformHeader from '../../components/PlatformHeader'
import PrintRequestHistory from '../../components/PrintRequestHistory'
import PrintRequestStaff from '../../components/PrintRequestStaff'
import ConvertRequestModal from '../../components/ConvertRequestModal'
import Icon from '../../components/ui/Icon'

const STATUS = {
  pending:     { label: 'En attente',    cls: 'text-amber-700 bg-amber-50' },
  in_progress: { label: 'En cours',      cls: 'text-blue-700 bg-blue-50' },
  done:        { label: 'Terminé',       cls: 'text-emerald-700 bg-emerald-50' },
  cancelled:   { label: 'Annulé',        cls: 'text-gray-500 bg-gray-100' },
}

const SOURCE = {
  in_app: { label: 'Client', icon: 'business', cls: 'text-brand bg-brand/10' },
  public: { label: 'Portail', icon: 'public',  cls: 'text-violet-700 bg-violet-50' },
  email:  { label: 'E-mail',  icon: 'mail',    cls: 'text-teal-700 bg-teal-50' },
}

const FILTERS = [
  { key: '',            label: 'Toutes' },
  { key: 'pending',     label: 'En attente' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'done',        label: 'Terminées' },
  { key: 'cancelled',   label: 'Annulées' },
]

export default function PrintRequestsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [meta, setMeta]       = useState(null)
  const [page, setPage]       = useState(1)
  const [status, setStatus]   = useState('')
  const [source, setSource]   = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busyId, setBusyId]   = useState(null)
  const [openId, setOpenId]   = useState(null) // demande dont l'historique est déplié
  const [exporting, setExporting] = useState(false)
  const [stats, setStats]     = useState(null)
  const [noteBusy, setNoteBusy] = useState(null) // id de la demande dont le bon est en génération
  const [staffOpenId, setStaffOpenId] = useState(null) // demande dont la liste du personnel est dépliée
  const [converting, setConverting] = useState(null) // demande en cours de conversion en client
  const [cardsBusy, setCardsBusy] = useState(null)   // `${id}-${layout}` en génération
  const isSuperAdmin = user?.role === 'super_admin'

  const load = useCallback(() => {
    setLoading(true); setError(null)
    api.get('/admin/print-requests', { params: { page, status: status || undefined, source: source || undefined } })
      .then(res => { setItems(res.data.data); setMeta(res.data.meta) })
      .catch(err => setError(apiErrorMessage(err, "Impossible de charger les demandes.")))
      .finally(() => setLoading(false))
  }, [page, status, source])

  // Chargement initial + rechargement quand le filtre/la page changent.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  // Tableau de bord (compteurs globaux, indépendants des filtres).
  const loadStats = useCallback(() => {
    api.get('/admin/print-requests/stats').then(res => setStats(res.data)).catch(() => {})
  }, [])
  useEffect(() => { loadStats() }, [loadStats])

  const handleLogout = async () => { await logout(); navigate('/admin/login') }

  const setItemStatus = async (item, next) => {
    setBusyId(item.id); setError(null)
    try {
      const res = await api.patch(`/admin/print-requests/${item.id}`, { status: next })
      setItems(list => list.map(i => (i.id === item.id ? res.data.request : i)))
      loadStats()
    } catch (err) {
      setError(apiErrorMessage(err, "Mise à jour impossible."))
    } finally { setBusyId(null) }
  }

  // Export CSV (mêmes filtres) : endpoint authentifié → téléchargement via blob.
  const exportCsv = async () => {
    setExporting(true); setError(null)
    try {
      const res = await api.get('/admin/print-requests/export', {
        params: { status: status || undefined, source: source || undefined },
        responseType: 'blob',
      })
      saveBlob(res.data, 'demandes-cartes.csv')
    } catch (err) {
      setError(apiErrorMessage(err, "Export impossible."))
    } finally { setExporting(false) }
  }

  // Bon de livraison PDF d'une demande (endpoint authentifié → blob).
  const downloadDeliveryNote = async item => {
    setNoteBusy(item.id); setError(null)
    try {
      const res = await api.get(`/admin/print-requests/${item.id}/delivery-note`, { responseType: 'blob' })
      saveBlob(res.data, `bon-livraison-${item.reference || item.id}.pdf`)
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de générer le bon de livraison."))
    } finally { setNoteBusy(null) }
  }

  // Cartes de l'organisation rattachée (service opéré : l'équipe imprime pour le client).
  const downloadCards = async (item, layout) => {
    setCardsBusy(`${item.id}-${layout}`); setError(null)
    try {
      const res = await api.get(`/admin/print-requests/${item.id}/cards`, { params: { layout }, responseType: 'blob' })
      saveBlob(res.data, `cartes-${item.reference || item.id}${layout === 'single' ? '-a-decouper' : ''}.pdf`)
    } catch (err) {
      setError(await blobErrorMessage(err, "Impossible de générer les cartes."))
    } finally { setCardsBusy(null) }
  }

  return (
    <div className="min-h-screen bg-sand">
      <PlatformHeader user={user} onLogout={handleLogout} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Demandes d'impression</h1>
              <p className="text-gray-500 text-sm mt-1">Cartes de service à imprimer et livrer pour le compte des organisations.</p>
            </div>
            <button
              onClick={exportCsv} disabled={exporting}
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-white transition-colors disabled:opacity-60 shrink-0"
            >
              {exporting
                ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                : <Icon name="download" size={18} />}
              Exporter CSV
            </button>
          </div>

          {stats && <StatsRow stats={stats} />}

          {/* Filtres par canal */}
          <div className="flex flex-wrap gap-2 mb-2">
            {[{ key: '', label: 'Tous canaux' }, { key: 'in_app', label: 'Client' }, { key: 'public', label: 'Portail' }, { key: 'email', label: 'E-mail' }].map(f => (
              <button
                key={f.key}
                onClick={() => { setSource(f.key); setPage(1) }}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${source === f.key ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 ring-1 ring-black/5 hover:bg-sand'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtres par statut */}
          <div className="flex flex-wrap gap-2 mb-5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setStatus(f.key); setPage(1) }}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${status === f.key ? 'bg-brand text-white' : 'bg-white text-gray-600 ring-1 ring-black/5 hover:bg-sand'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          {loading ? (
            <div className="py-16 flex justify-center"><span className="animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Icon name="inbox" size={40} className="mx-auto mb-2" />
              <p className="text-sm">Aucune demande pour ce filtre.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const st = STATUS[item.status] || STATUS.pending
                const sc = SOURCE[item.source] || SOURCE.in_app
                // Qui demande : l'organisation cliente, ou le contact d'un prospect public.
                const who = item.organization?.name || item.contact?.company || item.contact?.name || 'Prospect'
                return (
                  <div key={item.id} className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5">
                    {/* Détails en haut, actions en pied de carte : les détails gardent toute la largeur. */}
                    <div className="flex flex-col gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{who}</span>
                          {item.reference && <span className="text-xs font-mono font-semibold text-gray-500 bg-sand px-2 py-0.5 rounded">{item.reference}</span>}
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}><Icon name={sc.icon} size={13} />{sc.label}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold text-gray-800 tabular-nums">{item.quantity}</span> carte(s)
                          {item.requested_by && <span className="text-gray-400"> · demandé par {item.requested_by}</span>}
                          {item.staff_count > 0 && (
                            <button onClick={() => setStaffOpenId(id => id === item.id ? null : item.id)}
                              className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full hover:bg-brand/15">
                              <Icon name="group" size={14} />Liste de {item.staff_count} personne(s)
                              <Icon name="expand_more" size={14} className={`transition-transform ${staffOpenId === item.id ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </p>
                        {/* Contact du prospect (demande publique sans compte) */}
                        {item.contact && (
                          <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            {item.contact.name && <span className="flex items-center gap-1"><Icon name="person" size={15} className="text-gray-400" />{item.contact.name}</span>}
                            {item.contact.email && <a href={`mailto:${item.contact.email}`} className="flex items-center gap-1 text-brand hover:underline"><Icon name="mail" size={15} />{item.contact.email}</a>}
                            {item.contact.phone && <a href={`tel:${item.contact.phone}`} className="flex items-center gap-1 hover:underline"><Icon name="call" size={15} className="text-gray-400" />{item.contact.phone}</a>}
                          </div>
                        )}
                        {item.delivery_address && (
                          <p className="text-sm text-gray-500 mt-1 flex items-start gap-1.5">
                            <Icon name="location_on" size={16} className="text-gray-400 mt-0.5" />{item.delivery_address}
                          </p>
                        )}
                        {item.note && <p className="text-sm text-gray-500 mt-1 italic">« {item.note} »</p>}
                        <div className="flex items-center gap-3 flex-wrap mt-2">
                          <span className="text-xs text-gray-400">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                          </span>
                          {item.assigned_to && <span className="text-xs text-gray-500 flex items-center gap-1"><Icon name="assignment_ind" size={14} className="text-gray-400" />{item.assigned_to}</span>}
                        </div>
                      </div>

                      {staffOpenId === item.id && <PrintRequestStaff requestId={item.id} />}

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-black/5">
                        {/* Prospect signé → espace client (super-admin : crée une organisation) */}
                        {isSuperAdmin && !item.organization && item.source === 'public' && item.status !== 'cancelled' && (
                          <button onClick={() => setConverting(item)}
                            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800">
                            <Icon name="domain_add" size={16} />Convertir en client
                          </button>
                        )}
                        {item.organization && (
                          <>
                            <button onClick={() => downloadCards(item, 'sheet')} disabled={!!cardsBusy}
                              title="Cartes de l'organisation : planche A4"
                              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-sand disabled:opacity-60">
                              {cardsBusy === `${item.id}-sheet`
                                ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                : <Icon name="badge" size={16} />}
                              Cartes (A4)
                            </button>
                            <button onClick={() => downloadCards(item, 'single')} disabled={!!cardsBusy}
                              title="Cartes de l'organisation : une par page, prêtes à découper (CR80)"
                              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-sand disabled:opacity-60">
                              {cardsBusy === `${item.id}-single`
                                ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                : <Icon name="content_cut" size={16} />}
                              1 par page
                            </button>
                          </>
                        )}
                        {item.status === 'pending' && (
                          <button disabled={busyId === item.id} onClick={() => setItemStatus(item, 'in_progress')}
                            className="text-sm px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">Prendre en charge</button>
                        )}
                        {(item.status === 'pending' || item.status === 'in_progress') && (
                          <>
                            <button disabled={busyId === item.id} onClick={() => setItemStatus(item, 'done')}
                              className="text-sm px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">Terminer</button>
                            <button disabled={busyId === item.id} onClick={() => setItemStatus(item, 'cancelled')}
                              className="text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-sand disabled:opacity-60">Annuler</button>
                          </>
                        )}
                        <button
                          onClick={() => downloadDeliveryNote(item)} disabled={noteBusy === item.id}
                          title="Bon de livraison (PDF)"
                          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-sand disabled:opacity-60"
                        >
                          {noteBusy === item.id
                            ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                            : <Icon name="local_shipping" size={16} />}
                          Bon
                        </button>
                        <button
                          onClick={() => setOpenId(id => id === item.id ? null : item.id)}
                          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-sand"
                        >
                          <Icon name="history" size={16} />Suivi
                          <Icon name="expand_more" size={16} className={`transition-transform ${openId === item.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {openId === item.id && <PrintRequestHistory requestId={item.id} />}
                  </div>
                )
              })}
            </div>
          )}

          {converting && (
            <ConvertRequestModal
              item={converting}
              onClose={() => setConverting(null)}
              onConverted={req => setItems(list => list.map(i => (i.id === req.id ? req : i)))}
            />
          )}

          {meta && meta.last_page > 1 && (
            <div className="mt-4 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
              <Pagination meta={meta} page={page} onChange={setPage} count={items.length} label="demande(s)" />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

/** Enregistre un Blob (réponse authentifiée) comme fichier téléchargé. */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

/** Message d'une erreur reçue en blob (réponse JSON de l'API lue depuis le Blob). */
async function blobErrorMessage(err, fallback) {
  const data = err.response?.data
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text())
      if (json?.message) return json.message
    } catch { /* pas du JSON */ }
  }
  return apiErrorMessage(err, fallback)
}

const fmtNum = n => (n ?? 0).toLocaleString('fr-FR')

/**
 * Tableau de bord de la file : rangée de tuiles chiffrées. Texte en encre
 * neutre ; seule la tuile « en souffrance » prend la couleur d'alerte, et
 * toujours avec une icône + un libellé (jamais la couleur seule).
 */
function StatsRow({ stats }) {
  const s = stats.by_status || {}
  const open = (s.pending || 0) + (s.in_progress || 0)
  const alert = stats.stale > 0
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatTile label="Demandes ouvertes" value={fmtNum(open)}
        sub={`${fmtNum(s.pending)} en attente · ${fmtNum(s.in_progress)} en cours`} />
      <StatTile label="Cartes à produire" value={fmtNum(stats.open_cards)} sub="sur les demandes ouvertes" />
      <StatTile label="Terminées" value={fmtNum(s.done)} sub={`${fmtNum(s.cancelled)} annulée(s)`} />
      <StatTile
        label="En souffrance" value={fmtNum(stats.stale)}
        sub={`sans avancement depuis ${stats.stale_hours} h`}
        icon={alert ? 'warning' : 'check_circle'}
        tone={alert ? 'warning' : 'neutral'}
      />
    </div>
  )
}

function StatTile({ label, value, sub, icon, tone = 'neutral' }) {
  const warning = tone === 'warning'
  return (
    <div className={`rounded-2xl p-4 ring-1 shadow-sm ${warning ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-black/5'}`}>
      <div className="flex items-center gap-1.5">
        {icon && <Icon name={icon} size={16} className={warning ? 'text-amber-600' : 'text-gray-400'} />}
        <p className={`text-sm ${warning ? 'text-amber-800 font-medium' : 'text-gray-500'}`}>{label}</p>
      </div>
      <p className="text-[1.75rem] leading-none font-semibold text-gray-900 mt-2 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}
