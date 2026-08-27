import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api, { apiErrorMessage } from '../../lib/axios'

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null

/**
 * Page publique de confirmation de présence (RSVP), ouverte par l'invité via le
 * lien reçu dans l'invitation. Affiche la vidéo « short » du couple et enregistre
 * la réponse (présent / décliné). Aucun compte requis — le jeton fait foi.
 */
export default function RsvpPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)      // { guest, occasion }
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)  // { status, table, message }

  const load = useCallback(() => {
    api.get(`/rsvp/${token}`)
      .then(res => { setData(res.data); setResult({ status: res.data.guest.status, table: res.data.guest.table }) })
      .catch(e => setErr(apiErrorMessage(e, "Cette invitation est introuvable ou a expiré.")))
      .finally(() => setLoading(false))
  }, [token])
  useEffect(load, [load])

  const respond = async (status) => {
    setBusy(true)
    try {
      const res = await api.post(`/rsvp/${token}`, { status })
      setResult({ status: res.data.status, table: res.data.table, message: res.data.message })
    } catch (e) {
      setErr(apiErrorMessage(e, "Impossible d'enregistrer votre réponse. Réessayez."))
    } finally { setBusy(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sand">
      <span className="inline-block animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full" />
    </div>
  )

  if (err && !data) return (
    <div className="min-h-screen flex items-center justify-center bg-sand p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-8 text-center">
        <div className="text-4xl mb-3">💌</div>
        <p className="text-gray-600">{err}</p>
      </div>
    </div>
  )

  const { guest, occasion } = data
  const confirmed = result?.status === 'confirmed'
  const declined = result?.status === 'declined'
  const timeStr = fmtTime(occasion.starts_at)

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand to-cream flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-md">
        {/* Vidéo du couple */}
        {occasion.video_url ? (
          <div className="rounded-3xl overflow-hidden ring-1 ring-black/10 shadow-lg bg-black aspect-[9/16] mb-6">
            <video
              src={occasion.video_url}
              className="w-full h-full object-cover"
              autoPlay muted loop playsInline controls
            />
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="text-5xl">💍</div>
          </div>
        )}

        {/* Carte invitation */}
        <div className="bg-white rounded-3xl ring-1 ring-black/5 shadow-sm p-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-dark">{occasion.organization}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight">{occasion.name}</h1>
          <div className="mt-3 text-sm text-gray-500 space-y-0.5">
            <p>📅 {fmtDate(occasion.date)}{timeStr && ` · ${timeStr}`}</p>
            {occasion.location && <p>📍 {occasion.location}</p>}
          </div>

          <div className="my-6 h-px bg-gray-100" />

          <p className="text-sm text-gray-500">Invitation adressée à</p>
          <p className="text-lg font-semibold text-gray-900">{guest.name}</p>

          {/* État / actions */}
          {occasion.is_expired ? (
            <p className="mt-6 text-sm text-gray-400">Cet événement est passé.</p>
          ) : confirmed ? (
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-full px-4 py-2 text-sm font-semibold">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                Présence confirmée
              </div>
              {result?.table && <p className="mt-3 text-sm text-gray-500">Votre table : <span className="font-semibold text-gray-800">{/^\d+$/.test(result.table) ? 'Table ' + result.table : result.table}</span></p>}
              <p className="mt-4 text-xs text-gray-400">Vous pouvez changer votre réponse à tout moment.</p>
              <button onClick={() => respond('decline')} disabled={busy} className="mt-2 text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50">Finalement, je ne pourrai pas venir</button>
            </div>
          ) : declined ? (
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 text-gray-600 bg-gray-100 rounded-full px-4 py-2 text-sm font-semibold">Réponse : absent(e)</div>
              <p className="mt-4 text-xs text-gray-400">Un empêchement de dernière minute ?</p>
              <button onClick={() => respond('confirm')} disabled={busy} className="mt-1 text-sm text-brand font-semibold underline hover:text-brand-dark disabled:opacity-50">Je serai finalement présent(e)</button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-600">Nous confirmez-vous votre présence ?</p>
              <button onClick={() => respond('confirm')} disabled={busy}
                className="w-full py-3.5 rounded-2xl text-white font-semibold bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {busy && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Je serai présent(e)
              </button>
              <button onClick={() => respond('decline')} disabled={busy}
                className="w-full py-3 rounded-2xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60">
                Je ne pourrai pas
              </button>
            </div>
          )}

          {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">Propulsé par Signiq</p>
      </div>
    </div>
  )
}
