import { useEffect, useRef, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import api, { apiErrorMessage } from '../../lib/axios'
import { useAuth } from '../../context/AuthContext'

/** Liaison WhatsApp (service whatsapp-web.js) : statut + QR à scanner.
 *  GELÉ temporairement — non rendu (voir le bas du fichier). Conservé pour
 *  réactivation. eslint-disable pour ne pas signaler le composant inutilisé. */
// eslint-disable-next-line no-unused-vars
function WhatsAppSection() {
  const [status, setStatus] = useState({ state: 'loading', qr: null, message: null })
  const timer = useRef(null)

  const fetchStatus = async () => {
    try {
      const res = await api.get('/admin/whatsapp/status')
      setStatus(res.data)
    } catch (err) {
      setStatus(err.response?.data || { state: 'offline', qr: null })
    }
  }

  useEffect(() => {
    fetchStatus()
    // Polling léger : le QR de liaison tourne, et l'état passe à "ready" après scan
    timer.current = setInterval(fetchStatus, 5000)
    return () => clearInterval(timer.current)
  }, [])

  const STATES = {
    ready:        { dot: 'bg-emerald-500', label: 'Connecté — les cartes de membre peuvent être envoyées.' },
    qr:           { dot: 'bg-amber-500', label: 'En attente de liaison — scannez le QR ci-dessous.' },
    offline:      { dot: 'bg-gray-400', label: 'Service éteint.' },
    disconnected: { dot: 'bg-red-500', label: 'Déconnecté — reconnexion en cours…' },
    starting:     { dot: 'bg-amber-400', label: 'Démarrage du service…' },
    loading:      { dot: 'bg-gray-300', label: 'Vérification…' },
  }
  const st = STATES[status.state] || STATES.offline

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2.5 mb-1">
        <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 3.55A11.8 11.8 0 0012.04 0C5.5 0 .16 5.33.16 11.9c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.9 11.9 0 005.68 1.45c6.55 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.16-3.48-8.35z" /></svg>
        <h2 className="font-bold text-gray-900">WhatsApp</h2>
        <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
      </div>
      <p className="text-sm text-gray-500 mb-4">{st.label}</p>

      {status.state === 'qr' && status.qr && (
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-sand rounded-xl p-4">
          <img src={status.qr} alt="QR de liaison WhatsApp" className="w-40 h-40 rounded-lg bg-white p-2" />
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Ouvrez WhatsApp sur le téléphone de l'organisation</li>
            <li>Réglages → <b>Appareils connectés</b> → <b>Connecter un appareil</b></li>
            <li>Scannez ce QR code</li>
          </ol>
        </div>
      )}

      {status.state === 'offline' && (
        <div className="bg-sand rounded-xl p-4 text-sm text-gray-600">
          Démarrez le service : <code className="bg-white px-2 py-0.5 rounded font-mono text-xs">cd whatsapp && npm start</code>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { refreshUser } = useAuth()
  const [org, setOrg]           = useState(null)
  const [name, setName]         = useState('')
  const [color, setColor]       = useState('#1e3a5f')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setPreview] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [status, setStatus]     = useState(null) // { type, message }
  const [errors, setErrors]     = useState({})

  useEffect(() => {
    api.get('/admin/organization')
      .then(res => { setOrg(res.data); setName(res.data.name); setColor(res.data.theme_color || '#1e3a5f') })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const onLogoChange = e => {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setPreview(URL.createObjectURL(f))
    setErrors(er => ({ ...er, logo: undefined }))
  }

  const submit = async e => {
    e.preventDefault()
    setSaving(true); setStatus(null); setErrors({})
    try {
      const fd = new FormData()
      fd.append('name', name)
      if (color) fd.append('theme_color', color)
      if (logoFile) fd.append('logo', logoFile)
      const res = await api.post('/admin/organization', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOrg(res.data.organization)
      setLogoFile(null); setPreview(null)
      setStatus({ type: 'success', message: res.data.message })
      await refreshUser() // met à jour le nom de l'org dans la sidebar
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setStatus({ type: 'error', message: apiErrorMessage(err) })
      }
    } finally {
      setSaving(false)
    }
  }

  const currentLogo = logoPreview || org?.logo_url

  return (
    <AdminLayout>
      <PageShell title="Paramètres" subtitle="Modifiez les informations de votre organisation.">
        {loading ? (
          <div className="py-16 flex justify-center"><div className="animate-spin h-7 w-7 border-2 border-brand border-t-transparent rounded-full" /></div>
        ) : (
          <form onSubmit={submit} className="max-w-xl space-y-6">
            {status && (
              <div className={`px-4 py-3 rounded-xl text-sm border ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>{status.message}</div>
            )}

            <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl ring-1 ring-black/5 bg-sand flex items-center justify-center overflow-hidden flex-shrink-0">
                    {currentLogo
                      ? <img src={currentLogo} alt="logo" className="w-full h-full object-contain" />
                      : <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>}
                  </div>
                  <div>
                    <label className="inline-block cursor-pointer text-sm font-medium text-brand border border-brand/30 hover:bg-brand/5 rounded-xl px-3 py-2 transition-colors">
                      Choisir une image
                      <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-400 mt-1.5">PNG, JPG ou SVG · max 2 Mo</p>
                  </div>
                </div>
                {errors.logo && <p className="text-xs text-red-600 mt-1">{errors.logo}</p>}
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'organisation</label>
                <input value={name} onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: undefined })) }}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand ${errors.name ? 'border-red-300' : 'border-gray-200'}`} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Couleur de thème */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur de thème</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={color} onChange={e => setColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer p-1" />
                  <input value={color} onChange={e => setColor(e.target.value)} placeholder="#1e3a5f"
                    className={`w-32 px-3 py-2 border rounded-xl text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand ${errors.theme_color ? 'border-red-300' : 'border-gray-200'}`} />
                </div>
                {errors.theme_color && <p className="text-xs text-red-600 mt-1">{errors.theme_color}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-xl px-5 py-2.5 bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60 shadow-lg shadow-brand/20">
                {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Enregistrer
              </button>
            </div>
          </form>
        )}

        {/* Section WhatsApp GELÉE temporairement — l'envoi des cartes membres par
            WhatsApp est suspendu (on se concentre sur les membres). Réactivation :
            rétablir le composant WhatsAppSection ci-dessus et ce rendu. */}
        {/* {!loading && <div className="max-w-xl"><WhatsAppSection /></div>} */}
      </PageShell>
    </AdminLayout>
  )
}
