import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '../../context/AuthContext'
import { homeForModules } from '../../lib/modules'
import api from '../../lib/axios'
import logoWhite from '../../assets/logo-white.png'
import logoFull from '../../assets/logo-full.png'

/**
 * Auto-inscription d'une sous-organisation via le lien d'invitation d'une
 * organisation mère. Le responsable crée sa sous-organisation + son compte admin,
 * automatiquement rattachée au réseau, puis est connecté directement.
 */
export default function RegisterNetworkPage() {
  const { token } = useParams()
  const { joinNetwork } = useAuth()
  const navigate = useNavigate()

  const [parentName, setParentName] = useState(null) // null = chargement
  const [invalid, setInvalid] = useState(false)
  const [form, setForm] = useState({ organization_name: '', name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get(`/register/network/${token}`)
      .then((res) => setParentName(res.data.organization.name))
      .catch(() => setInvalid(true))
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (form.password !== form.password_confirmation) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      const data = await joinNetwork(token, form)
      navigate(homeForModules(data?.user?.organization?.modules || []))
    } catch (err) {
      const d = err.response?.data
      setError(d?.errors ? Object.values(d.errors)[0][0] : (d?.message || 'Inscription impossible.'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors'

  return (
    <div className="min-h-screen flex bg-sand">
      {/* Panneau branding */}
      <div className="hidden lg:flex flex-col justify-between w-[26rem] p-12 relative overflow-hidden bg-gradient-to-br from-brand via-brand-light to-accent">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 10%, #ffffff55, transparent 55%)' }} />
        <img src={logoWhite} alt="Signiq" className="h-10 w-auto max-w-[150px] self-start relative" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative">
          <h2 className="text-white text-3xl font-bold leading-tight mb-4 tracking-tight">Rejoignez votre réseau</h2>
          <p className="text-white/70 text-sm">Votre sous-organisation gère sa présence et ses événements en toute autonomie. Le réseau, lui, suit les statistiques d'ensemble.</p>
        </motion.div>
        <p className="text-white/40 text-xs relative">© 2026 Signiq</p>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md py-8">
          <div className="lg:hidden mb-8"><img src={logoFull} alt="Signiq" className="h-10 w-auto" /></div>

          {invalid ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
              </div>
              <h1 className="text-gray-900 text-xl font-bold mb-1">Lien invalide</h1>
              <p className="text-gray-500 text-sm">Ce lien d'invitation n'est plus valide. Demandez-en un nouveau à l'administrateur de votre réseau.</p>
              <Link to="/admin/login" className="inline-block mt-6 text-brand font-semibold text-sm hover:underline">Aller à la connexion</Link>
            </div>
          ) : parentName === null ? (
            <div className="py-16 text-center"><span className="inline-block animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand/10 rounded-full px-3 py-1 mb-3">Réseau · {parentName}</span>
              <h1 className="text-gray-900 text-2xl font-bold mb-1 tracking-tight">Créer votre sous-organisation</h1>
              <p className="text-gray-500 text-sm mb-6">Elle rejoindra <span className="font-medium text-gray-700">{parentName}</span>. Vous en serez l'administrateur.</p>

              {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la sous-organisation</label>
                  <input className={inputClass} value={form.organization_name} onChange={(e) => set('organization_name', e.target.value)} placeholder="Paroisse de Limete" autoFocus />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre nom</label>
                    <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jean Mukendi" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="vous@email.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                    <input type="password" className={inputClass} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer</label>
                    <input type="password" className={inputClass} value={form.password_confirmation} onChange={(e) => set('password_confirmation', e.target.value)} placeholder="••••••••" />
                  </div>
                </div>

                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-brand/20">
                  {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Créer et rejoindre
                </motion.button>
              </form>

              <p className="text-sm text-gray-500 mt-6 text-center">
                Vous avez déjà un compte ? <Link to="/admin/login" className="text-brand font-semibold hover:underline">Se connecter</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
