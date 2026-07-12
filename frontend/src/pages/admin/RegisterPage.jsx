import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../../context/AuthContext'
import { MODULES, MODULE_ORDER, homeForModules } from '../../lib/modules'
import logoWhite from '../../assets/logo-white.png'
import logoFull from '../../assets/logo-full.png'

/**
 * Auto-inscription publique : un organisateur crée son espace et choisit ses
 * applications. Aucune connaissance de la « gestion de présence » requise s'il
 * ne coche que « Invitations & événements ».
 */
export default function RegisterPage() {
  const [form, setForm] = useState({
    organization_name: '', name: '', email: '', password: '', password_confirmation: '',
  })
  const [modules, setModules] = useState(['occasions'])
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const { register }          = useAuth()
  const navigate              = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleModule = (key) =>
    setModules(ms => ms.includes(key) ? ms.filter(k => k !== key) : [...ms, key])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.password_confirmation) { setError('Les mots de passe ne correspondent pas.'); return }
    if (modules.length === 0) { setError('Choisissez au moins une application.'); return }
    setLoading(true)
    try {
      const data = await register({ ...form, modules })
      navigate(homeForModules(data?.user?.organization?.modules || modules))
    } catch (err) {
      const d = err.response?.data
      setError(d?.errors ? Object.values(d.errors)[0][0] : (d?.message || "Inscription impossible."))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 ' +
    'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors'

  return (
    <div className="min-h-screen flex bg-sand">
      {/* Panneau branding (gauche) */}
      <div className="hidden lg:flex flex-col justify-between w-[26rem] p-12 relative overflow-hidden bg-gradient-to-br from-brand via-brand-light to-accent">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 10%, #ffffff55, transparent 55%)' }} />
        <img src={logoWhite} alt="Signiq" className="h-10 w-auto max-w-[150px] self-start relative" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <h2 className="text-white text-3xl font-bold leading-tight mb-4 tracking-tight">Créez votre espace en quelques secondes</h2>
          <p className="text-white/70 text-sm">Gérez les invitations de votre événement, ou la présence de votre organisation — activez seulement ce dont vous avez besoin.</p>
        </motion.div>
        <p className="text-white/40 text-xs relative">© 2026 Signiq</p>
      </div>

      {/* Formulaire (droite) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md py-8"
        >
          <div className="lg:hidden mb-8">
            <img src={logoFull} alt="Signiq" className="h-10 w-auto" />
          </div>

          <h1 className="text-gray-900 text-2xl font-bold mb-1 tracking-tight">Créer un espace</h1>
          <p className="text-gray-500 text-sm mb-6">Vous serez l'administrateur de votre organisation.</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'organisation / événement</label>
              <input className={inputClass} placeholder="Mariage de Sarah & David" value={form.organization_name} onChange={e => set('organization_name', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre nom</label>
                <input className={inputClass} placeholder="Sarah K." value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" className={inputClass} placeholder="vous@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                <input type="password" className={inputClass} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer</label>
                <input type="password" className={inputClass} placeholder="••••••••" value={form.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vos applications</label>
              <div className="space-y-2.5">
                {MODULE_ORDER.map((key) => {
                  const m = MODULES[key]
                  const Icon = m.icon
                  const on = modules.includes(key)
                  return (
                    <button type="button" key={key} onClick={() => toggleModule(key)}
                      className={`w-full flex items-center gap-3 text-left p-3 rounded-xl border transition-colors ${on ? 'border-transparent ring-2' : 'border-gray-200 hover:bg-white'}`}
                      style={on ? { background: m.color + '11', boxShadow: `0 0 0 2px ${m.color}` } : {}}>
                      <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-white" style={{ background: m.color }}>
                        {Icon ? <Icon /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900">{m.label}</span>
                        <span className="block text-xs text-gray-500 truncate">{m.description}</span>
                      </span>
                      <span className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${on ? 'text-white border-transparent' : 'border-gray-300'}`}
                        style={on ? { background: m.color } : {}}>
                        {on && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-brand/20"
            >
              {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Créer mon espace
            </motion.button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Vous avez déjà un compte ? <Link to="/admin/login" className="text-brand font-semibold hover:underline">Se connecter</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
