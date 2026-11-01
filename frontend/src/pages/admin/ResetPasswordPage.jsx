import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell, { PasswordInput } from '../../components/AuthShell'
import Icon from '../../components/ui/Icon'
import api, { apiErrorMessage } from '../../lib/axios'
import { PASSWORD_RULE, fieldErrors } from '../../lib/passwordForm'

/** Lien reçu par e-mail (`?token=…&email=…`) : choix d'un nouveau mot de passe. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const email = params.get('email') || ''
  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const set = k => v => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setError(null); setErrors({})
    try {
      await api.post('/admin/reset-password', { token, email, ...form })
      setDone(true)
    } catch (err) {
      const fe = fieldErrors(err)
      if (Object.keys(fe).length) setErrors(fe)
      else setError(apiErrorMessage(err, 'Réinitialisation impossible.'))
    } finally { setSaving(false) }
  }

  if (!token || !email) {
    return (
      <AuthShell icon="link_off" title="Lien incomplet" subtitle="Ouvrez le lien tel qu’il figure dans l’e-mail reçu, ou refaites une demande.">
        <Link to="/mot-de-passe-oublie" className="block text-center w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl">Refaire une demande</Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell icon="check_circle" title="Mot de passe réinitialisé" subtitle="Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.">
        <Link to="/admin/login" className="block text-center w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl">Se connecter</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell icon="lock_reset" title="Nouveau mot de passe" subtitle={`Pour le compte ${email}.`}>
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error} <Link to="/mot-de-passe-oublie" className="font-semibold underline">Nouvelle demande</Link>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <PasswordInput id="password" label="Nouveau mot de passe" autoFocus
          value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordInput id="password_confirmation" label="Confirmer le mot de passe"
          value={form.password_confirmation} onChange={set('password_confirmation')} />
        <p className="text-xs text-gray-500 flex items-center gap-1.5"><Icon name="info" size={15} />{PASSWORD_RULE}</p>
        <button type="submit" disabled={saving}
          className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
          {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
          Enregistrer le mot de passe
        </button>
      </form>
    </AuthShell>
  )
}
