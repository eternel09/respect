import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import Icon from '../components/ui/Icon'
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
            <Icon name="interpreter_mode" size={20} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Famille Respect</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50">
            <Icon name="notifications" size={20} />
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
                <Icon name={status?.type === 'success' ? 'check_circle' : 'info'} size={34} fill={1} className={status?.type === 'success' ? 'text-emerald-600' : 'text-amber-600'} />
              </motion.div>
              <h2 className="font-display text-2xl font-medium text-gray-900 mb-2 tracking-tight">{status?.message}</h2>
              <p className="text-gray-400 text-sm">{event?.name || 'Famille Respect'}</p>
              <button onClick={() => { setStep('choice'); setPhone(''); setError(null) }} className="mt-6 text-sm font-medium text-brand hover:text-brand-dark transition-colors">
                ← Retour
              </button>
            </motion.div>
          ) : step === 'checkin' ? (
            <motion.div key="checkin" {...stepTransition} className="bg-white rounded-3xl shadow-xl shadow-brand/5 ring-1 ring-black/5 p-6 sm:p-8 max-w-md mx-auto">
              <h2 className="font-display text-2xl font-medium text-gray-900 mb-1 tracking-tight">Signaler votre présence</h2>
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
                  <Icon name="groups" size={30} fill={1} className="text-white" />
                </div>
                <h1 className="font-display text-[2rem] sm:text-[2.5rem] font-medium text-gray-900 mb-2 tracking-tight">Bienvenue au culte de la famille</h1>
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
                    <Icon name="how_to_reg" size={22} fill={1} className="text-brand" />
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
                    <Icon name="event_busy" size={22} fill={1} className="text-accent-dark" />
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
                      <Icon name="calendar_month" size={18} className="text-gray-400" />
                      <span className="capitalize">{today}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Icon name="schedule" size={18} className="text-gray-400" />
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
