import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import api, { apiErrorMessage } from '../lib/axios'

const inputBase =
  'w-full px-4 py-2.5 border rounded-xl text-sm bg-white transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

export default function CreateOrganizationModal({ open, onClose, onCreated }) {
  const [form, setForm]       = useState({ name: '', admin_name: '', admin_email: '' })
  const [errors, setErrors]   = useState({})
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const reset = () => { setForm({ name: '', admin_name: '', admin_email: '' }); setErrors({}); setError(null) }
  const close = () => { if (!loading) { reset(); onClose() } }

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: undefined }))
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true); setErrors({}); setError(null)
    try {
      const res = await api.post('/admin/organizations', form)
      reset()
      onCreated(res.data)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setError(apiErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl ring-1 ring-black/5 shadow-xl p-6"
            initial={{ scale: 0.96, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">Nouvelle organisation</h2>
              <button onClick={close} className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-gray-400 hover:bg-sand">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-5">Un compte admin est créé et reçoit ses accès par email.</p>

            {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'organisation</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Ex. Église Grace"
                  className={`${inputBase} ${errors.name ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'administrateur</label>
                <input name="admin_name" value={form.admin_name} onChange={handleChange} placeholder="Ex. Paul Mukendi"
                  className={`${inputBase} ${errors.admin_name ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.admin_name && <p className="text-xs text-red-600 mt-1">{errors.admin_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de l'administrateur</label>
                <input name="admin_email" type="email" value={form.admin_email} onChange={handleChange} placeholder="admin@organisation.cd"
                  className={`${inputBase} ${errors.admin_email ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.admin_email && <p className="text-xs text-red-600 mt-1">{errors.admin_email}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={close} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60">
                  Annuler
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-brand/20">
                  {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Créer
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
