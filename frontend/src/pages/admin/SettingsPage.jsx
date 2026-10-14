import { useEffect, useRef, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import PageShell from '../../components/PageShell'
import api, { apiErrorMessage } from '../../lib/axios'
import { useAuth } from '../../context/AuthContext'
import { MEMBER_TERM_OPTIONS } from '../../lib/memberTerm'
import Icon from '../../components/ui/Icon'

// Lien de téléchargement de l'app scanner (Android). L'APK est publié en asset
// de Release GitHub (tag stable `mobile-latest`) par le workflow « Build Mobile
// APK ». Surchargable via VITE_APP_DOWNLOAD_URL (déploiement white-label).
const APK_URL = import.meta.env.VITE_APP_DOWNLOAD_URL
  || 'https://github.com/eternel09/respect/releases/download/mobile-latest/signiq-scanner.apk'

/** Téléchargement de l'application mobile scanner (APK Android). */
function MobileAppSection() {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon name="android" size={20} className="text-emerald-600" />
        <h2 className="font-bold text-gray-900">Application mobile</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        App scanner de terrain : pointage des présences par QR code, avec mode hors-ligne et synchronisation.
      </p>
      <a
        href={APK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-white rounded-xl px-4 py-2.5 bg-brand hover:bg-brand-dark transition-colors shadow-lg shadow-brand/20"
      >
        <Icon name="download" size={20} />
        Télécharger l'application (Android)
      </a>
      <p className="text-xs text-gray-400 mt-3">
        Fichier .APK · Android uniquement. Autorisez l'installation depuis des sources inconnues,
        puis ouvrez le fichier téléchargé pour installer.
      </p>
    </div>
  )
}

/**
 * WhatsApp : état du numéro d'envoi. Ce numéro appartient à l'équipe Signiq
 * (une seule session pour toute la plateforme) : sa liaison se fait depuis
 * l'espace plateforme, jamais depuis une organisation.
 */
function WhatsAppSection() {
  const [status, setStatus] = useState({ state: 'loading' })
  const timer = useRef(null)

  const fetchStatus = async () => {
    try {
      const res = await api.get('/admin/whatsapp/status')
      setStatus(res.data)
    } catch (err) {
      setStatus(err.response?.data || { state: 'offline' })
    }
  }

  useEffect(() => {
    // fetchStatus est asynchrone (setState après await) : pas de setState synchrone.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus()
    timer.current = setInterval(fetchStatus, 15000)
    return () => clearInterval(timer.current)
  }, [])

  const STATES = {
    ready:        { dot: 'bg-emerald-500', label: 'Connecté — les envois WhatsApp sont disponibles.' },
    qr:           { dot: 'bg-amber-500', label: "Numéro d'envoi en cours de liaison par l'équipe Signiq." },
    starting:     { dot: 'bg-amber-400', label: 'Démarrage du service…' },
    disconnected: { dot: 'bg-red-500', label: 'Déconnecté — reconnexion en cours…' },
    offline:      { dot: 'bg-gray-400', label: 'Service momentanément indisponible.' },
    loading:      { dot: 'bg-gray-300', label: 'Vérification…' },
  }
  const st = STATES[status.state] || STATES.offline

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon name="chat" size={20} className="text-[#25D366]" />
        <h2 className="font-bold text-gray-900">WhatsApp</h2>
        <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
      </div>
      <p className="text-sm text-gray-500">{st.label}</p>
      <p className="text-xs text-gray-400 mt-2">Le numéro d'envoi est géré par l'équipe Signiq.</p>
    </div>
  )
}

export default function SettingsPage() {
  const { refreshUser } = useAuth()
  const [org, setOrg]           = useState(null)
  const [name, setName]         = useState('')
  const [color, setColor]       = useState('#1e3a5f')
  const [memberTermVal, setMemberTermVal] = useState('membre')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setPreview] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [status, setStatus]     = useState(null) // { type, message }
  const [errors, setErrors]     = useState({})

  useEffect(() => {
    api.get('/admin/organization')
      .then(res => { setOrg(res.data); setName(res.data.name); setColor(res.data.theme_color || '#1e3a5f'); setMemberTermVal(res.data.member_term || 'membre') })
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
      fd.append('member_term', memberTermVal)
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
                      : <Icon name="image" size={28} className="text-gray-300" />}
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

              {/* Vocabulaire du membre (module présence) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment appelez-vous vos membres ?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {MEMBER_TERM_OPTIONS.map(opt => (
                    <button
                      type="button" key={opt.key}
                      onClick={() => setMemberTermVal(opt.key)}
                      className={`text-left p-3 rounded-xl border transition-colors ${memberTermVal === opt.key ? 'border-brand bg-brand/5' : 'border-gray-200 hover:bg-sand'}`}
                    >
                      <span className="block text-sm font-semibold text-gray-800">{opt.label}</span>
                      <span className="block text-xs text-gray-500">{opt.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Ce terme remplace « Membre » dans votre espace (menu, listes, fiches).</p>
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

        {!loading && (
          <div className="max-w-xl">
            <CardDesignSection url={org?.card_design_url} onChange={(u) => setOrg(o => ({ ...o, card_design_url: u }))} />
            <MobileAppSection />
            <WhatsAppSection />
          </div>
        )}
      </PageShell>
    </AdminLayout>
  )
}

/** Visuel de carte de service uploadable (produit Présence entreprise). */
function CardDesignSection({ url, onChange }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const upload = async (file) => {
    if (ref.current) ref.current.value = ''
    if (!file) return
    setBusy(true); setMsg(null)
    try {
      const fd = new FormData(); fd.append('design', file)
      const res = await api.post('/admin/organization/card-design', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(res.data.card_design_url); setMsg({ ok: true, text: res.data.message })
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Téléversement impossible.') }) }
    finally { setBusy(false) }
  }
  const remove = async () => {
    if (!confirm('Retirer le visuel ? Les cartes reprendront le design standard.')) return
    setBusy(true); setMsg(null)
    try { const res = await api.delete('/admin/organization/card-design'); onChange(null); setMsg({ ok: true, text: res.data.message }) }
    catch (e) { setMsg({ ok: false, text: apiErrorMessage(e, 'Retrait impossible.') }) }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 mb-6">
      <h3 className="font-semibold text-gray-900">Carte de service</h3>
      <p className="text-sm text-gray-500 mt-1">Téléversez le visuel de la carte de vos agents : le QR et le nom sont apposés dessus. Sans visuel, un design standard est utilisé.</p>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button onClick={() => ref.current?.click()} disabled={busy}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl px-4 py-2.5 disabled:opacity-60">
          {busy ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Icon name="upload" size={18} />}
          {url ? 'Remplacer' : 'Téléverser'}
        </button>
        {url && (
          <button onClick={remove} disabled={busy} className="text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-sand disabled:opacity-60">Retirer</button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">PNG, JPG ou WEBP · max 30 Mo · format paysage recommandé (QR en bas à droite).</p>
      {msg && <p className={`text-sm mt-2 ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
      {url && <img src={url} alt="Visuel de carte" className="mt-4 w-full max-w-sm rounded-xl ring-1 ring-black/5 bg-gray-50" />}
    </div>
  )
}
