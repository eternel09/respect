import { useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import api, { apiErrorMessage } from '../lib/axios'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export default function OnboardingPage() {
  const [form, setForm]       = useState({ first_name: '', last_name: '', phone: '', address: '' })
  const [errors, setErrors]   = useState({})
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)

  // Parallax souris sur le panneau hero
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 70, damping: 18 })
  const sy = useSpring(my, { stiffness: 70, damping: 18 })
  const heroX = useTransform(sx, [-0.5, 0.5], [-14, 14])
  const heroY = useTransform(sy, [-0.5, 0.5], [-10, 10])
  const glowX = useTransform(sx, [-0.5, 0.5], [22, -22])
  const glowY = useTransform(sy, [-0.5, 0.5], [18, -18])

  const handleMouse = e => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const resetMouse = () => { mx.set(0); my.set(0) }

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(e2 => ({ ...e2, [e.target.name]: undefined }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    setErrors({})
    try {
      const res = await api.post('/onboarding', {
        first_name: form.first_name,
        last_name:  form.last_name,
        phone:      form.phone,
      })
      setStatus({ type: 'success', message: res.data.message })
      setForm({ first_name: '', last_name: '', phone: '', address: '' })
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 409) {
        setStatus({ type: 'warning', message: data.message })
      } else if (err.response?.status === 422) {
        setErrors(Object.fromEntries(Object.entries(data.errors).map(([k, v]) => [k, v[0]])))
        setStatus({ type: 'error', message: 'Veuillez corriger les champs en surbrillance.' })
      } else {
        setStatus({ type: 'error', message: apiErrorMessage(err) })
      }
    } finally {
      setLoading(false)
    }
  }

  const inputBase =
    'w-full px-4 py-2.5 border rounded-xl text-sm bg-white transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-sand">
      <motion.div
        onMouseMove={handleMouse}
        onMouseLeave={resetMouse}
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-brand/5 ring-1 ring-black/5 overflow-hidden flex flex-col-reverse md:flex-row"
      >

        {/* ── Formulaire ── */}
        <motion.div variants={container} initial="hidden" animate="show" className="flex-1 p-6 sm:p-10">
          {/* Logo */}
          <motion.div variants={item} className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand shadow-sm shadow-brand/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
            </div>
            <span className="font-bold text-gray-900">Famille Respect</span>
          </motion.div>

          <motion.h1 variants={item} className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bienvenue dans notre famille</motion.h1>
          <motion.p variants={item} className="text-gray-500 text-sm mb-8 leading-relaxed">Veuillez remplir les informations ci-dessous pour intégrer la communauté Famille Respect.</motion.p>

          {status && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                status.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>
              {status.message}
            </motion.div>
          )}

          <motion.form variants={item} onSubmit={handleSubmit} className="space-y-5">
            {/* Nom complet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom Complet</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  name="first_name"
                  placeholder="Ex. Jean"
                  value={form.first_name}
                  onChange={handleChange}
                  className={`${inputBase} flex-1 ${errors.first_name ? 'border-red-300' : 'border-gray-200'}`}
                />
                <input
                  name="last_name"
                  placeholder="Ex. Dupont"
                  value={form.last_name}
                  onChange={handleChange}
                  className={`${inputBase} flex-1 ${errors.last_name ? 'border-red-300' : 'border-gray-200'}`}
                />
              </div>
              {(errors.first_name || errors.last_name) && (
                <p className="text-xs text-red-600 mt-1">{errors.first_name || errors.last_name}</p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de Téléphone</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+243 81 000 00 00"
                  value={form.phone}
                  onChange={handleChange}
                  className={`${inputBase} pl-9 ${errors.phone ? 'border-red-300' : 'border-gray-200'}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              <p className="text-xs text-gray-400 mt-2">Un SMS de bienvenue sera envoyé automatiquement lors de l'enregistrement.</p>
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse de Résidence</label>
              <textarea
                name="address"
                placeholder="Votre adresse complète..."
                value={form.address}
                onChange={handleChange}
                rows={3}
                className={`${inputBase} border-gray-200 resize-none`}
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2
                         bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60
                         shadow-lg shadow-brand/20"
            >
              {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Enregistrer et rejoindre la famille »
            </motion.button>
          </motion.form>
        </motion.div>

        {/* ── Panneau latéral ── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="md:w-80 flex-shrink-0 p-5 flex flex-col gap-4 bg-cream border-b md:border-b-0 md:border-l border-black/5"
        >
          {/* Hero communauté (parallax) */}
          <motion.div variants={item} className="relative rounded-2xl overflow-hidden h-40 md:h-44 flex items-end p-5 bg-gradient-to-br from-brand via-brand-light to-accent">
            <motion.div
              className="absolute inset-0 opacity-25"
              style={{ x: glowX, y: glowY, background: 'radial-gradient(circle at 25% 15%, #ffffff66, transparent 60%)' }}
            />
            <motion.div className="relative" style={{ x: heroX, y: heroY }}>
              <h2 className="text-white text-lg font-bold leading-tight">Une communauté unie</h2>
              <p className="text-white/80 text-xs mt-1">Plus de 500 familles nous font déjà confiance.</p>
            </motion.div>
          </motion.div>

          {/* Carte processus */}
          <motion.div variants={item} className="bg-white rounded-2xl p-4 ring-1 ring-black/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent-soft">
                <svg className="w-4 h-4 fill-accent-dark" viewBox="0 0 24 24"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 117 7v2a9 9 0 000-18z" /><path d="M12.5 8H11v5l4.25 2.52.75-1.23-3.5-2.04z" /></svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Processus instantané</p>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed">Votre accès digital est configuré en temps réel. Notre système envoie un lien sécurisé par SMS pour finaliser votre profil.</p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-3 text-center ring-1 ring-black/5">
              <p className="font-bold text-lg text-brand">99%</p>
              <p className="text-gray-400 text-xs">Taux de satisfaction</p>
            </div>
            <div className="bg-white rounded-2xl p-3 text-center ring-1 ring-black/5">
              <p className="font-bold text-lg text-brand">&lt; 1min</p>
              <p className="text-gray-400 text-xs">Temps d'inscription</p>
            </div>
          </motion.div>
        </motion.div>

      </motion.div>
    </div>
  )
}
