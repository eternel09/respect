import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import api, { apiErrorMessage } from '../lib/axios'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const stepTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
}

function TopNav() {
  return (
    <header className="bg-white/80 backdrop-blur border-b border-black/5 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-brand">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
          </div>
          <span className="font-bold text-gray-900">Famille Respect</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
          </button>
          <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold">A</div>
        </div>
      </div>
    </header>
  )
}

export default function PresencePage() {
  const [searchParams]        = useSearchParams()
  const [phone, setPhone]     = useState('')
  const [step, setStep]       = useState('choice') // 'choice' | 'checkin' | 'done'
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [event, setEvent]     = useState(null)
  const [error, setError]     = useState(null)

  const eventId = searchParams.get('event_id')

  // Parallax au scroll sur le bloc événement
  const eventRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: eventRef, offset: ['start end', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['-15%', '15%'])

  useEffect(() => {
    if (!eventId) return
    api.get('/events/public')
      .then(res => {
        const found = res.data.data?.find(e => String(e.id) === eventId)
        setEvent(found || null)
      }).catch(() => {})
  }, [eventId])

  const handleCheckin = async e => {
    e.preventDefault()
    if (!eventId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/attendance', { phone, event_id: Number(eventId) })
      setStatus({ type: 'success', message: res.data.message })
      setStep('done')
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 404) setError(data.message)
      else if (err.response?.status === 409) { setStatus({ type: 'warning', message: data.message }); setStep('done') }
      else if (err.response?.status === 422) setError(data.errors?.phone?.[0] || data.errors?.event_id?.[0])
      else setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const time  = '10:00 - 12:30'

  const inputBase =
    'w-full px-4 py-2.5 border rounded-xl text-sm bg-white transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand'

  return (
    <div className="min-h-screen flex flex-col bg-sand">
      <TopNav />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {step === 'done' ? (
            <motion.div key="done" {...stepTransition} className="bg-white rounded-3xl shadow-xl shadow-brand/5 ring-1 ring-black/5 p-8 sm:p-10 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${status?.type === 'success' ? 'bg-emerald-100' : 'bg-amber-100'}`}
              >
                <svg className={`w-8 h-8 ${status?.type === 'success' ? 'text-emerald-600' : 'text-amber-600'}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d={status?.type === 'success' ? 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' : 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'} />
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{status?.message}</h2>
              <p className="text-gray-400 text-sm">{event?.name || 'Famille Respect'}</p>
              <button onClick={() => { setStep('choice'); setPhone(''); setError(null) }} className="mt-6 text-sm font-medium text-brand hover:text-brand-dark transition-colors">
                ← Retour
              </button>
            </motion.div>
          ) : step === 'checkin' ? (
            <motion.div key="checkin" {...stepTransition} className="bg-white rounded-3xl shadow-xl shadow-brand/5 ring-1 ring-black/5 p-6 sm:p-8 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Signaler votre présence</h2>
              <p className="text-gray-500 text-sm mb-6">{event?.name}</p>
              <form onSubmit={handleCheckin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre numéro de téléphone</label>
                  <input
                    type="tel"
                    placeholder="+243 81 234 56 78"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(null) }}
                    className={`${inputBase} ${error ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                </div>
                <motion.button
                  type="submit"
                  disabled={loading || !phone}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2
                             bg-brand hover:bg-brand-dark transition-colors disabled:opacity-60 shadow-lg shadow-brand/20"
                >
                  {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Confirmer ma présence →
                </motion.button>
              </form>
              <button onClick={() => setStep('choice')} className="mt-4 text-sm text-gray-400 hover:text-gray-600 w-full text-center">← Retour</button>
            </motion.div>
          ) : (
            <motion.div key="choice" variants={container} initial="hidden" animate="show" exit={{ opacity: 0, y: -20 }}>
              {/* En-tête */}
              <motion.div variants={item} className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-brand shadow-lg shadow-brand/20">
                  <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bienvenue au culte de la famille</h1>
                <p className="text-gray-500 text-sm max-w-md mx-auto">Nous sommes heureux de vous voir aujourd'hui. Veuillez enregistrer votre présence ou justifier votre absence.</p>
              </motion.div>

              {/* Cartes d'action */}
              <div className="space-y-3 mb-4">
                <motion.button
                  variants={item}
                  whileHover={{ y: -3 }}
                  onClick={() => eventId ? setStep('checkin') : setError('Lien invalide.')}
                  className="w-full bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:ring-brand/20 transition-shadow text-left"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand/10">
                    <svg className="w-5 h-5 fill-brand" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Service</p>
                    <h3 className="font-bold text-gray-900">Signaler Présence</h3>
                    <p className="text-gray-500 text-sm">Confirmez votre participation au culte d'aujourd'hui en un seul clic.</p>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-brand">Enregistrer →</span>
                </motion.button>

                <motion.button
                  variants={item}
                  whileHover={{ y: -3 }}
                  onClick={() => setStep('checkin')}
                  className="w-full bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:ring-accent/30 transition-shadow text-left"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent-soft">
                    <svg className="w-5 h-5 fill-accent-dark" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Empêchement</p>
                    <h3 className="font-bold text-gray-900">Justifier Absence</h3>
                    <p className="text-gray-500 text-sm">Vous ne pouvez pas être présent ? Prévenez l'équipe responsable de la communauté.</p>
                  </div>
                  <span className="hidden sm:inline text-accent-dark text-sm font-medium">Soumettre →</span>
                </motion.button>
              </div>

              {!eventId && (
                <p className="text-center text-red-500 text-sm mb-4">Lien invalide — scannez le QR code de l'événement.</p>
              )}

              {/* Bloc événement (parallax au scroll) */}
              <motion.div variants={item} ref={eventRef} className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden flex flex-col sm:flex-row mt-6">
                <div className="sm:w-56 h-40 sm:h-auto flex-shrink-0 overflow-hidden relative">
                  <motion.div
                    style={{ y: bgY }}
                    className="absolute inset-0 -top-[15%] h-[130%] bg-gradient-to-br from-brand via-brand-light to-accent"
                  />
                </div>
                <div className="p-6 flex-1">
                  <div className="w-8 h-0.5 mb-3 bg-accent" />
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{event?.name || 'Famille Respect'}</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Famille Respect vous aide à rester connecté avec votre famille spirituelle. Votre participation aide à organiser et valoriser la vie de notre communauté.
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" /></svg>
                      <span className="capitalize">{today}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                      {time}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        © 2026 Famille Respect · Family Management Systems
      </footer>
    </div>
  )
}
