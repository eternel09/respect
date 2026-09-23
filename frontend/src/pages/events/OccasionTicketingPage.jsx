import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import Icon from '../../components/ui/Icon'
import api, { apiErrorMessage } from '../../lib/axios'

const money = (cents, cur = 'CDF') => (cents / 100).toLocaleString('fr-FR') + ' ' + cur

const ORDER_STATUS = {
  pending:   ['En attente', 'bg-amber-50 text-amber-700'],
  paid:      ['Payée',      'bg-emerald-50 text-emerald-700'],
  cancelled: ['Annulée',    'bg-gray-100 text-gray-500'],
}

/** Back-office billetterie d'un événement : catégories + suivi des ventes. */
export default function OccasionTicketingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [occasion, setOccasion] = useState(null)
  const [types, setTypes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState(null)
  const [editType, setEditType] = useState(null) // objet en édition, ou {} pour nouveau
  const [deskSale, setDeskSale] = useState(false)
  const [designBusy, setDesignBusy] = useState(false)
  const designRef = useRef(null)

  const load = useCallback(() => {
    Promise.all([
      api.get(`/occasions/${id}`),
      api.get(`/occasions/${id}/ticket-types`),
      api.get(`/occasions/${id}/orders`),
    ]).then(([o, t, ord]) => {
      setOccasion(o.data.occasion)
      setTypes(t.data.data)
      setOrders(ord.data.data)
    }).catch(e => {
      setFlash({ ok: false, text: apiErrorMessage(e, 'Chargement impossible.') })
    }).finally(() => setLoading(false))
  }, [id])
  useEffect(load, [load])

  const delType = async (t) => {
    if (!confirm(`Supprimer la catégorie « ${t.name} » ? Les billets déjà vendus sont conservés.`)) return
    try { await api.delete(`/ticket-types/${t.id}`); load() }
    catch (e) { setFlash({ ok: false, text: apiErrorMessage(e, 'Suppression impossible.') }) }
  }
  const markPaid = async (o) => {
    try { const r = await api.post(`/ticket-orders/${o.id}/mark-paid`); setFlash({ ok: true, text: r.data.message }); load() }
    catch (e) { setFlash({ ok: false, text: apiErrorMessage(e, 'Action impossible.') }) }
  }
  const cancelOrder = async (o) => {
    if (!confirm(`Annuler la commande ${o.reference} ? Les places seront libérées.`)) return
    try { const r = await api.post(`/ticket-orders/${o.id}/cancel`); setFlash({ ok: true, text: r.data.message }); load() }
    catch (e) { setFlash({ ok: false, text: apiErrorMessage(e, 'Action impossible.') }) }
  }
  const uploadDesign = async (file) => {
    if (designRef.current) designRef.current.value = ''
    if (!file) return
    setDesignBusy(true); setFlash(null)
    try {
      const fd = new FormData(); fd.append('design', file)
      const r = await api.post(`/occasions/${id}/ticket-design`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFlash({ ok: true, text: r.data.message }); load()
    } catch (e) { setFlash({ ok: false, text: apiErrorMessage(e, 'Téléversement impossible.') }) }
    finally { setDesignBusy(false) }
  }
  const removeDesign = async () => {
    if (!confirm('Retirer le visuel ? Les billets reprendront le design standard.')) return
    setDesignBusy(true); setFlash(null)
    try { const r = await api.delete(`/occasions/${id}/ticket-design`); setFlash({ ok: true, text: r.data.message }); load() }
    catch (e) { setFlash({ ok: false, text: apiErrorMessage(e, 'Retrait impossible.') }) }
    finally { setDesignBusy(false) }
  }

  const stats = useMemo(() => {
    const sold = types.reduce((s, t) => s + t.sold, 0)
    const revenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total_cents, 0)
    return { sold, revenue, cur: types[0]?.currency || 'CDF' }
  }, [types, orders])

  const publicUrl = `${window.location.origin}/billetterie/${id}`
  const copyLink = () => { navigator.clipboard?.writeText(publicUrl); setFlash({ ok: true, text: 'Lien public copié.' }) }

  if (loading) return <AdminLayout><div className="p-8"><span className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full" /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
        <button onClick={() => navigate(`/events/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <Icon name="arrow_back" size={18} />Retour à l'événement
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-display text-2xl font-medium text-gray-900">Billetterie</h1>
            <p className="text-gray-500 text-sm">{occasion?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand bg-brand/10 hover:bg-brand/20 rounded-xl px-3.5 py-2">
              <Icon name="link" size={18} />Lien public
            </button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl px-3.5 py-2">
              <Icon name="open_in_new" size={18} />Aperçu
            </a>
          </div>
        </div>

        {flash && <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${flash.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{flash.text}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Billets vendus" value={stats.sold} />
          <Stat label="Recettes (payées)" value={money(stats.revenue, stats.cur)} />
          <Stat label="Commandes" value={orders.length} />
        </div>

        {/* Design du billet */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm mb-6 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">Design du billet</h2>
              <p className="text-sm text-gray-500 mt-0.5">Téléversez un visuel (image) : il coiffe le e-billet, le QR reste apposé dessous. Sans visuel, un <b>design standard</b> est utilisé.</p>
            </div>
            <input ref={designRef} type="file" accept="image/*" className="hidden" onChange={e => uploadDesign(e.target.files?.[0])} />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => designRef.current?.click()} disabled={designBusy}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-3.5 py-2 disabled:opacity-60">
                {designBusy ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Icon name="upload" size={18} />}
                {occasion?.ticket_design_url ? 'Remplacer' : 'Téléverser'}
              </button>
              {occasion?.ticket_design_url && (
                <button onClick={removeDesign} disabled={designBusy} className="p-2 text-gray-400 hover:text-red-500" title="Retirer"><Icon name="delete" size={18} /></button>
              )}
            </div>
          </div>
          {occasion?.ticket_design_url && (
            <img src={occasion.ticket_design_url} alt="Visuel du billet" className="mt-4 w-full max-h-56 object-contain rounded-xl ring-1 ring-black/5 bg-gray-50" />
          )}
        </div>

        {/* Catégories */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm mb-6">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Catégories de billets</h2>
            <button onClick={() => setEditType({})} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-3.5 py-2">
              <Icon name="add" size={18} />Nouvelle catégorie
            </button>
          </div>
          {types.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">Aucune catégorie. Créez-en une pour ouvrir la vente.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {types.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{t.name} {!t.is_active && <span className="text-[11px] text-gray-400">(inactive)</span>}</p>
                    <p className="text-xs text-gray-500">{t.price_cents === 0 ? 'Gratuit' : money(t.price_cents, t.currency)} · {t.quota === null ? 'illimité' : `${t.sold}/${t.quota} vendus`}</p>
                  </div>
                  <button onClick={() => setEditType(t)} className="p-2 text-gray-400 hover:text-brand" title="Modifier"><Icon name="edit" size={18} /></button>
                  <button onClick={() => delType(t)} className="p-2 text-gray-400 hover:text-red-500" title="Supprimer"><Icon name="delete" size={18} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commandes */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Ventes</h2>
            <button onClick={() => setDeskSale(true)} disabled={types.length === 0}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3.5 py-2 disabled:opacity-50">
              <Icon name="point_of_sale" size={18} />Vente au guichet
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">Aucune commande pour l'instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead><tr className="border-b border-gray-100">
                  {['Réf.', 'Acheteur', 'Billets', 'Total', 'Statut', ''].map(h => <th key={h} className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>)}
                </tr></thead>
                <tbody>
                  {orders.map(o => {
                    const [sl, sc] = ORDER_STATUS[o.status] || ORDER_STATUS.pending
                    return (
                      <tr key={o.id} className="border-b border-gray-50">
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">{o.reference}</td>
                        <td className="px-5 py-3">{o.buyer_name}{o.buyer_phone && <span className="block text-xs text-gray-400">{o.buyer_phone}</span>}</td>
                        <td className="px-5 py-3">{o.tickets_count}</td>
                        <td className="px-5 py-3">{money(o.total_cents, o.currency)}</td>
                        <td className="px-5 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${sc}`}>{sl}</span></td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {o.status === 'pending' && <button onClick={() => markPaid(o)} className="text-xs font-semibold text-emerald-700 hover:underline mr-3">Marquer payé</button>}
                          {o.status !== 'cancelled' && <button onClick={() => cancelOrder(o)} className="text-xs font-semibold text-red-500 hover:underline">Annuler</button>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editType && <TypeModal occasionId={id} type={editType} onClose={() => setEditType(null)} onSaved={() => { setEditType(null); load() }} />}
      {deskSale && <DeskSaleModal occasionId={id} types={types.filter(t => t.is_active)} onClose={() => setDeskSale(false)} onSaved={() => { setDeskSale(false); load() }} />}
    </AdminLayout>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm px-4 py-3">
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}

/** Création / édition d'une catégorie (prix saisi dans l'unité, stocké en centimes). */
function TypeModal({ occasionId, type, onClose, onSaved }) {
  const isNew = !type.id
  const [form, setForm] = useState({
    name: type.name || '',
    description: type.description || '',
    price: type.price_cents != null ? type.price_cents / 100 : '',
    quota: type.quota ?? '',
    is_active: type.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const save = async () => {
    setErr(null); setSaving(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: Math.round(Number(form.price || 0) * 100),
      quota: form.quota === '' ? null : Number(form.quota),
      is_active: !!form.is_active,
    }
    try {
      if (isNew) await api.post(`/occasions/${occasionId}/ticket-types`, payload)
      else await api.put(`/ticket-types/${type.id}`, payload)
      onSaved()
    } catch (e) { setErr(apiErrorMessage(e, 'Enregistrement impossible.')); setSaving(false) }
  }

  return (
    <Modal title={isNew ? 'Nouvelle catégorie' : 'Modifier la catégorie'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nom *"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="VIP, Standard…" /></Field>
        <Field label="Description"><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix (CDF)"><input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputCls} placeholder="0 = gratuit" /></Field>
          <Field label="Quota (vide = illimité)"><input type="number" min="1" value={form.quota} onChange={e => setForm(f => ({ ...f, quota: e.target.value }))} className={inputCls} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-brand" />
          En vente (visible sur la page publique)
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
        <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-60">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  )
}

/** Vente au guichet : commande créée puis encaissée immédiatement (payée). */
function DeskSaleModal({ occasionId, types, onClose, onSaved }) {
  const [buyer, setBuyer] = useState('')
  const [qty, setQty] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const items = Object.entries(qty).filter(([, n]) => n > 0).map(([tid, n]) => ({ ticket_type_id: Number(tid), quantity: n }))

  const save = async () => {
    setErr(null)
    if (!buyer.trim()) { setErr('Nom de l\'acheteur requis.'); return }
    if (items.length === 0) { setErr('Sélectionnez au moins un billet.'); return }
    setSaving(true)
    try {
      await api.post(`/occasions/${occasionId}/orders/manual`, { buyer_name: buyer.trim(), items })
      onSaved()
    } catch (e) { setErr(apiErrorMessage(e, 'Vente impossible.')); setSaving(false) }
  }

  return (
    <Modal title="Vente au guichet" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nom de l'acheteur *"><input value={buyer} onChange={e => setBuyer(e.target.value)} className={inputCls} /></Field>
        <div className="space-y-2">
          {types.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <div className="min-w-0"><p className="text-sm font-medium text-gray-900">{t.name}</p><p className="text-xs text-gray-500">{t.price_cents === 0 ? 'Gratuit' : money(t.price_cents, t.currency)}{t.remaining !== null && ` · ${t.remaining} restant(s)`}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => ({ ...q, [t.id]: Math.max(0, (q[t.id] || 0) - 1) }))} className="w-7 h-7 rounded-full bg-gray-100 font-bold">−</button>
                <span className="w-5 text-center text-sm font-semibold">{qty[t.id] || 0}</span>
                <button onClick={() => setQty(q => ({ ...q, [t.id]: (q[t.id] || 0) + 1 }))} disabled={t.remaining !== null && (qty[t.id] || 0) >= t.remaining} className="w-7 h-7 rounded-full bg-brand/10 text-brand font-bold disabled:opacity-40">+</button>
              </div>
            </div>
          ))}
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
        <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
          {saving ? 'Encaissement…' : 'Encaisser (payé)'}
        </button>
      </div>
    </Modal>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none'
function Field({ label, children }) { return <label className="block"><span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>{children}</label> }
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-700"><Icon name="close" size={20} /></button></div>
        {children}
      </div>
    </div>
  )
}
