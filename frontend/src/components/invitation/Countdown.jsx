import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const parts = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [[Math.floor(s / 86400), 'jours'], [Math.floor(s / 3600) % 24, 'heures'], [Math.floor(s / 60) % 60, 'minutes'], [s % 60, 'secondes']]
}

/** Compte à rebours jusqu'au début de l'événement (chiffres qui défilent). */
export default function Countdown({ target, theme: t }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const left = target.getTime() - now
  if (left <= 0) return <p className="inv-serif italic text-xl" style={{ color: t.ink }}>C'est le grand jour ✨</p>

  return (
    <div className="flex justify-center gap-2" role="timer" aria-label="Compte à rebours avant l'événement">
      {parts(left).map(([v, label], i) => (
        <div key={label} className="flex items-start">
          {i > 0 && <span className="inv-serif text-2xl px-0.5 -mt-0.5" style={{ color: t.goldInk }}>·</span>}
          <div className="w-[62px] text-center">
            <div className="relative h-9 overflow-hidden inv-cinzel text-[28px] leading-9 font-semibold tabular-nums" style={{ color: t.ink }}>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span key={v} className="absolute inset-0"
                  initial={{ y: '-100%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}>
                  {String(v).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.22em] mt-1" style={{ color: t.muted, fontFamily: 'Jost, sans-serif' }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
