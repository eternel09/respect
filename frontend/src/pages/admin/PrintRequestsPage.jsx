import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { apiErrorMessage } from '../../lib/axios'
import Pagination from '../../components/Pagination'
import PlatformHeader from '../../components/PlatformHeader'
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

  const handleLogout = async () => { await logout(); navigate('/admin/login') }

  const setItemStatus = async (item, next) => {
    setBusyId(item.id); setError(null)
    try {
      const res = await api.patch(`/admin/print-requests/${item.id}`, { status: next })
      setItems(list => list.map(i => (i.id === item.id ? res.data.request : i)))
    } catch (err) {
      setError(apiErrorMessage(err, "Mise à jour impossible."))
    } finally { setBusyId(null) }
  }

  return (
    <div className="min-h-screen bg-sand">
      <PlatformHeader user={user} onLogout={handleLogout} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Demandes d'impression</h1>
            <p className="text-gray-500 text-sm mt-1">Cartes de service à imprimer et livrer pour le compte des organisations.</p>
          </div>

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
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{who}</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}><Icon name={sc.icon} size={13} />{sc.label}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold text-gray-800 tabular-nums">{item.quantity}</span> carte(s)
                          {item.requested_by && <span className="text-gray-400"> · demandé par {item.requested_by}</span>}
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
                          {item.design_url && (
                            <a href={item.design_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline flex items-center gap-1"><Icon name="image" size={14} />Voir le visuel</a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
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
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
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
