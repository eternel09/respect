import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api, { apiErrorMessage, downloadFile } from '../../lib/axios'
import Icon from '../../components/ui/Icon'

const money = (cents, cur = 'CDF') => (cents / 100).toLocaleString('fr-FR') + ' ' + cur

const STATUS = {
  pending:   { label: 'En attente de paiement', cls: 'text-amber-700 bg-amber-50' },
  paid:      { label: 'Payée',                    cls: 'text-emerald-700 bg-emerald-50' },
  cancelled: { label: 'Annulée',                  cls: 'text-gray-600 bg-gray-100' },
}

/**
 * Suivi public d'une commande de billets (par jeton). Affiche le statut, et une
 * fois payée, permet de télécharger les e-billets (QR). Aucun compte requis.
 */
export default function BilletterieOrderPage() {
  const { token } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const load = useCallback(() => {
    api.get(`/public/orders/${token}`)
      .then(res => setOrder(res.data.order))
      .catch(e => setErr(apiErrorMessage(e, 'Commande introuvable.')))
      .finally(() => setLoading(false))
  }, [token])
  useEffect(load, [load])

  if (loading) return <Centered><span className="inline-block animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full" /></Centered>
  if (err && !order) return <Centered><div className="text-4xl mb-3">🎟️</div><p className="text-gray-600">{err}</p></Centered>

  const st = STATUS[order.status] || STATUS.pending
  const paid = order.status === 'paid'
  const tickets = (order.tickets || []).filter(t => t.status !== 'void')

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand to-cream py-8 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl ring-1 ring-black/5 shadow-sm p-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-dark">Commande {order.reference}</p>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold mt-3 ${st.cls}`}>
            {paid && <Icon name="check" size={16} />}{st.label}
          </div>

          <div className="mt-5 text-left space-y-1.5 text-sm">
            <Row k="Acheteur" v={order.buyer_name} />
            <Row k="Billets" v={`${tickets.length}`} />
            <Row k="Total" v={money(order.total_cents, order.currency)} />
          </div>

          <div className="my-5 h-px bg-gray-100" />

          {paid ? (
            <>
              <p className="text-sm text-gray-600 mb-3">Vos e-billets sont prêts. Présentez le QR à l'entrée.</p>
              <button onClick={() => downloadFile(`/download/orders/${token}/tickets`, `billets-${order.reference}.pdf`)}
                className="w-full py-3.5 rounded-2xl text-white font-semibold bg-brand hover:bg-brand-dark transition-colors flex items-center justify-center gap-2">
                <Icon name="download" size={18} />
                Télécharger mes billets (PDF)
              </button>
              <div className="mt-4 space-y-2 text-left">
                {tickets.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2 text-sm">
                    <span className="font-medium text-gray-800">{t.type_name}{t.holder_name ? ` — ${t.holder_name}` : ''}</span>
                    {t.status === 'used' && <span className="text-[11px] text-gray-400">déjà entré</span>}
                  </div>
                ))}
              </div>
            </>
          ) : order.status === 'cancelled' ? (
            <p className="text-sm text-gray-500">Cette commande a été annulée.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">Votre commande est réservée. Vos billets seront disponibles ici
                dès que le paiement sera confirmé — vous les recevrez aussi sur WhatsApp.</p>
              <button onClick={load} className="mt-4 text-sm text-brand font-semibold underline hover:text-brand-dark">
                Actualiser
              </button>
            </>
          )}
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-6">Propulsé par Signiq</p>
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return <div className="flex justify-between"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-800">{v}</span></div>
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-8 text-center">{children}</div>
    </div>
  )
}
