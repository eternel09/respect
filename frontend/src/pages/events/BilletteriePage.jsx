import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { apiErrorMessage } from '../../lib/axios'

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const money = (cents, cur = 'CDF') => (cents / 100).toLocaleString('fr-FR') + ' ' + cur

/**
 * Vitrine publique de billetterie d'un événement : catégories en vente,
 * sélection des quantités, coordonnées de l'acheteur, puis création de la
 * commande. Aucun compte requis. Redirige vers le suivi de commande.
 */
export default function BilletteriePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)      // { occasion, ticket_types }
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [qty, setQty] = useState({})          // { [typeId]: n }
  const [buyer, setBuyer] = useState({ buyer_name: '', buyer_phone: '', buyer_email: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.get(`/public/occasions/${id}/tickets`)
      .then(res => setData(res.data))
      .catch(e => setErr(apiErrorMessage(e, 'Billetterie introuvable.')))
      .finally(() => setLoading(false))
  }, [id])
  useEffect(load, [load])

  const setQ = (tid, n) => setQty(q => ({ ...q, [tid]: Math.max(0, n) }))

  const total = useMemo(() => {
    if (!data) return 0
    return data.ticket_types.reduce((s, t) => s + (qty[t.id] || 0) * t.price_cents, 0)
  }, [data, qty])

  const items = useMemo(() =>
    Object.entries(qty).filter(([, n]) => n > 0).map(([tid, n]) => ({ ticket_type_id: Number(tid), quantity: n })),
  [qty])

  const submit = async () => {
    setErr(null)
    if (!buyer.buyer_name.trim()) { setErr('Indiquez votre nom.'); return }
    if (items.length === 0) { setErr('Sélectionnez au moins un billet.'); return }
    setBusy(true)
    try {
      const res = await api.post(`/public/occasions/${id}/orders`, { ...buyer, items })
      navigate(`/billetterie/commande/${res.data.order.token}`)
    } catch (e) {
      setErr(apiErrorMessage(e, "Impossible de finaliser la commande."))
    } finally { setBusy(false) }
  }

  if (loading) return <Centered><span className="inline-block animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full" /></Centered>
  if (err && !data) return <Centered><div className="text-4xl mb-3">🎟️</div><p className="text-gray-600">{err}</p></Centered>

  const { occasion, ticket_types: types } = data
  const cur = types[0]?.currency || 'CDF'

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand to-cream py-8 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl ring-1 ring-black/5 shadow-sm p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-dark">Billetterie</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{occasion.name}</h1>
          <div className="mt-2 text-sm text-gray-500 space-y-0.5">
            <p>📅 {fmtDate(occasion.date)}</p>
            {occasion.location && <p>📍 {occasion.location}</p>}
          </div>

          <div className="my-5 h-px bg-gray-100" />

          {occasion.closed ? (
            <p className="text-center text-sm text-gray-400 py-6">La billetterie de cet événement est fermée.</p>
          ) : types.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">Aucun billet en vente pour le moment.</p>
          ) : (
            <>
              <div className="space-y-3">
                {types.map(t => {
                  const soldOut = t.sold_out
                  return (
                    <div key={t.id} className={`rounded-2xl border p-4 ${soldOut ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{t.name}</p>
                          {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                          <p className="text-sm font-medium text-brand mt-1">{t.price_cents === 0 ? 'Gratuit' : money(t.price_cents, t.currency)}</p>
                          {t.remaining !== null && <p className="text-[11px] text-gray-400 mt-0.5">{soldOut ? 'Complet' : `${t.remaining} place(s) restante(s)`}</p>}
                        </div>
                        {!soldOut && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setQ(t.id, (qty[t.id] || 0) - 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">−</button>
                            <span className="w-6 text-center font-semibold">{qty[t.id] || 0}</span>
                            <button onClick={() => setQ(t.id, (qty[t.id] || 0) + 1)}
                              disabled={t.remaining !== null && (qty[t.id] || 0) >= t.remaining}
                              className="w-8 h-8 rounded-full bg-brand/10 hover:bg-brand/20 text-brand font-bold disabled:opacity-40">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="my-5 h-px bg-gray-100" />

              <div className="space-y-2.5">
                <input value={buyer.buyer_name} onChange={e => setBuyer(b => ({ ...b, buyer_name: e.target.value }))}
                  placeholder="Votre nom complet *" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none" />
                <input value={buyer.buyer_phone} onChange={e => setBuyer(b => ({ ...b, buyer_phone: e.target.value }))}
                  placeholder="Téléphone WhatsApp (pour recevoir vos billets)" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none" />
                <input value={buyer.buyer_email} onChange={e => setBuyer(b => ({ ...b, buyer_email: e.target.value }))}
                  placeholder="Email (facultatif)" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none" />
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-lg font-bold text-gray-900">{money(total, cur)}</span>
              </div>

              {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

              <button onClick={submit} disabled={busy || total === undefined}
                className="mt-4 w-full py-3.5 rounded-2xl text-white font-semibold bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Réserver mes billets
              </button>
            </>
          )}
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-6">Propulsé par Signiq</p>
      </div>
    </div>
  )
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-8 text-center">{children}</div>
    </div>
  )
}
