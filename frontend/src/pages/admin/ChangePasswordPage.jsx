import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { PasswordInput } from '../../components/AuthShell'
import Icon from '../../components/ui/Icon'
import { useAuth } from '../../context/AuthContext'
import { apiErrorMessage } from '../../lib/axios'
import { PASSWORD_RULE, fieldErrors, homeFor } from '../../lib/passwordForm'

/**
 * Changer son mot de passe. Imposé à la première connexion quand le compte a été
 * créé (ou réinitialisé) avec un mot de passe temporaire : la navigation reste
 * bloquée ici tant qu'un mot de passe personnel n'est pas choisi.
 */
export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const forced = !!user?.must_change_password
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const set = k => v => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setError(null); setErrors({})
    try {
      const u = await changePassword(form)
      if (forced) navigate(homeFor(u), { replace: true })
      else setDone(true)
    } catch (err) {
      const fe = fieldErrors(err)
      if (Object.keys(fe).length) setErrors(fe)
      else setError(apiErrorMessage(err, 'Modification impossible.'))
    } finally { setSaving(false) }
  }

  if (done) {
    return (
      <AuthShell icon="check_circle" title="Mot de passe modifié" subtitle="Vos autres sessions ouvertes ont été fermées par sécurité.">
        <Link to={homeFor(user)} className="block text-center w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl">
          Retour à mon espace
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      icon="key"
      title={forced ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe'}
      subtitle={forced
        ? 'Votre compte a été ouvert avec un mot de passe temporaire. Remplacez-le par un mot de passe personnel pour continuer.'
        : `Connecté en tant que ${user?.email}.`}
    >
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <PasswordInput id="current_password" autoComplete="current-password" autoFocus
          label={forced ? 'Mot de passe temporaire reçu' : 'Mot de passe actuel'}
          value={form.current_password} onChange={set('current_password')} error={errors.current_password} />
        <PasswordInput id="password" label="Nouveau mot de passe"
          value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordInput id="password_confirmation" label="Confirmer le nouveau mot de passe"
          value={form.password_confirmation} onChange={set('password_confirmation')} />
        <p className="text-xs text-gray-500 flex items-center gap-1.5"><Icon name="info" size={15} />{PASSWORD_RULE}</p>
        <button type="submit" disabled={saving}
          className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
          {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
          Enregistrer
        </button>
      </form>
      <div className="mt-5 text-center text-sm">
        {forced
          ? <button onClick={async () => { await logout(); navigate('/admin/login') }} className="text-gray-500 hover:text-gray-800">Se déconnecter</button>
          : <Link to={homeFor(user)} className="text-gray-500 hover:text-gray-800">Annuler</Link>}
      </div>
    </AuthShell>
  )
}
