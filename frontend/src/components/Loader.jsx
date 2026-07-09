import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import logoFull from '../assets/logo-full.png'

/**
 * Splash de marque affiché au démarrage de l'app.
 * Disparaît en fondu après `duration` ms (ou immédiatement si déjà chargé).
 */
export default function Splash({ duration = 700 }) {
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
              className="flex items-center justify-center"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            >
              <img src={logoFull} alt="Signiq" className="h-14 w-auto" />
            </motion.div>
          </div>

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
