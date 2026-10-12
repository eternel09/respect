import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import api, { apiErrorMessage } from '../lib/axios'
import logoFull from '../assets/logo-full.png'
import Icon from '../components/ui/Icon'

const STATUS = {
  pending:     { label: 'En attente',  cls: 'text-amber-700 bg-amber-50',     icon: 'schedule' },
  in_progress: { label: 'En cours',    cls: 'text-blue-700 bg-blue-50',       icon: 'autorenew' },
  done:        { label: 'Terminé',     cls: 'text-emerald-700 bg-emerald-50', icon: 'check_circle' },
  cancelled:   { label: 'Annulé',      cls: 'text-gray-500 bg-gray-100',      icon: 'cancel' },
}

/** Suivi public d'une demande de cartes par son jeton (lien du ticket). */
export default function ServiceCardTrackPage() {
  const { token } = useParams()
  const [req, setReq]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    api.get(`/public/card-print-requests/${token}`)
      .then(res => setReq(res.data.data))
      .catch(err => setError(err.response?.status === 404
        ? 'Demande introuvable. Vérifiez votre lien de suivi.'
        : apiErrorMessage(err, 'Impossible de charger le suivi.')))
      .finally(() => setLoading(false))
  }, [token])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const st = req ? (STATUS[req.status] || STATUS.pending) : null
  const fmt = iso => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center px-4 py-10">
      <img src={logoFull} alt="Signiq" className="h-9 w-auto mb-8" />

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg bg-white rounded-3xl ring-1 ring-black/5 shadow-sm overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-brand via-brand-light to-accent" />
        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="py-16 flex justify-center"><span className="animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
          ) : error ? (
            <div className="py-10 text-center">
              <Icon name="error" size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          ) : req && (
            <>
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Suivi de demande</p>
                  <p className="text-2xl font-bold text-brand font-mono tracking-wider mt-1">{req.reference}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${st.cls}`}>
                  <Icon name={st.icon} size={16} />{st.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-400">Cartes demandées</p>
                  <p className="font-semibold text-gray-800 tabular-nums">{req.quantity}</p>
                </div>
                <div>
                  <p className="text-gray-400">Demande du</p>
                  <p className="font-semibold text-gray-800">{fmt(req.created_at)}</p>
                </div>
                {req.contact_company && (
                  <div className="col-span-2">
                    <p className="text-gray-400">Organisation</p>
                    <p className="font-semibold text-gray-800">{req.contact_company}</p>
                  </div>
                )}
                {req.delivery_address && (
                  <div className="col-span-2">
                    <p className="text-gray-400">Livraison</p>
                    <p className="font-semibold text-gray-800">{req.delivery_address}</p>
                  </div>
                )}
              </div>

              {req.timeline?.length > 0 && (
                <div className="border-t border-black/5 pt-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Historique</p>
                  <ul className="space-y-3">
                    {[...req.timeline].reverse().map((e, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-brand/60 shrink-0" />
                        <div>
                          <p className="text-sm text-gray-700">{e.message}</p>
                          <p className="text-xs text-gray-400">{fmt(e.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center mt-6">
                Une question ? Répondez à l'e-mail de confirmation en citant votre numéro de ticket.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
