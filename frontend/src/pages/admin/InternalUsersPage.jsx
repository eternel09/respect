import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { apiErrorMessage } from '../../lib/axios'
import PlatformHeader from '../../components/PlatformHeader'
import Icon from '../../components/ui/Icon'

const ROLES = [
  { key: 'super_admin', label: 'Super-admin', desc: 'Pleins pouvoirs (organisations, équipe, demandes).' },
  { key: 'operator',    label: 'Opérateur',   desc: 'Traite les demandes d\'impression uniquement.' },
]
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.key, r.label]))
const roleBadge = role => role === 'super_admin'
  ? 'text-brand bg-brand/10'
  : 'text-violet-700 bg-violet-50'

// « 12 oct. 2026, 14:05 » ou « jamais »
const fmtLogin = iso => iso
  ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'jamais'

const inputBase =
  'w-full px-4 py-2.5 border rounded-xl text-sm bg-white transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand border-gray-200'

export default function InternalUsersPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [modal, setModal]     = useState(null)   // { mode:'create'|'edit', user? }
  const [secret, setSecret]   = useState(null)   // { email, password } après création/réinit

  const load = useCallback(() => {
    setLoading(true); setError(null)
    api.get('/admin/internal-users')
      .then(res => setItems(res.data.data))
      .catch(err => setError(apiErrorMessage(err, "Impossible de charger l'équipe.")))
      .finally(() => setLoading(false))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  // Réservé au super-admin (l'opérateur n'a pas accès à la gestion d'équipe).
  if (user && user.role !== 'super_admin') return <Navigate to="/admin/print-requests" replace />

  const handleLogout = async () => { await logout(); navigate('/admin/login') }

  const resetPassword = async u => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${u.name} ?`)) return
    setError(null)
    try {
      const res = await api.post(`/admin/internal-users/${u.id}/password`, {})
      setSecret({ email: u.email, password: res.data.temp_password })
    } catch (err) { setError(apiErrorMessage(err, 'Réinitialisation impossible.')) }
  }

  // Désactiver : l'accès est coupé (sessions fermées) mais le compte et son historique restent.
  const toggleActive = async u => {
    const next = !u.is_active
    if (!next && !window.confirm(`Désactiver le compte de ${u.name} ? Il ne pourra plus se connecter.`)) return
    setError(null)
    try {
      const res = await api.patch(`/admin/internal-users/${u.id}/active`, { active: next })
      setItems(list => list.map(i => (i.id === u.id ? res.data.user : i)))
    } catch (err) { setError(apiErrorMessage(err, 'Modification impossible.')) }
  }

  const remove = async u => {
    if (!window.confirm(`Supprimer définitivement ${u.name} ?`)) return
    setError(null)
    try {
      await api.delete(`/admin/internal-users/${u.id}`)
      setItems(list => list.filter(i => i.id !== u.id))
    } catch (err) { setError(apiErrorMessage(err, 'Suppression impossible.')) }
  }

  const onSaved = (saved, tempPassword) => {
    setItems(list => {
      const exists = list.some(i => i.id === saved.id)
      return exists ? list.map(i => (i.id === saved.id ? saved : i)) : [...list, saved]
    })
    setModal(null)
    if (tempPassword) setSecret({ email: saved.email, password: tempPassword })
  }

  return (
    <div className="min-h-screen bg-sand">
      <PlatformHeader user={user} onLogout={handleLogout} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Utilisateurs internes</h1>
              <p className="text-gray-500 text-sm mt-1">L'équipe plateforme : super-admins (pleins pouvoirs) et opérateurs (demandes d'impression).</p>
            </div>
            <button onClick={() => setModal({ mode: 'create' })}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl px-4 py-2.5 bg-brand hover:bg-brand-dark transition-colors shadow-lg shadow-brand/20 shrink-0">
              <Icon name="person_add" size={18} />Nouvel utilisateur
            </button>
          </div>

          {/* Mot de passe temporaire (création / réinitialisation) : affiché une fois */}
          {secret && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Mot de passe temporaire</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    {secret.email} · <span className="font-mono font-bold bg-white px-2 py-0.5 rounded">{secret.password}</span>
                  </p>
                  <p className="text-xs text-emerald-600 mt-1.5">Communiquez-le à l'intéressé : il devra le remplacer par son propre mot de passe à la première connexion. Il ne sera plus affiché.</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => navigator.clipboard?.writeText(secret.password)} title="Copier"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-700 hover:bg-emerald-100"><Icon name="content_copy" size={18} /></button>
                  <button onClick={() => setSecret(null)} title="Fermer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-700 hover:bg-emerald-100"><Icon name="close" size={18} /></button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          {loading ? (
            <div className="py-16 flex justify-center"><span className="animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
          ) : (
            <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm divide-y divide-black/5">
              {items.map(u => {
                const self = u.id === user?.id
                return (
                  <div key={u.id} className={`flex items-center justify-between gap-3 px-5 py-4 ${u.is_active ? '' : 'bg-gray-50'}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold truncate ${u.is_active ? 'text-gray-900' : 'text-gray-500'}`}>{u.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge(u.role)}`}>{ROLE_LABEL[u.role] || u.role}</span>
                        {!u.is_active && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-gray-600 bg-gray-200"><Icon name="block" size={13} />Désactivé</span>}
                        {u.is_active && u.must_change_password && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-amber-800 bg-amber-50"><Icon name="key" size={13} />Mot de passe temporaire</span>}
                        {self && <span className="text-xs text-gray-400">(vous)</span>}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Dernière connexion : {fmtLogin(u.last_login_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setModal({ mode: 'edit', user: u })} title="Modifier"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-sand"><Icon name="edit" size={18} /></button>
                      <button onClick={() => resetPassword(u)} title="Réinitialiser le mot de passe"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-sand"><Icon name="key" size={18} /></button>
                      {!self && (
                        <button onClick={() => toggleActive(u)}
                          title={u.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                          aria-label={u.is_active ? `Désactiver le compte de ${u.name}` : `Réactiver le compte de ${u.name}`}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center hover:bg-sand ${u.is_active ? 'text-gray-500' : 'text-emerald-600'}`}>
                          <Icon name={u.is_active ? 'block' : 'check_circle'} size={18} />
                        </button>
                      )}
                      {!self && (
                        <button onClick={() => remove(u)} title="Supprimer"
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50"><Icon name="delete" size={18} /></button>
                      )}
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && <p className="px-5 py-10 text-center text-sm text-gray-400">Aucun utilisateur interne.</p>}
            </div>
          )}
        </motion.div>
      </main>

      <UserModal
        modal={modal}
        currentUserId={user?.id}
        onClose={() => setModal(null)}
        onSaved={onSaved}
      />
    </div>
  )
}

/** Modale création / modification d'un utilisateur interne. */
function UserModal({ modal, currentUserId, onClose, onSaved }) {
  const editing = modal?.mode === 'edit'
  const [form, setForm]       = useState({ name: '', email: '', role: 'operator', password: '' })
  const [errors, setErrors]   = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (modal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrors({}); setError(null)
      setForm(editing
        ? { name: modal.user.name, email: modal.user.email, role: modal.user.role, password: '' }
        : { name: '', email: '', role: 'operator', password: '' })
    }
  }, [modal, editing])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(er => ({ ...er, [k]: undefined })) }
  const isSelf = editing && modal.user.id === currentUserId

  const submit = async e => {
    e.preventDefault()
    setLoading(true); setErrors({}); setError(null)
    try {
      if (editing) {
        const res = await api.patch(`/admin/internal-users/${modal.user.id}`, {
          name: form.name, email: form.email, role: form.role,
        })
        onSaved(res.data.user)
      } else {
        const res = await api.post('/admin/internal-users', {
          name: form.name, email: form.email, role: form.role,
          password: form.password || undefined,
        })
        onSaved(res.data.user, res.data.temp_password)
      }
    } catch (err) {
      if (err.response?.status === 422 && err.response.data.errors) {
        setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setError(apiErrorMessage(err))
      }
    } finally { setLoading(false) }
  }

  return (
    <AnimatePresence>
      {modal && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()} />
          <motion.div className="relative w-full max-w-md bg-white rounded-3xl ring-1 ring-black/5 shadow-xl p-6"
            initial={{ scale: 0.96, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur interne'}</h2>
              <button onClick={() => !loading && onClose()} className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-gray-400 hover:bg-sand"><Icon name="close" size={20} /></button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input className={inputBase} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jean Opérateur" required />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className={inputBase} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@equipe.cd" required />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <div className="space-y-2">
                  {ROLES.map(r => (
                    <label key={r.key} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${form.role === r.key ? 'border-brand bg-brand/5' : 'border-gray-200 hover:bg-sand'} ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      <input type="radio" name="role" className="mt-0.5 accent-[#1e3a5f]"
                        checked={form.role === r.key} disabled={isSelf}
                        onChange={() => set('role', r.key)} />
                      <span>
                        <span className="block text-sm font-medium text-gray-800">{r.label}</span>
                        <span className="block text-xs text-gray-500">{r.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {isSelf && <p className="text-xs text-gray-400 mt-1">Vous ne pouvez pas modifier votre propre rôle.</p>}
                {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
              </div>

              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe <span className="text-gray-400 font-normal">(optionnel)</span></label>
                  <input type="text" className={inputBase} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Laisser vide pour générer" />
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => !loading && onClose()} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-sand">Annuler</button>
                <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60">
                  {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
