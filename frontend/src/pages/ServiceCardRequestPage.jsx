import { useState } from 'react'
import { motion } from 'motion/react'
import api, { apiErrorMessage } from '../lib/axios'
import logoWhite from '../assets/logo-white.png'
import logoFull from '../assets/logo-full.png'
import Icon from '../components/ui/Icon'

const inputClass =
  'w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors'

/**
 * Portail public de demande de cartes de service (sans compte).
 * Un prospect décrit son besoin ; la demande alimente la file de travail que
 * l'équipe plateforme traite. Service opéré — pas de self-service requis.
 */
export default function ServiceCardRequestPage() {
  const [form, setForm] = useState({
    contact_name: '', contact_company: '', contact_email: '', contact_phone: '',
    quantity: '', delivery_address: '', note: '', website: '', // website = honeypot
  })
  const [design, setDesign]   = useState(null)
  const [errors, setErrors]   = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(er => ({ ...er, [k]: undefined })) }

  const submit = async e => {
    e.preventDefault()
    setLoading(true); setErrors({}); setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (design) fd.append('design', design)
      await api.post('/public/card-print-requests', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
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
    <div className="min-h-screen flex bg-sand">
      {/* Panneau branding (gauche) */}
      <div className="hidden lg:flex flex-col justify-between w-[26rem] p-12 relative overflow-hidden bg-gradient-to-br from-brand via-brand-light to-accent">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 10%, #ffffff55, transparent 55%)' }} />
        <img src={logoWhite} alt="Signiq" className="h-10 w-auto max-w-[150px] self-start relative" />
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative"
        >
          <h2 className="text-white text-3xl font-bold leading-tight mb-4 tracking-tight">Cartes de service du personnel</h2>
          <p className="text-white/70 text-sm">Décrivez votre besoin : notre équipe imprime vos cartes avec votre visuel et vous les livre. Pas de compte requis.</p>
          <ul className="mt-6 space-y-2 text-white/80 text-sm">
            <li className="flex items-center gap-2"><Icon name="check_circle" size={18} /> Votre design, format carte CR80</li>
            <li className="flex items-center gap-2"><Icon name="check_circle" size={18} /> Impression & livraison gérées</li>
            <li className="flex items-center gap-2"><Icon name="check_circle" size={18} /> Devis rapide après réception</li>
          </ul>
        </motion.div>
        <p className="text-white/40 text-xs relative">© 2026 Signiq</p>
      </div>

      {/* Formulaire (droite) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md py-8"
        >
          <div className="lg:hidden mb-8"><img src={logoFull} alt="Signiq" className="h-10 w-auto" /></div>

          {done ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Icon name="check_circle" size={36} />
              </div>
              <h1 className="text-gray-900 text-2xl font-bold mb-2 tracking-tight">Demande reçue</h1>
              <p className="text-gray-500 text-sm">Merci ! Notre équipe examine votre demande et vous recontacte rapidement par e-mail.</p>
            </div>
          ) : (
            <>
              <h1 className="text-gray-900 text-2xl font-bold mb-1 tracking-tight">Demander des cartes</h1>
              <p className="text-gray-500 text-sm mb-6">Remplissez ce formulaire, nous revenons vers vous avec un devis.</p>

              {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

              <form onSubmit={submit} className="space-y-4">
                {/* Honeypot anti-spam : invisible, laissé vide par un humain. */}
                <input
                  type="text" name="website" tabIndex={-1} autoComplete="off"
                  value={form.website} onChange={e => set('website', e.target.value)}
                  className="hidden" aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre nom <span className="text-red-500">*</span></label>
                    <input className={inputClass} placeholder="Awa Mbayo" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} autoFocus />
                    {errors.contact_name && <p className="text-xs text-red-600 mt-1">{errors.contact_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Société</label>
                    <input className={inputClass} placeholder="Clinique Horizon" value={form.contact_company} onChange={e => set('contact_company', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail <span className="text-red-500">*</span></label>
                    <input type="email" className={inputClass} placeholder="vous@email.com" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                    {errors.contact_email && <p className="text-xs text-red-600 mt-1">{errors.contact_email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                    <input className={inputClass} placeholder="+243 900 000 000" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de cartes <span className="text-red-500">*</span></label>
                  <input type="number" min="1" className={inputClass} placeholder="Ex. 80" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                  {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse de livraison</label>
                  <input className={inputClass} placeholder="Où livrer les cartes" value={form.delivery_address} onChange={e => set('delivery_address', e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre visuel <span className="text-gray-400 font-normal">(optionnel, image)</span></label>
                  <input
                    type="file" accept="image/*"
                    onChange={e => setDesign(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20"
                  />
                  {errors.design && <p className="text-xs text-red-600 mt-1">{errors.design}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Précisions</label>
                  <textarea rows={3} className={inputClass} placeholder="Support, finition, délai souhaité…" value={form.note} onChange={e => set('note', e.target.value)} />
                  {errors.note && <p className="text-xs text-red-600 mt-1">{errors.note}</p>}
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white rounded-xl bg-brand hover:bg-brand-dark shadow-lg shadow-brand/20 disabled:opacity-60"
                >
                  {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Envoyer ma demande
                </button>
                <p className="text-xs text-gray-400 text-center">Déjà client ? Vous pouvez aussi demander l'impression depuis votre espace.</p>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
