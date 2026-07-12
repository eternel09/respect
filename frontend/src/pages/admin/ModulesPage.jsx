import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import { useAuth } from '../../context/AuthContext'
import { MODULES } from '../../lib/modules'
import api, { apiErrorMessage } from '../../lib/axios'

/**
 * Suite d'applications : l'organisateur active/désactive les modules de son
 * espace. Désactiver ne supprime aucune donnée — le module se masque simplement.
 */
export default function ModulesPage() {
  const { refreshUser } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [enabled, setEnabled] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/admin/modules')
      .then((res) => { setCatalog(res.data.catalog || []); setEnabled(res.data.enabled || []) })
      .catch((err) => setError(apiErrorMessage(err, 'Chargement impossible.')))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (key) => {
    const next = enabled.includes(key) ? enabled.filter((k) => k !== key) : [...enabled, key]
    setSavingKey(key); setError(null)
    try {
      const res = await api.put('/admin/modules', { modules: next })
      setEnabled(res.data.modules || next)
      await refreshUser() // met à jour la sidebar immédiatement
    } catch (err) {
      setError(apiErrorMessage(err, 'Enregistrement impossible.'))
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <AdminLayout>
      <PageShell title="Applications" subtitle="Activez les modules dont vous avez besoin. Vous pouvez en ajouter ou en retirer à tout moment.">
        {error && <div className="mb-5 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

        {loading ? (
          <div className="py-16 text-center"><span className="inline-block animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {catalog.map((m) => {
              const meta = MODULES[m.key] || {}
              const Icon = meta.icon
              const color = meta.color || '#6b7280'
              const on = enabled.includes(m.key)
              const busy = savingKey === m.key
              return (
                <div key={m.key} className="relative bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 overflow-hidden">
                  <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white" style={{ background: color }}>
                      {Icon ? <Icon /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">{m.label}</h3>
                        {on && <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Actif</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{m.description}</p>
                      <button
                        onClick={() => toggle(m.key)}
                        disabled={busy}
                        className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 transition-colors disabled:opacity-60 ${
                          on ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : 'text-white bg-accent-dark hover:bg-accent'
                        }`}
                      >
                        {busy && <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
                        {on ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PageShell>
    </AdminLayout>
  )
}
