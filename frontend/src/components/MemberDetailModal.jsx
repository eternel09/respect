import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import api, { apiErrorMessage, downloadFile } from '../lib/axios'

const TYPE_LABELS = { reunion: 'Réunion', priere: 'Prière', autre: 'Autre' }

function initials(name) {
  return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
}

export default function MemberDetailModal({ memberId, onClose, onDownloadBadge, badgeBusy }) {
  const open = !!memberId
  const [data, setData]       = useState(null) // { member, attendances }
  const [qr, setQr]           = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  // Envoi de la carte membre par WhatsApp — GELÉ temporairement (on se concentre
  // sur les membres). Réactivation : rétablir l'état `wa`, la fonction sendWhatsApp,
  // le bouton « Envoyer sur WhatsApp » et le message de résultat plus bas.

  useEffect(() => {
    if (!memberId) return
    setLoading(true); setError(null); setData(null); setQr(null)
    Promise.all([
      api.get(`/admin/members/${memberId}`),
      api.get(`/admin/members/${memberId}/qr`),
    ])
      .then(([d, q]) => { setData(d.data); setQr(q.data.qr) })
      .catch(err => setError(apiErrorMessage(err, "Impossible de charger le membre.")))
      .finally(() => setLoading(false))
  }, [memberId])

  const m = data?.member
  const attendances = data?.attendances || []

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-3xl bg-white rounded-3xl ring-1 ring-black/5 shadow-xl overflow-hidden"
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="h-1.5 bg-gradient-to-r from-brand via-brand-light to-accent" />

            <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">Fiche membre</h2>
                <button onClick={onClose} className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-gray-400 hover:bg-sand">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center"><div className="animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
              ) : error ? (
                <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
              ) : m && (
                <>
                  {/* En-tête membre */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {initials(m.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-gray-900 truncate">{m.full_name}</p>
                      <p className="text-sm text-gray-400">Membre N° {String(m.id).padStart(4, '0')}</p>
                    </div>
                  </div>

                  {/* QR + infos */}
                  <div className="flex flex-col sm:flex-row gap-5 mb-6">
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <div className="w-44 h-44 rounded-2xl ring-1 ring-black/5 p-2 bg-white">
                        {qr && <img src={`data:image/svg+xml;base64,${qr}`} alt="QR" className="w-full h-full" />}
                      </div>
                      <button
                        onClick={() => onDownloadBadge(m)}
                        disabled={badgeBusy === m.id}
                        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-dark rounded-xl px-3 py-2 transition-colors disabled:opacity-60"
                      >
                        {badgeBusy === m.id
                          ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>}
                        Badge PDF
                      </button>
                      {/* Bouton « Envoyer sur WhatsApp » GELÉ temporairement — voir l'état
                          `wa` / la fonction sendWhatsApp en haut du composant. */}
                      <button
                        onClick={() => downloadFile(`/download/card/${m.id}`, `carte-${m.id}.pdf`)}
                        title="Imprimer la carte de membre design (format carte de visite)"
                        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-brand border border-brand/30 hover:bg-brand/5 rounded-xl px-3 py-2 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
                        Carte design (PDF)
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      <Info label="Téléphone" value={m.phone} />
                      <Info label="Inscrit le" value={m.created_at?.slice(0, 10)} />
                      <Info label="Présences" value={`${m.attendance_count ?? attendances.length} enregistrée(s)`} />
                    </div>
                  </div>

                  {/* Historique de présence */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Historique de présence</p>
                    {attendances.length === 0 ? (
                      <p className="text-sm text-gray-400 py-3">Aucune présence enregistrée.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {attendances.map(a => (
                          <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-sand/70">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{a.event?.name || 'Service'}</p>
                              {a.event?.type && <span className="text-xs text-brand">{TYPE_LABELS[a.event.type] || a.event.type}</span>}
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">{a.attended_date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Info({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-2">
      <span className="text-sm text-gray-400 whitespace-nowrap">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right break-words min-w-0">{value}</span>
    </div>
  )
}
