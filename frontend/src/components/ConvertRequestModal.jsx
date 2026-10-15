import { useState } from 'react'
import api, { apiErrorMessage } from '../lib/axios'
import { MEMBER_TERM_OPTIONS, memberTerm } from '../lib/memberTerm'
import Icon from './ui/Icon'

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-gray-200 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

/**
 * Conversion d'une demande en organisation cliente (super-admin) : crée l'espace
 * client et son compte admin, importe le personnel joint. Les accès (mot de
 * passe temporaire) ne sont affichés qu'une fois.
 */
export default function ConvertRequestModal({ item, onClose, onConverted }) {
  const [form, setForm] = useState({
    name: item.contact?.company || item.contact?.name || '',
    admin_name: item.contact?.name || '',
    admin_email: item.contact?.email || '',
    member_term: item.member_term || 'agent',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
  const term = memberTerm(form.member_term)

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setError(null); setErrors({})
    try {
      const res = await api.post(`/admin/print-requests/${item.id}/convert`, form)
      setResult(res.data)
      onConverted(res.data.request)
    } catch (err) {
      if (err.response?.status === 422 && err.response.data.errors) {
        setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setError(apiErrorMessage(err, 'Conversion impossible.'))
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="convert-title"
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {result ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Icon name="check_circle" size={22} className="text-emerald-600" />
              <h2 id="convert-title" className="text-lg font-bold text-gray-900">Espace client créé</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">{result.message}</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-sand rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500">E-mail admin</p>
                <p className="font-medium text-gray-800 break-all">{result.admin?.email}</p>
              </div>
              <div className="bg-sand rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500">Mot de passe temporaire</p>
                <p className="font-mono font-bold text-brand tracking-wide">{result.temp_password}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {result.email_sent
                ? "Ces accès ont été envoyés par e-mail à l'administrateur. Ils ne seront plus affichés."
                : "L'e-mail n'a pas pu partir : communiquez ces accès vous-même. Ils ne seront plus affichés."}
            </p>
            {result.phones_dropped > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-3 flex gap-1.5">
                <Icon name="info" size={16} className="shrink-0" />
                {result.phones_dropped} numéro(s) déjà utilisé(s) sur la plateforme ou en double : ces personnes ont été importées sans téléphone.
              </p>
            )}
            <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark">Fermer</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 id="convert-title" className="text-lg font-bold text-gray-900 mb-1">Convertir en client</h2>
            <p className="text-sm text-gray-500 mb-4">
              Crée l'espace de l'organisation et son compte administrateur
              {item.staff_count > 0 && <>, et y importe les <b className="text-gray-800">{item.staff_count} {item.staff_count > 1 ? term.lowerMany : term.lowerOne}</b> de la liste jointe</>}.
            </p>

            {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <div className="space-y-3">
              <Field label="Organisation" error={errors.name}>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nom de l'administrateur" error={errors.admin_name}>
                  <input className={inputCls} value={form.admin_name} onChange={e => set('admin_name', e.target.value)} required />
                </Field>
                <Field label="E-mail de l'administrateur" error={errors.admin_email}>
                  <input type="email" className={inputCls} value={form.admin_email} onChange={e => set('admin_email', e.target.value)} required />
                </Field>
              </div>
              <Field label="Le personnel s'appelle" error={errors.member_term}>
                <select className={inputCls} value={form.member_term} onChange={e => set('member_term', e.target.value)}>
                  {MEMBER_TERM_OPTIONS.map(o => <option key={o.key} value={o.key}>{memberTerm(o.key).many} — {o.hint}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex gap-3 pt-5">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Créer l'espace client
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  )
}
