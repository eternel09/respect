import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../../components/AuthShell'
import api, { apiErrorMessage } from '../../lib/axios'
import { authInputCls } from '../../lib/passwordForm'

/** Mot de passe oublié : envoi d'un lien de réinitialisation par e-mail (public). */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null) // message de confirmation
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setSending(true); setError(null)
    try {
      const res = await api.post('/admin/forgot-password', { email })
      setSent(res.data.message)
    } catch (err) {
      setError(apiErrorMessage(err, 'Envoi impossible pour le moment.'))
    } finally { setSending(false) }
  }

  return (
    <AuthShell icon="lock_reset" title="Mot de passe oublié"
      subtitle={sent ? null : 'Indiquez l’adresse e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.'}>
      {sent ? (
        <div className="mt-4">
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{sent}</p>
          <p className="text-xs text-gray-500 mt-3">Le lien est valable 60 minutes. Pensez à regarder dans les courriers indésirables.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">Adresse e-mail</label>
            <input id="email" type="email" required autoFocus autoComplete="email" placeholder="vous@organisation.cd"
              value={email} onChange={e => setEmail(e.target.value)} className={authInputCls} />
          </div>
          <button type="submit" disabled={sending}
            className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
            {sending && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
            Envoyer le lien
          </button>
        </form>
      )}
      <p className="mt-5 text-center text-sm"><Link to="/admin/login" className="text-brand font-medium hover:underline">Retour à la connexion</Link></p>
    </AuthShell>
  )
}
