import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

/**
 * Enveloppe scellée (cachet doré au monogramme). Au toucher : le cachet saute,
 * le rabat s'ouvre vers le haut et la carte (children) sort de l'enveloppe.
 */
export default function Envelope({ theme: t, mono, opening, onOpen, children }) {
  // Le rabat passe derrière la carte une fois ouvert à moitié.
  const [flapBehind, setFlapBehind] = useState(false)
  useEffect(() => {
    if (!opening) return
    const id = setTimeout(() => setFlapBehind(true), 650)
    return () => clearTimeout(id)
  }, [opening])

  return (
    <div className="relative" style={{ width: 'min(90vw, 380px)', aspectRatio: '1.6 / 1', perspective: 1400 }}>
      {/* Ombre portée */}
      <div aria-hidden className="absolute left-[6%] right-[6%] -bottom-[9%] h-[14%] rounded-[50%] blur-xl" style={{ background: 'rgba(80,20,30,.28)' }} />

      {/* Fond intérieur */}
      <div aria-hidden className="absolute inset-0 rounded-[3px]" style={{ background: t.dark }} />

      {/* Carte (sort de l'enveloppe) */}
      <motion.div className="absolute left-[5%] right-[5%]" style={{ zIndex: 2 }}
        initial={false}
        animate={{ top: opening ? '-46%' : '6%' }}
        transition={{ delay: opening ? 0.9 : 0, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>

      {/* Poche avant */}
      <div aria-hidden className="absolute inset-0 rounded-[3px] overflow-hidden" style={{ zIndex: 3 }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${t.light}, ${t.main})`, clipPath: 'polygon(0 0, 50% 56%, 0 100%)' }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(200deg, ${t.main}, ${t.dark})`, clipPath: 'polygon(100% 0, 50% 56%, 100% 100%)' }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${t.dark}, ${t.main})`, clipPath: 'polygon(0 100%, 50% 52%, 100% 100%)' }} />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,.25)' }} />
      </div>

      {/* Rabat */}
      <motion.div aria-hidden className="absolute inset-x-0 top-0 h-[60%]"
        style={{ zIndex: flapBehind ? 1 : 4, transformOrigin: 'top center', transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateX: opening ? 180 : 0 }}
        transition={{ delay: opening ? 0.25 : 0, duration: 0.8, ease: [0.65, 0, 0.35, 1] }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${t.light}, ${t.main})`, clipPath: 'polygon(0 0, 100% 0, 50% 100%)', backfaceVisibility: 'hidden', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.3))' }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${t.main}, ${t.dark})`, clipPath: 'polygon(0 0, 100% 0, 50% 100%)', transform: 'rotateX(180deg)', backfaceVisibility: 'hidden' }} />
      </motion.div>

      {/* Cachet doré */}
      <motion.button type="button" onClick={onOpen} disabled={opening}
        aria-label="Ouvrir l'invitation"
        className="absolute left-1/2 top-[60%] w-[24%] aspect-square rounded-full flex items-center justify-center outline-none focus-visible:ring-4 focus-visible:ring-amber-200/70"
        style={{
          zIndex: 5, x: '-50%', y: '-50%', background: t.gold,
          boxShadow: '0 6px 14px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.55), inset 0 -3px 5px rgba(120,80,10,.45)',
        }}
        initial={false}
        animate={opening
          ? { scale: [1, 1.18, 0], rotate: [0, -8, 25], opacity: [1, 1, 0] }
          : { scale: [1, 1.05, 1], rotate: 0, opacity: 1 }}
        transition={opening ? { duration: 0.45, times: [0, 0.35, 1] } : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={{ scale: 0.92 }}>
        <span className="absolute inset-[11%] rounded-full" style={{ border: '1.5px solid rgba(110,70,10,.35)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,.4)' }} />
        <span className="inv-cinzel font-semibold text-[#6b4a12] flex items-center gap-[5px] text-[clamp(14px,5vw,22px)]" style={{ textShadow: '0 1px 0 rgba(255,240,200,.7)' }}>
          {mono.length === 2 ? (<>{mono[0]}<span className="w-px h-[1.1em] bg-[#6b4a12]/60" />{mono[1]}</>) : mono[0]}
        </span>
      </motion.button>
    </div>
  )
}
