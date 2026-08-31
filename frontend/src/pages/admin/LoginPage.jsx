import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../../context/AuthContext'
import Icon from '../../components/ui/Icon'
import logoWhite from '../../assets/logo-white.png'
import logoFull from '../../assets/logo-full.png'

const FEATURES = [
  ['qr_code_2', 'Pointage instantané', 'Un scan de QR code, la présence est enregistrée.'],
  ['groups', 'Membres centralisés', 'Une base unique, multi-organisations, toujours à jour.'],
  ['celebration', 'Invitations & RSVP', 'Cartons, confirmations et cartes WhatsApp automatisés.'],
]

const ease = [0.22, 1, 0.36, 1]

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const data = await login(form.email, form.password)
      navigate(data?.user?.role === 'super_admin' ? '/admin/organizations' : '/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-cream">
      {/* ── Panneau de marque (gauche) ─────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] max-w-2xl p-14 relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(150deg, #101f36 0%, #1e3a5f 46%, #2f4f78 78%, #b5652a 150%)' }}>
        {/* halos ambiants */}
        <div className="orb" style={{ width: 460, height: 460, top: -120, right: -120, background: 'radial-gradient(circle at 35% 35%, rgba(224,138,60,.55), transparent 62%)' }} />
        <div className="orb orb--slow" style={{ width: 380, height: 380, bottom: -110, left: -90, background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,.18), transparent 60%)' }} />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '46px 46px' }} />

        <img src={logoWhite} alt="Signiq" className="h-9 w-auto max-w-[140px] self-start relative" />

        <div className="relative">
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
            className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-soft/90 mb-5">
            Présence · Onboarding · Événements
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.05 }}
            className="font-display text-[2.9rem] leading-[1.08] font-medium tracking-tight text-balance mb-5">
            La présence de votre communauté, en un scan.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.12 }}
            className="text-white/70 text-[15px] leading-relaxed max-w-md mb-10">
            Membres, pointage QR, badges, invitations et rapports — réunis dans un espace clair et sécurisé.
          </motion.p>

          <div className="space-y-3.5">
            {FEATURES.map(([ico, title, desc], i) => (
              <motion.div key={title}
                initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease, delay: 0.2 + i * 0.09 }}
                className="flex items-start gap-3.5">
                <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-white/10 ring-1 ring-white/15 backdrop-blur-sm text-accent-soft">
                  <Icon name={ico} size={22} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold leading-tight">{title}</p>
                  <p className="text-white/55 text-[13px] leading-snug">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs relative">© 2026 Signiq · Conçu pour les organisations qui rassemblent.</p>
      </div>

      {/* ── Formulaire (droite) ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="w-full max-w-[400px]">
          <div className="lg:hidden mb-10"><img src={logoFull} alt="Signiq" className="h-9 w-auto" /></div>

          <h2 className="font-display text-[2rem] leading-tight font-medium text-gray-900 tracking-tight">Bon retour</h2>
          <p className="text-gray-500 text-[15px] mt-1.5 mb-8">Connectez-vous à votre espace d'administration.</p>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <Icon name="error" size={18} className="mt-px shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Adresse email" icon="mail">
              <input type="email" required autoFocus placeholder="vous@organisation.cd"
                value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls} />
            </Field>

            <Field label="Mot de passe" icon="lock">
              <input type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                aria-label={showPw ? 'Masquer' : 'Afficher'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <Icon name={showPw ? 'visibility_off' : 'visibility'} size={20} />
              </button>
            </Field>

            <motion.button type="submit" disabled={loading}
              whileHover={{ y: -2 }} whileTap={{ y: 0, scale: 0.99 }}
              className="group w-full py-3.5 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl text-[15px] disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-brand/25">
              {loading
                ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                : <>Se connecter <Icon name="arrow_forward" size={20} className="transition-transform group-hover:translate-x-0.5" /></>}
            </motion.button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-[13px] text-gray-400 justify-center">
            <Icon name="shield" size={16} className="text-emerald-500" />
            Connexion chiffrée · vos données restent privées
          </div>

          <p className="text-sm text-gray-500 mt-8 text-center">
            Vous organisez un événement ?{' '}
            <Link to="/register" className="text-brand font-semibold hover:text-brand-dark">Créer un espace</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full pl-11 pr-4 py-3 rounded-xl text-[15px] bg-white text-gray-900 placeholder:text-gray-400 ' +
  'border border-gray-200 shadow-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all'

function Field({ label, icon, children }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-gray-700 mb-1.5">{label}</span>
      <span className="relative block">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Icon name={icon} size={20} /></span>
        {children}
      </span>
    </label>
  )
}
