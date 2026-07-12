import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../../context/AuthContext'
import logoWhite from '../../assets/logo-white.png'
import logoFull from '../../assets/logo-full.png'

function Logo({ className = '' }) {
  // self-start : empêche l'étirement par align-items:stretch du panneau flex.
  return <img src={logoWhite} alt="Signiq" className={`h-10 w-auto max-w-[150px] self-start ${className}`} />
}

export default function LoginPage() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const { login }             = useAuth()
  const navigate              = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await login(form.email, form.password)
      navigate(data?.user?.role === 'super_admin' ? '/admin/organizations' : '/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects.')
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
        <Logo className="relative" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <h2 className="text-white text-3xl font-bold leading-tight mb-4 tracking-tight">Gérez votre communauté en toute simplicité</h2>
          <p className="text-white/70 text-sm">Suivi des présences, gestion des membres et rapports — tout en un seul endroit.</p>
        </motion.div>
        <p className="text-white/40 text-xs relative">© 2026 Signiq · Gestion de présence par QR</p>
      </div>

      {/* Formulaire (droite) */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Logo mobile */}
          <div className="lg:hidden mb-10">
            <img src={logoFull} alt="Signiq" className="h-10 w-auto" />
          </div>

          <h1 className="text-gray-900 text-2xl font-bold mb-1 tracking-tight">Connexion</h1>
          <p className="text-gray-500 text-sm mb-8">Espace administrateur</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="admin@famillerespect.cd"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className={inputClass}
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-brand/20"
            >
              {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              Se connecter
            </motion.button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Vous organisez un événement ? <Link to="/register" className="text-brand font-semibold hover:underline">Créer un espace</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
