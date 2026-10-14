import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { apiErrorMessage } from '../../lib/axios'
import PlatformHeader from '../../components/PlatformHeader'
import Icon from '../../components/ui/Icon'

const STATES = {
  ready:        { dot: 'bg-emerald-500', label: 'Numéro lié — les invitations et cartes partent de ce numéro.' },
  qr:           { dot: 'bg-amber-500', label: 'Aucun numéro lié — scannez le QR ci-dessous.' },
  starting:     { dot: 'bg-amber-400', label: 'Démarrage du service…' },
  disconnected: { dot: 'bg-red-500', label: 'Déconnecté — reconnexion en cours…' },
  auth_failure: { dot: 'bg-red-500', label: 'Échec de liaison — déliez puis recommencez.' },
  error:        { dot: 'bg-red-500', label: 'Erreur du service WhatsApp.' },
  offline:      { dot: 'bg-gray-400', label: 'Service WhatsApp injoignable.' },
  loading:      { dot: 'bg-gray-300', label: 'Vérification…' },
}

/**
 * Numéro WhatsApp d'envoi de la plateforme. Une seule session sert toutes les
 * organisations : sa liaison (QR) et sa déliaison sont réservées au super-admin.
 * L'opérateur voit l'état, sans pouvoir changer de numéro.
 */
export default function PlatformWhatsAppPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState({ state: 'loading' })
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState(null)
  const timer = useRef(null)
  const isSuper = user?.role === 'super_admin'

  const fetchStatus = async () => {
    try {
      const res = await api.get('/admin/platform/whatsapp')
      setStatus(res.data)
    } catch (err) {
      setStatus(err.response?.data || { state: 'offline' })
    }
  }

  useEffect(() => {
    // fetchStatus est asynchrone (setState après await).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus()
    // Le QR de liaison tourne ; l'état passe à « ready » après le scan.
    timer.current = setInterval(fetchStatus, 4000)
    return () => clearInterval(timer.current)
  }, [])

  const unlink = async () => {
    if (!window.confirm("Délier ce numéro ? Plus aucun envoi ne partira tant qu'un nouveau numéro n'est pas lié.")) return
    setBusy(true); setMsg(null)
    try {
      const res = await api.post('/admin/platform/whatsapp/logout')
      setMsg({ ok: true, text: res.data.message })
      setStatus({ state: 'starting' })
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, 'Déliaison impossible.') })
    } finally { setBusy(false) }
  }

  const handleLogout = async () => { await logout(); navigate('/admin/login') }
  const st = STATES[status.state] || STATES.offline

  return (
    <div className="min-h-screen bg-sand">
      <PlatformHeader user={user} onLogout={handleLogout} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Numéro WhatsApp d'envoi</h1>
          <p className="text-gray-500 text-sm mt-1 mb-6">Invitations et cartes partent de ce numéro, pour tous les clients.</p>

          <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
              <p className="text-sm font-medium text-gray-800">{st.label}</p>
            </div>

            {status.state === 'qr' && isSuper && status.qr && (
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-sand rounded-xl p-4 mt-5">
                <img src={status.qr} alt="QR de liaison WhatsApp" className="w-44 h-44 rounded-lg bg-white p-2" />
                <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                  <li>Ouvrez WhatsApp sur le téléphone <b>de l'équipe</b></li>
                  <li>Réglages → <b>Appareils connectés</b> → <b>Connecter un appareil</b></li>
                  <li>Scannez ce QR code</li>
                </ol>
              </div>
            )}

            {status.state === 'qr' && !isSuper && (
              <p className="text-sm text-gray-500 mt-4">Seul le super-admin peut lier le numéro d'envoi.</p>
            )}

            {isSuper && status.state === 'ready' && (
              <div className="mt-5 pt-5 border-t border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500">Pour envoyer depuis un autre numéro, déliez celui-ci puis scannez le nouveau QR.</p>
                <button onClick={unlink} disabled={busy}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl px-4 py-2 hover:bg-red-50 disabled:opacity-60">
                  {busy ? <span className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full" /> : <Icon name="link_off" size={18} />}
                  Changer de numéro
                </button>
              </div>
            )}

            {msg && <p className={`mt-4 text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
