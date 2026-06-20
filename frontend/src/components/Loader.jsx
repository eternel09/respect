import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Splash de marque affiché au démarrage de l'app.
 * Disparaît en fondu après `duration` ms (ou immédiatement si déjà chargé).
 */
export default function Splash({ duration = 1400 }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(t)
  }, [duration])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sand"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div className="relative flex items-center justify-center">
            {/* Anneau pulsant */}
            <motion.span
              className="absolute w-20 h-20 rounded-2xl border-2 border-brand/30"
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Logo */}
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand shadow-lg shadow-brand/30"
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </motion.div>
          </div>

          <motion.p
            className="mt-6 font-bold text-brand tracking-tight"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            Famille Respect
          </motion.p>

          {/* Barre de progression */}
          <motion.div className="mt-4 h-1 w-32 rounded-full bg-brand/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand to-accent"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: duration / 1000, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
