import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Toast global de connexion : s'affiche ~10 s quand le réseau est coupé ou
 * instable (événements navigateur 'offline' + erreurs réseau axios), et un
 * bref message au retour de la connexion.
 */
export default function ConnectionToast() {
  const [toast, setToast] = useState(null) // { type: 'down' | 'up', message }
  const timer = useRef(null)

  const show = (next, duration) => {
    clearTimeout(timer.current)
    setToast(next)
    timer.current = setTimeout(() => setToast(null), duration)
  }

  useEffect(() => {
    const onOffline = () => show({ type: 'down', message: 'Connexion internet perdue. Vérifiez votre réseau.' }, 10000)
    const onIssue   = () => show({ type: 'down', message: 'Connexion instable. Certaines actions peuvent échouer.' }, 10000)
    const onOnline  = () => show({ type: 'up', message: 'Connexion rétablie.' }, 3000)

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('connection-issue', onIssue)
    if (!navigator.onLine) onOffline()

    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('connection-issue', onIssue)
      clearTimeout(timer.current)
    }
  }, [])

  const down = toast?.type === 'down'

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4"
        >
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium ring-1 ${
            down ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          }`}>
            {down ? (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M24 8.98A16.88 16.88 0 0012 4C7.31 4 3.07 5.9 0 8.98L12 21l3-3.01-6.59-6.59A12.84 12.84 0 0112 8c2.92 0 5.59 1 7.69 2.68L24 8.98zM2.92 2.5L1.65 3.78l2.05 2.05A19.7 19.7 0 000 8.98L12 21l3.39-3.39 2.83 2.83 1.27-1.27L2.92 2.5z" /></svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.24 4.24 0 00-6 0zm-4-4l2 2a7.07 7.07 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
            )}
            <span>{toast.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
