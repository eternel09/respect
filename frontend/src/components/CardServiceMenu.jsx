import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import api, { downloadFile, apiErrorMessage } from '../lib/axios'
import Icon from './ui/Icon'

const inputBase =
  'w-full px-4 py-2.5 border rounded-xl text-sm bg-white transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

/**
 * Cartes de service (produit Présence entreprise).
 * Deux usages : l'entreprise imprime elle-même (téléchargement PDF, en planche
 * ou une carte par page prête à découper) OU demande à l'opérateur de faire
 * imprimer et livrer les cartes pour elle.
 */
export default function CardServiceMenu({ memberCount = 0 }) {
  const [open, setOpen]       = useState(false)
  const [busy, setBusy]       = useState(null)   // 'sheet' | 'single'
  const [error, setError]     = useState(null)
  const [askPrint, setAskPrint] = useState(false)
  const wrapRef = useRef(null)

  // Fermer le menu au clic extérieur / Échap.
  useEffect(() => {
    if (!open) return
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const download = async layout => {
    setBusy(layout); setError(null); setOpen(false)
    const path = layout === 'single' ? '/download/cards?layout=single' : '/download/cards'
    const name = layout === 'single' ? 'cartes-a-decouper.pdf' : 'cartes-membres.pdf'
    try { await downloadFile(path, name) }
    catch (err) { setError(apiErrorMessage(err, 'Impossible de générer les cartes.')) }
    finally { setBusy(null) }
  }

  return (
    <div className="relative flex-1 sm:flex-none" ref={wrapRef}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Cartes de service — imprimer soi-même ou faire imprimer par l'opérateur"
        className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-sand transition-colors disabled:opacity-60"
        disabled={!!busy}
      >
        {busy
          ? <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          : <Icon name="badge" size={18} />}
        Cartes
        <Icon name="expand_more" size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 z-30 mt-2 w-72 bg-white rounded-2xl ring-1 ring-black/5 shadow-xl p-2"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Imprimer moi-même</p>
            <button onClick={() => download('sheet')} className="w-full flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-sand text-left">
              <Icon name="grid_view" size={20} className="text-brand mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-gray-800">Planche A4</span>
                <span className="block text-xs text-gray-500">Plusieurs cartes par page</span>
              </span>
            </button>
            <button onClick={() => download('single')} className="w-full flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-sand text-left">
              <Icon name="crop_free" size={20} className="text-brand mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-gray-800">1 carte par page</span>
                <span className="block text-xs text-gray-500">Format CR80 + repères de coupe</span>
              </span>
            </button>

            <div className="my-1 border-t border-black/5" />
            <p className="px-3 pt-1 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Faire imprimer</p>
            <button onClick={() => { setOpen(false); setAskPrint(true) }} className="w-full flex items-start gap-3 px-3 py-2 rounded-xl hover:bg-sand text-left">
              <Icon name="local_shipping" size={20} className="text-accent-dark mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-gray-800">Demander l'impression</span>
                <span className="block text-xs text-gray-500">L'opérateur imprime et livre pour vous</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="absolute right-0 mt-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 whitespace-nowrap">{error}</p>
      )}

      <PrintRequestModal open={askPrint} onClose={() => setAskPrint(false)} defaultQuantity={memberCount} />
    </div>
  )
}

/** Modale : demander à l'opérateur l'impression des cartes de service. */
function PrintRequestModal({ open, onClose, defaultQuantity = 0 }) {
  const [form, setForm]       = useState({ quantity: '', note: '', delivery_address: '' })
  const [errors, setErrors]   = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  // Pré-remplir la quantité avec l'effectif à chaque ouverture.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ quantity: defaultQuantity ? String(defaultQuantity) : '', note: '', delivery_address: '' })
      setErrors({}); setError(null); setDone(false)
    }
  }, [open, defaultQuantity])

  const close = () => { if (!loading) onClose() }

  const submit = async e => {
    e.preventDefault()
    setLoading(true); setErrors({}); setError(null)
    try {
      await api.post('/admin/card-print-requests', {
        quantity: parseInt(form.quantity, 10),
        note: form.note || null,
        delivery_address: form.delivery_address || null,
      })
      setDone(true)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setError(apiErrorMessage(err))
      }
    } finally { setLoading(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl ring-1 ring-black/5 shadow-xl p-6"
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">Demander l'impression</h2>
              <button onClick={close} className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-gray-400 hover:bg-sand">
                <Icon name="close" size={20} />
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Icon name="check_circle" size={32} />
                </div>
                <p className="text-sm text-gray-700">Votre demande a été transmise à l'opérateur.</p>
                <p className="text-xs text-gray-400 mt-1">Vous pouvez suivre son avancement avec l'équipe.</p>
                <button onClick={close} className="mt-5 px-5 py-2 text-sm font-semibold text-white rounded-xl bg-brand hover:bg-brand-dark">Fermer</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 mt-3">
                <p className="text-sm text-gray-500">L'opérateur imprime les cartes avec votre visuel et vous les livre.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité de cartes</label>
                  <input
                    type="number" min="1" name="quantity" value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className={`${inputBase} ${errors.quantity ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="Ex. 120" required
                  />
                  {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de livraison <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input
                    type="text" name="delivery_address" value={form.delivery_address}
                    onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                    className={`${inputBase} ${errors.delivery_address ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="Où livrer les cartes imprimées"
                  />
                  {errors.delivery_address && <p className="text-xs text-red-600 mt-1">{errors.delivery_address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consignes <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <textarea
                    name="note" value={form.note} rows={3}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    className={`${inputBase} ${errors.note ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="Finition, délai, support (PVC)…"
                  />
                  {errors.note && <p className="text-xs text-red-600 mt-1">{errors.note}</p>}
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={close} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-sand">Annuler</button>
                  <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60">
                    {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                    Envoyer la demande
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
