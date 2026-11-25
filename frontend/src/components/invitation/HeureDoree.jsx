import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import Icon from '../ui/Icon'
import { API_BASE } from '../../lib/axios'
import { calendarHref, eventNames, googleCalendarUrl, isAndroid, mapsUrl, sealOf, startOf } from '../../lib/invitationTheme'

/**
 * Modèle « Heure dorée » de l'invitation en ligne : une enveloppe ivoire
 * gaufrée scellée de cire dorée ; à l'ouverture (et avec la musique), la
 * photo du couple en plein écran, puis le compte à rebours entre deux grandes
 * colonnes fleuries, la galerie bord à bord, l'histoire du couple sous des
 * rideaux dorés, le déroulé de la journée, les détails dans un cadre baroque
 * sous un lustre, et le formulaire de réponse (avec un mot pour les hôtes).
 * Décors dessinés en SVG.
 *
 * Mise en scène : sceau balayé d'un reflet qui se brise en deux à l'ouverture,
 * prénoms en dorure révélés mot à mot, photo en parallaxe sous une poussière
 * d'or, colonnes qui s'élèvent et roses qui éclosent, chiffres qui défilent,
 * rideaux de théâtre qui s'ouvrent sur l'histoire, lustre qui se balance aux
 * flammes vacillantes, galerie en plein écran, gerbe dorée à la confirmation.
 * Tout est désactivé en mouvement réduit.
 */

const IVORY = '#faf7f1'
const BEIGE = '#f1eadc'
const BROWN = '#5e4b3c'
const G = ['#8a6420', '#d9b45a', '#f6e2a1', '#c99a3e', '#9a7228']
/** Visuels : planches de Redouté détourées (CC0) et textures maison (voir public/invitations/CREDITS.md). */
const ART = '/invitations'
const ROSE = {
  white: `${ART}/florals/rose-white.webp`, china: `${ART}/florals/rose-china.webp`, blush: `${ART}/florals/rose-blush-branch.webp`,
  wild: `${ART}/florals/rose-wild.webp`, villosa: `${ART}/florals/rose-villosa.webp`,
}
const LEAF = `${ART}/textures/gold-leaf.webp`
/** Papier coton : texture adoucie par un voile ivoire. */
const PAPER = `linear-gradient(rgba(250,247,241,.62), rgba(250,247,241,.62)), url("${ART}/textures/paper-ivory.webp")`
const seenKey = (token) => `inv-open:${token}`
const readSeen = (token) => { try { return localStorage.getItem(seenKey(token)) === '1' } catch { return false } }
const writeSeen = (token) => { try { localStorage.setItem(seenKey(token), '1') } catch { /* stockage indisponible */ } }

const pad = (n) => String(n).padStart(2, '0')
const caps = { fontVariantCaps: 'all-small-caps', letterSpacing: '0.24em' }
const view = (reduced, delay = 0) => reduced ? {} : {
  initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' }, transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
}

/** Dégradé doré réutilisable dans les SVG (id unique par dessin). */
const GoldDefs = ({ id, vertical = false }) => (
  <defs>
    <linearGradient id={`${id}-g`} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
      <stop offset="0" stopColor={G[0]} /><stop offset=".28" stopColor={G[1]} /><stop offset=".5" stopColor={G[2]} />
      <stop offset=".72" stopColor={G[3]} /><stop offset="1" stopColor={G[4]} />
    </linearGradient>
    {/* vraie feuille d'or, modelée par le dégradé */}
    <pattern id={id} width="1" height="1" patternContentUnits="objectBoundingBox">
      <image href={LEAF} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
      <rect width="1" height="1" fill={`url(#${id}-g)`} opacity=".55" />
    </pattern>
  </defs>
)

/** Planche botanique détourée, posée avec une ombre douce ; éclot à l'entrée dans l'écran puis ondule. */
function Flora({ src, className = '', style, flip = false, rotate = 0, delay = 0, reduced, sway = true, eager = false }) {
  return (
    <motion.img src={src} alt="" aria-hidden draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async"
      className={`pointer-events-none select-none absolute h-auto ${className}`}
      style={{ ...style, filter: 'drop-shadow(0 10px 14px rgba(70,50,20,.22)) drop-shadow(0 2px 3px rgba(70,50,20,.18))', scaleX: flip ? -1 : 1 }}
      initial={reduced ? false : { opacity: 0, scale: 0.86, rotate: rotate - 8 }}
      whileInView={{ opacity: 1, scale: 1, rotate }}
      animate={reduced || !sway ? undefined : { rotate: [rotate, rotate + 1.6, rotate - 1.2, rotate] }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ opacity: { duration: 1.2, delay }, scale: { duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] },
        rotate: sway && !reduced ? { duration: 9, delay: delay + 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 1.4, delay } }} />
  )
}

/** Dorure à la feuille : texte en dégradé or, parcouru d'un reflet. */
const FOIL = {
  backgroundImage: `linear-gradient(105deg, rgba(96,64,12,.88) 0%, rgba(150,108,34,.62) 20%, rgba(214,174,82,.3) 36%, rgba(255,244,205,.18) 45%, rgba(170,124,48,.45) 54%, rgba(110,76,18,.78) 70%, rgba(170,126,50,.5) 86%, rgba(96,64,12,.88) 100%), url("${LEAF}")`,
  backgroundSize: '240% 100%, 260px', backgroundPosition: '100% 50%, 0 0', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 1px 0 rgba(255,250,236,.85))',
}
function Foil({ children, on, color, reduced, className = '', delay = 0 }) {
  if (!on) return <span className={className} style={{ color }}>{children}</span>
  return (
    <motion.span className={`inline-block px-[.14em] -mx-[.14em] py-[.06em] -my-[.06em] ${className}`} style={FOIL}
      animate={reduced ? undefined : { backgroundPosition: ['100% 50%, 0px 0px', '0% 50%, 0px 0px'] }}
      transition={{ duration: 5.5, delay, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}>
      {children}
    </motion.span>
  )
}

/** Gerbe de paillettes d'or (ouverture du sceau, confirmation). */
function GoldBurst({ count = 22, spread = 130 }) {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 3) * 0.35
        const d = spread * (0.5 + ((i * 37) % 11) / 20)
        const s = 3 + (i % 4) * 1.4
        return (
          <motion.span key={i} className="absolute" style={{
            width: s, height: s, left: -s / 2, top: -s / 2, background: i % 2 ? G[2] : G[1],
            borderRadius: i % 3 ? '50%' : 1, rotate: 45, boxShadow: `0 0 ${s * 2}px ${G[2]}`,
          }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.2 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 40, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1.1 + (i % 5) * 0.14, ease: [0.15, 0.75, 0.35, 1] }} />
        )
      })}
    </span>
  )
}

/** Poussière d'or qui flotte devant la photo d'ouverture. */
const DUST = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37 + 7) % 100, y: 28 + ((i * 53) % 68), s: 1.4 + (i % 4) * 0.9, d: 5 + (i % 5) * 1.2, delay: (i * 0.41) % 5,
}))
const GoldDust = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {DUST.map((p, i) => (
      <motion.span key={i} className="absolute rounded-full" style={{
        left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: G[2], boxShadow: `0 0 ${p.s * 3}px ${G[1]}`,
      }}
        animate={{ y: [0, -70], x: [0, i % 2 ? 12 : -12], opacity: [0, 0.95, 0] }}
        transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }} />
    ))}
  </div>
)

/** Papier ivoire gaufré : abeilles, brins et fleurettes en relief. */
const EMBOSS = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="#e2d8c3" stroke-width="1.2" stroke-linecap="round">'
  + '<g transform="translate(26 24)"><ellipse cx="0" cy="4" rx="4" ry="6"/><path d="M-4 2h8M-4 6h8"/><ellipse cx="-6" cy="-2" rx="5" ry="3" transform="rotate(-25 -6 -2)"/><ellipse cx="6" cy="-2" rx="5" ry="3" transform="rotate(25 6 -2)"/><circle cx="0" cy="-3.5" r="2"/></g>'
  + '<g transform="translate(86 82)"><ellipse cx="0" cy="4" rx="4" ry="6"/><path d="M-4 2h8M-4 6h8"/><ellipse cx="-6" cy="-2" rx="5" ry="3" transform="rotate(-25 -6 -2)"/><ellipse cx="6" cy="-2" rx="5" ry="3" transform="rotate(25 6 -2)"/><circle cx="0" cy="-3.5" r="2"/></g>'
  + '<path d="M70 18c8 6 14 14 16 26M76 24c4-2 8-1 10 2M80 32c4-1 7 1 8 4"/>'
  + '<path d="M14 72c6 10 16 16 28 18M22 82c-1-4 1-8 4-9M30 87c-1-4 1-7 4-8"/>'
  + '<circle cx="104" cy="44" r="2.5"/><circle cx="48" cy="110" r="2.5"/><circle cx="56" cy="56" r="1.4"/></svg>',
)}")`

/** Sceau de cire doré au monogramme. */
function WaxSeal({ letters, size = 104 }) {
  return (
    <div className="relative flex items-center justify-center" style={{
      width: size, height: size,
      background: `radial-gradient(circle at 35% 30%, ${G[2]}, ${G[1]} 38%, ${G[3]} 62%, ${G[0]} 100%)`,
      boxShadow: '0 8px 18px rgba(80,55,15,.35), inset 0 2px 3px rgba(255,245,210,.6), inset 0 -4px 8px rgba(110,70,10,.45)',
      borderRadius: '50% 46% 53% 48% / 47% 53% 46% 52%',
    }}>
      <span className="absolute inset-[13%] rounded-full" style={{ border: '1.5px solid rgba(110,75,15,.35)', boxShadow: 'inset 0 1px 2px rgba(255,240,200,.5), 0 1px 0 rgba(255,240,200,.4)' }} />
      <span className="inv-script leading-none" style={{ fontSize: size * 0.36, color: '#6b4a12', textShadow: '0 1px 0 rgba(255,240,200,.7), 0 -1px 0 rgba(90,60,10,.35)' }}>
        {letters.length === 2 ? <>{letters[0]}<span style={{ fontSize: '.6em' }}>&amp;</span>{letters[1]}</> : letters[0]}
      </span>
    </div>
  )
}

/** Les deux moitiés du sceau brisé (cassure en zigzag). */
const SEAL_HALVES = [
  ['l', 'polygon(0 0, 54% 0, 45% 24%, 57% 46%, 44% 70%, 53% 100%, 0 100%)'],
  ['r', 'polygon(54% 0, 100% 0, 100% 100%, 53% 100%, 44% 70%, 57% 46%, 45% 24%)'],
]

/** Enveloppe d'ouverture (plein écran). */
function Intro({ occasion, opening, onOpen, reduced }) {
  const { couple, title } = eventNames(occasion.name)
  return (
    <motion.section key="intro" className="fixed inset-0 z-30 overflow-hidden" data-testid="heure-doree-intro"
      style={{ backgroundColor: IVORY, backgroundImage: `radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(160,140,100,.14)), ${EMBOSS}, ${PAPER}`, backgroundSize: 'auto, auto, auto, 512px', perspective: 1400 }}
      exit={reduced ? { opacity: 0 } : { y: '-100%', transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } }}>
      {/* Rabat en V, bordé d'un fil plus sombre */}
      <motion.div aria-hidden className="absolute inset-x-0 top-0 h-[50%] origin-top"
        style={{ transformStyle: 'preserve-3d', zIndex: 2 }}
        animate={{ rotateX: opening ? 165 : 0 }} transition={{ duration: 0.9, delay: reduced ? 0 : 0.45, ease: [0.65, 0, 0.35, 1] }}>
        <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 6%, 50% 100%, 0 6%)', background: '#e6dcc8', backfaceVisibility: 'hidden' }} />
        <div className="absolute inset-0" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 5.2%, 50% 98.6%, 0 5.2%)',
          backgroundColor: '#f6f1e6', backgroundImage: `${EMBOSS}, ${PAPER}`, backgroundSize: 'auto, auto, 512px',
          filter: 'drop-shadow(0 8px 8px rgba(120,95,50,.16))', backfaceVisibility: 'hidden',
        }} />
      </motion.div>

      {/* Roses posées sur l'enveloppe */}
      <motion.div aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}
        animate={opening ? { opacity: 0, scale: 1.06 } : { opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: opening ? 0.3 : 0 }}>
        <Flora src={ROSE.china} eager reduced={reduced} rotate={198} delay={0.2} className="w-[56%] max-w-[300px] -right-[16%] -top-[7%]" />
        <Flora src={ROSE.white} eager reduced={reduced} rotate={24} delay={0.5} className="w-[46%] max-w-[260px] -left-[21%] -bottom-[19%]" />
      </motion.div>

      {/* Sceau : un reflet le balaie ; à l'ouverture il se brise en deux */}
      <button type="button" onClick={onOpen} disabled={opening} aria-label="Ouvrir l'invitation" data-testid="heure-doree-seal"
        className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 z-10 outline-none focus-visible:ring-4 focus-visible:ring-amber-200 rounded-full">
        {opening && !reduced ? (
          <div className="relative" style={{ width: 112, height: 112 }}>
            {SEAL_HALVES.map(([side, clip]) => (
              <motion.div key={side} className="absolute inset-0" style={{ clipPath: clip }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: side === 'l' ? -54 : 54, y: [0, -10, 160], rotate: side === 'l' ? -32 : 32, opacity: [1, 1, 0] }}
                transition={{ duration: 1.05, ease: [0.45, 0, 0.7, 1], times: [0, 0.25, 1] }}>
                <WaxSeal letters={sealOf(occasion)} size={112} />
              </motion.div>
            ))}
            <motion.span aria-hidden className="absolute inset-[-40%] rounded-full"
              style={{ background: `radial-gradient(circle, ${G[2]}cc, ${G[1]}55 40%, transparent 68%)` }}
              initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.8 }} />
            <GoldBurst count={26} spread={150} />
          </div>
        ) : (
          <motion.div className="relative" animate={reduced ? undefined : { scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
            <WaxSeal letters={sealOf(occasion)} size={112} />
            {!reduced && (
              <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: '50%' }}>
                <motion.span className="absolute inset-y-0 left-0 w-1/3"
                  style={{ background: 'linear-gradient(100deg, transparent, rgba(255,250,228,.8), transparent)', mixBlendMode: 'soft-light' }}
                  animate={{ x: ['-160%', '360%'] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }} />
              </span>
            )}
          </motion.div>
        )}
      </button>

      <motion.div className="absolute inset-x-0 bottom-[8%] text-center px-6" style={{ color: '#9a8d78' }}
        animate={{ opacity: opening ? 0 : 1 }}>
        <p className="inv-serif text-[14px]" style={caps}>Carnet mondain</p>
        <p className="inv-serif text-[14px]" style={caps}>Un événement à ne pas manquer</p>
        <p className="inv-script text-[26px] leading-tight mt-1">L’union de</p>
        <p className="inv-serif text-[13px]" style={caps}>{couple ? `${couple[0]} & ${couple[1]}` : title}</p>
        <p className="mt-5 inv-jost text-[10.5px] tracking-[0.3em] uppercase flex items-center justify-center gap-1.5 opacity-80">
          <Icon name="touch_app" size={14} /> Touchez le sceau
        </p>
      </motion.div>
    </motion.section>
  )
}

/** Grande colonne corinthienne en feuille d'or. */
function Column({ flip }) {
  const id = `col-gold${flip ? 'r' : 'l'}`
  return (
    <svg viewBox="0 0 64 300" className="w-full h-auto" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
      <GoldDefs id={id} />
      {/* chapiteau */}
      <rect x="4" y="10" width="56" height="7" rx="1" fill={`url(#${id})`} />
      <path d="M6 30 Q4 16 16 18 Q14 26 22 27 L42 27 Q50 26 48 18 Q60 16 58 30 Z" fill={`url(#${id})`} />
      <circle cx="12" cy="27" r="5.5" fill="none" stroke={G[0]} strokeWidth="1.5" /><circle cx="52" cy="27" r="5.5" fill="none" stroke={G[0]} strokeWidth="1.5" />
      <path d="M16 31 Q32 46 48 31 L46 42 L18 42 Z" fill={`url(#${id})`} />
      {[22, 28, 34, 40].map(x => <path key={x} d={`M${x} 31 q2 6 0 10`} stroke={G[0]} strokeOpacity=".5" fill="none" />)}
      {/* fût cannelé */}
      <rect x="15" y="42" width="34" height="222" fill={`url(#${id})`} />
      {[20, 25.5, 31, 36.5, 42].map(x => <line key={x} x1={x} y1="46" x2={x} y2="260" stroke={G[0]} strokeOpacity=".4" strokeWidth="1.3" />)}
      {/* base */}
      <rect x="11" y="262" width="42" height="9" rx="1" fill={`url(#${id})`} />
      <rect x="6" y="271" width="52" height="11" rx="1" fill={`url(#${id})`} />
      <rect x="2" y="282" width="60" height="14" rx="1" fill={`url(#${id})`} />
    </svg>
  )
}

/** Chiffre qui défile (l'ancien descend, le nouveau arrive d'en haut). */
function Rolling({ value, color, reduced }) {
  return (
    <span className="relative block h-[30px] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={value} className="block inv-serif text-[27px] leading-[30px] tabular-nums" style={{ color }}
          initial={reduced ? false : { y: '-100%', opacity: 0, filter: 'blur(3px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: '100%', opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** Compte à rebours jours / heures / minutes / secondes, chiffres qui défilent. */
function Countdown({ target, color, reduced }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const s = Math.max(0, Math.floor((target.getTime() - now) / 1000))
  if (!s) return <p className="inv-script text-[30px]" style={{ color }}>C’est aujourd’hui !</p>
  const parts = [
    [String(Math.floor(s / 86400)), 'Jours'], [pad(Math.floor(s / 3600) % 24), 'Heures'],
    [pad(Math.floor(s / 60) % 60), 'Min.'], [pad(s % 60), 'Sec.'],
  ]
  return (
    <div className="flex justify-center gap-2" role="timer" aria-label="Compte à rebours avant l'événement">
      {parts.map(([v, l]) => (
        <div key={l} className="text-center min-w-[40px] py-1.5" style={{ borderTop: `1px solid ${G[3]}99`, borderBottom: `1px solid ${G[3]}99` }}>
          <Rolling value={v} color={color} reduced={reduced} />
          <p className="inv-serif text-[10.5px] mt-1 opacity-70" style={{ ...caps, letterSpacing: '0.16em' }}>{l}</p>
        </div>
      ))}
    </div>
  )
}

/** Lambrequin doré : drapé en festons, franges et pampilles. */
function Valance() {
  return (
    <svg viewBox="0 0 400 120" className="block w-full h-auto" preserveAspectRatio="none" aria-hidden>
      <GoldDefs id="val-gold" vertical />
      <rect x="0" y="0" width="400" height="12" fill="url(#val-gold)" />
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <path d={`M${i * 100} 10 Q${i * 100 + 50} 78 ${i * 100 + 100} 10 Z`} fill="url(#val-gold)" />
          <path d={`M${i * 100 + 8} 16 Q${i * 100 + 50} 64 ${i * 100 + 92} 16`} stroke={G[0]} strokeOpacity=".35" fill="none" />
          <path d={`M${i * 100 + 18} 22 Q${i * 100 + 50} 54 ${i * 100 + 82} 22`} stroke={G[2]} strokeOpacity=".7" fill="none" />
          <path d={`M${i * 100 + 100} 8 l-5 26 h10 Z`} fill={G[1]} />
          <circle cx={i * 100 + 100} cy="38" r="3.5" fill={G[3]} />
        </g>
      ))}
      {Array.from({ length: 40 }, (_, i) => {
        const x = 5 + i * 10, sw = Math.sin(((x % 100) / 100) * Math.PI)
        const y1 = 10 + sw * 62, len = 14 + (i % 4) * 8
        return (
          <g key={i}>
            <line x1={x} y1={y1} x2={x} y2={y1 + len} stroke={G[3]} strokeWidth=".9" />
            <path d={`M${x} ${y1 + len} l-2 5 h4 Z`} fill={G[1]} />
          </g>
        )
      })}
    </svg>
  )
}

/** Rideau latéral doré retenu par une embrasse, avec un bouquet blanc en bas. */
function Drape({ side }) {
  const id = `drape-${side}`
  return (
    <svg viewBox="0 0 80 500" preserveAspectRatio="none" aria-hidden
      className={`absolute top-0 bottom-0 h-full w-[48px] sm:w-[64px] ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}>
      <GoldDefs id={id} />
      <path d="M0 0 H78 Q46 120 30 230 Q52 330 62 500 H0 Z" fill={`url(#${id})`} />
      {[10, 22, 34, 50].map(x => <path key={x} d={`M${x} 0 Q${x * 0.6 + 8} 140 ${x * 0.4 + 6} 230 Q${x * 0.6 + 14} 360 ${x} 500`} stroke={G[0]} strokeOpacity=".28" fill="none" />)}
      <path d="M58 4 Q30 150 22 230 Q40 360 46 500" stroke={G[2]} strokeOpacity=".7" strokeWidth="2" fill="none" />
      {/* embrasse */}
      <path d="M0 222 Q22 214 34 230 Q22 246 0 238 Z" fill={G[3]} />
      <circle cx="34" cy="232" r="4" fill={G[1]} />
      <path d="M34 236 l-3 16 h6 Z" fill={G[1]} />
    </svg>
  )
}

/** Rideaux de théâtre dorés qui s'ouvrent quand la section entre dans l'écran. */
function TheatreCurtains() {
  const pleats = `repeating-linear-gradient(90deg, rgba(70,42,6,.55) 0px, rgba(201,154,62,.15) 9px, rgba(255,240,196,.35) 15px, rgba(201,154,62,.1) 22px, rgba(70,42,6,.55) 32px), url("${LEAF}")`
  return ['left', 'right'].map(side => (
    <motion.div key={side} aria-hidden data-testid={`curtain-${side}`}
      className={`absolute inset-y-0 z-10 w-1/2 ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ backgroundImage: `linear-gradient(180deg, rgba(60,38,6,.35), transparent 22%, transparent 75%, rgba(60,38,6,.45)), ${pleats}`,
        backgroundSize: 'auto, auto, 300px',
        boxShadow: side === 'left' ? 'inset -14px 0 20px -8px rgba(50,30,5,.55)' : 'inset 14px 0 20px -8px rgba(50,30,5,.55)' }}
      initial={{ x: 0 }} whileInView={{ x: side === 'left' ? '-104%' : '104%' }}
      viewport={{ once: true, amount: 0.35 }} transition={{ duration: 2, delay: 0.25, ease: [0.7, 0, 0.25, 1] }}>
      <span className={`absolute inset-y-0 w-[3px] ${side === 'left' ? 'right-0' : 'left-0'}`} style={{ background: `linear-gradient(180deg, ${G[2]}, ${G[1]})` }} />
    </motion.div>
  ))
}

/** Volute d'angle du cadre baroque. */
const Scroll = ({ className, style }) => (
  <svg viewBox="0 0 60 60" className={className} style={style} aria-hidden>
    <GoldDefs id="scroll-gold" />
    <path d="M4 56 Q4 20 34 12 Q50 8 54 18 Q58 30 44 32 Q34 33 36 24" fill="none" stroke="url(#scroll-gold)" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M10 56 Q12 30 32 22" fill="none" stroke="url(#scroll-gold)" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="8" cy="56" r="3.5" fill="url(#scroll-gold)" />
  </svg>
)

/** Cadre baroque doré surmonté d'un lustre. */
function BaroqueFrame({ children, reduced }) {
  return (
    <div className="relative mx-auto max-w-[390px] pt-[92px]">
      <Flora src={ROSE.blush} reduced={reduced} rotate={-14} className="z-10 w-[36%] -left-[14%] -bottom-[21%]" />
      <Flora src={ROSE.china} reduced={reduced} rotate={12} flip delay={0.25} className="z-10 w-[32%] -right-[12%] -bottom-[22%]" />
      <svg viewBox="0 0 300 126" className="absolute left-1/2 top-0 -translate-x-1/2 w-[92%]" aria-hidden>
        <GoldDefs id="frame-gold" />
        <path d="M16 126 Q16 74 68 64 Q110 57 128 34 Q140 17 150 17 Q160 17 172 34 Q190 57 232 64 Q284 74 284 126"
          fill="none" stroke="url(#frame-gold)" strokeWidth="5" />
        <path d="M28 126 Q30 82 72 75 Q114 68 134 45 Q144 32 150 32 Q156 32 166 45 Q186 68 228 75 Q270 82 272 126"
          fill="none" stroke="url(#frame-gold)" strokeWidth="1.8" />
        <path d="M116 42 q-16 -18 -2 -30 q10 -7 16 5 M184 42 q16 -18 2 -30 q-10 -7 -16 5 M70 66 q-10 -14 2 -22 q8 -4 12 4 M230 66 q10 -14 -2 -22 q-8 -4 -12 4"
          fill="none" stroke="url(#frame-gold)" strokeWidth="3" strokeLinecap="round" />
        <path d="M150 4 l6 10 l-6 6 l-6 -6 Z" fill="url(#frame-gold)" />
        <defs><filter id="flame-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3" /></filter></defs>
        {/* lustre, qui se balance doucement */}
        <motion.g style={{ originX: 0.5, originY: 0 }} animate={reduced ? undefined : { rotate: [-1.8, 1.8] }}
          transition={{ duration: 3.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}>
        <line x1="150" y1="20" x2="150" y2="60" stroke={G[3]} strokeWidth="1.6" />
        <path d="M112 78 Q132 98 150 98 Q168 98 188 78" fill="none" stroke="url(#frame-gold)" strokeWidth="3" />
        <path d="M124 74 Q138 90 150 90 Q162 90 176 74" fill="none" stroke="url(#frame-gold)" strokeWidth="2" />
        <ellipse cx="150" cy="64" rx="10" ry="6.5" fill="url(#frame-gold)" />
        <path d="M143 98 L150 116 L157 98 Z" fill="url(#frame-gold)" />
        {[112, 124, 150, 176, 188].map((x, i) => (
          <g key={i}>
            <motion.circle cx={x} cy={i === 2 ? 61 : 57} r="6" fill="#ffd97a" filter="url(#flame-glow)"
              animate={reduced ? undefined : { opacity: [0.45, 0.9, 0.55, 0.8, 0.45] }}
              transition={{ duration: 1.6 + i * 0.23, repeat: Infinity, ease: 'easeInOut' }} />
            <rect x={x - 2.4} y={i === 2 ? 66 : 62} width="4.8" height="13" rx="1" fill="#fbf4e2" stroke={G[3]} strokeWidth=".6" />
            <motion.path d={`M${x} ${i === 2 ? 59 : 55} q3.4 4.5 0 7 q-3.4 -2.5 0 -7`} fill="#f7c45c" style={{ originX: 0.5, originY: 1 }}
              animate={reduced ? undefined : { scaleY: [1, 1.3, 0.92, 1.18, 1], scaleX: [1, 0.86, 1.06, 0.92, 1], skewX: [0, 4, -3, 2, 0] }}
              transition={{ duration: 1.1 + i * 0.17, repeat: Infinity, ease: 'easeInOut' }} />
          </g>
        ))}
        {[128, 136, 164, 172].map((x, i) => (
          <motion.g key={x} style={{ originX: 0.5, originY: 0 }} animate={reduced ? undefined : { rotate: [-6, 6] }}
            transition={{ duration: 1.9 + i * 0.3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}>
            <line x1={x} y1="92" x2={x} y2="104" stroke={G[2]} strokeWidth=".8" /><circle cx={x} cy="106" r="2" fill={G[2]} />
          </motion.g>
        ))}
        </motion.g>
      </svg>
      <div className="relative px-7 pb-12 pt-10"
        style={{ border: `3px solid ${G[3]}`, borderTop: 'none', boxShadow: `inset 0 0 0 6px ${IVORY}, inset 0 0 0 7.5px ${G[1]}, 0 18px 40px -24px rgba(90,60,20,.4)` }}>
        {children}
        <Scroll className="absolute -left-[9px] -bottom-[9px] w-12" />
        <Scroll className="absolute -right-[9px] -bottom-[9px] w-12" style={{ transform: 'scaleX(-1)' }} />
      </div>
    </div>
  )
}

const Ornament = () => (
  <svg viewBox="0 0 140 28" className="w-36 mx-auto my-3" aria-hidden>
    <GoldDefs id="orn-gold" />
    <path d="M6 14 H46 M94 14 H134" stroke="url(#orn-gold)" strokeWidth="1.2" />
    <path d="M70 3 Q78 14 70 25 Q62 14 70 3 Z" fill="url(#orn-gold)" />
    <path d="M52 14 q8 -10 14 0 q-6 10 -14 0 M88 14 q-8 -10 -14 0 q6 10 14 0" fill="none" stroke="url(#orn-gold)" strokeWidth="1.4" />
    <circle cx="50" cy="14" r="2" fill={G[3]} /><circle cx="90" cy="14" r="2" fill={G[3]} />
  </svg>
)

const Heading = ({ children, kicker, color, size = 46 }) => (
  <div className="text-center">
    {kicker && <p className="inv-serif text-[13px] opacity-75" style={caps}>{kicker}</p>}
    <h2 className="inv-script leading-tight" style={{ color, fontSize: size }}>{children}</h2>
  </div>
)

/** Formulaire de réponse : nom, présence, mot pour les hôtes. */
function RsvpForm({ guest, confirmed, declined, busy, err, respond, accent, ink, hosts, foil, reduced }) {
  const answered = confirmed || declined
  const [editing, setEditing] = useState(!answered)
  const [choice, setChoice] = useState(confirmed ? 'confirm' : declined ? 'decline' : null)
  const [message, setMessage] = useState(guest.message || '')
  const [burst, setBurst] = useState(0)
  const field = { background: BEIGE, color: ink }

  if (answered && !editing) {
    return (
      <div className="mt-6 relative" data-testid="rsvp-done">
        {burst > 0 && <GoldBurst key={burst} count={34} spread={170} />}
        <motion.p className="inv-script text-[38px] leading-none" initial={burst && !reduced ? { opacity: 0, scale: 0.85, filter: 'blur(6px)' } : false}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <Foil on={foil && confirmed} color={ink} reduced={reduced}>{confirmed ? 'Merci, à très bientôt !' : 'Vous nous manquerez.'}</Foil>
        </motion.p>
        <p className="inv-serif text-[14px] mt-2" style={caps}>{confirmed ? 'Présence confirmée' : 'Réponse enregistrée'}</p>
        {guest.message && <p className="inv-serif italic text-[15px] mt-3 max-w-[300px] mx-auto">« {guest.message} »</p>}
        <button type="button" onClick={() => setEditing(true)} className="mt-4 inv-serif text-[13px] underline underline-offset-4 opacity-75">
          Modifier ma réponse
        </button>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!choice) return
    await respond(choice, { message })
    setEditing(false)
    if (choice === 'confirm' && !reduced) setBurst(Date.now())
  }

  return (
    <form onSubmit={submit} className="mt-6 mx-auto max-w-[340px] text-left space-y-4" data-testid="rsvp-form">
      <label className="block">
        <span className="inv-script text-[22px]">Nom complet</span>
        <input readOnly value={guest.name} className="mt-1 w-full rounded-[3px] px-3 py-2.5 inv-serif text-[15px] outline-none" style={field} />
      </label>
      <fieldset>
        <legend className="inv-script text-[22px]">Serez-vous présent(e) ? *</legend>
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
          {[['confirm', 'Avec joie, j’accepte'], ['decline', 'Je regrette, je décline']].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 inv-serif text-[15px] cursor-pointer">
              <input type="radio" name="rsvp-choice" value={k} checked={choice === k} onChange={() => setChoice(k)}
                className="h-4 w-4" style={{ accentColor: accent }} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="inv-script text-[22px]">Un mot pour {hosts}</span>
        <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={500} rows={4}
          placeholder="Partagez vos vœux…" className="mt-1 w-full rounded-[3px] px-3 py-2.5 inv-serif text-[15px] outline-none resize-none" style={field} />
      </label>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button type="submit" disabled={busy || !choice}
        className="w-full rounded-[3px] py-3 inv-serif text-[15px] text-white flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: `linear-gradient(180deg, ${accent}, ${accent}dd)`, boxShadow: `0 10px 22px -14px ${accent}` }}>
        {busy ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Icon name="send" size={17} />}
        <span style={caps}>Envoyer ma réponse</span>
      </button>
    </form>
  )
}

/** Galerie en plein écran : glisser, flèches, Échap. */
function Lightbox({ photos, index, onClose, onGo }) {
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onGo(1)
      if (e.key === 'ArrowLeft') onGo(-1)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow }
  }, [onClose, onGo])
  const nav = 'absolute top-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center backdrop-blur-sm'
  const navStyle = { background: 'rgba(255,248,230,.12)', border: `1px solid ${G[1]}88`, color: G[2] }
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Galerie photo"
      data-testid="heure-doree-lightbox" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(46,34,16,.94), rgba(14,10,4,.97))' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.img key={index} src={photos[index]} alt="" draggable={false}
          className="max-h-[78svh] max-w-[88vw] object-contain cursor-grab active:cursor-grabbing"
          style={{ boxShadow: `0 0 0 1px ${G[3]}, 0 0 0 7px rgba(14,10,4,.6), 0 0 0 8px ${G[1]}77, 0 30px 70px -20px #000` }}
          initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5}
          onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 60) onGo(info.offset.x < 0 ? 1 : -1) }}
          onClick={e => e.stopPropagation()} />
      </AnimatePresence>
      <button type="button" onClick={onClose} aria-label="Fermer la galerie" className="absolute top-4 right-4 h-11 w-11 rounded-full flex items-center justify-center" style={navStyle}>
        <Icon name="close" size={20} />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Photo précédente" className={`${nav} left-3`} style={navStyle} onClick={e => { e.stopPropagation(); onGo(-1) }}><Icon name="chevron_left" size={24} /></button>
          <button type="button" aria-label="Photo suivante" className={`${nav} right-3`} style={navStyle} onClick={e => { e.stopPropagation(); onGo(1) }}><Icon name="chevron_right" size={24} /></button>
        </>
      )}
      <p className="absolute bottom-6 inset-x-0 text-center inv-serif text-[13px]" style={{ ...caps, color: G[2] }}>{index + 1} / {photos.length}</p>
    </motion.div>
  )
}

export default function HeureDoree({ occasion, guest, token, tableLabel, confirmed, declined, busy, err, respond, rsvpRef, t, reduced, preview = false }) {
  const [stage, setStage] = useState(() => (preview || readSeen(token) ? 'open' : 'sealed'))
  const [playing, setPlaying] = useState(false)
  const audio = useRef(null)
  const c = occasion.content || {}
  const custom = occasion.theme?.palette && occasion.theme.palette !== 'auto'
  const ink = custom ? t.ink : BROWN
  const accent = custom ? t.main : '#9a7a4a'
  const photos = occasion.photos || []
  const hero = occasion.cover_url || photos[0]
  const gallery = photos.filter(p => p !== hero).slice(0, 3)
  const { title, couple } = eventNames(occasion.name)
  const date = startOf(occasion)
  const dateLong = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = occasion.starts_at ? `${pad(date.getHours())}h${pad(date.getMinutes())}` : null
  const [venue, ...rest] = (occasion.location || '').split(',')
  const music = !preview && occasion.music_url
  const foil = !custom
  const live = !preview && !reduced
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 900], [0, 200])
  const heroFade = useTransform(scrollY, [0, 500], [1, 0.35])
  const [shown, setShown] = useState(null)
  const closeBox = useCallback(() => setShown(null), [])
  const goBox = useCallback(d => setShown(i => (i + d + gallery.length) % gallery.length), [gallery.length])

  const play = () => { audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  const toggleMusic = () => {
    if (!audio.current) return
    if (playing) { audio.current.pause(); setPlaying(false) } else play()
  }
  const open = () => {
    if (stage !== 'sealed') return
    if (music) play() // le geste d'ouverture autorise la lecture
    if (reduced) { setStage('open'); writeSeen(token); return }
    setStage('opening')
    setTimeout(() => { setStage('open'); writeSeen(token) }, 1500)
  }
  const toRsvp = () => rsvpRef?.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })

  return (
    <div className="relative text-center overflow-x-clip" data-testid="heure-doree" style={{ backgroundColor: IVORY, backgroundImage: PAPER, backgroundSize: 'auto, 512px', color: ink }}>
      <AnimatePresence>
        {stage !== 'open' && !preview && <Intro occasion={occasion} opening={stage === 'opening'} onOpen={open} reduced={reduced} />}
      </AnimatePresence>

      <AnimatePresence>
        {shown !== null && gallery.length > 0 && <Lightbox photos={gallery} index={shown} onClose={closeBox} onGo={goBox} />}
      </AnimatePresence>

      {music && (
        <>
          <audio ref={audio} src={occasion.music_url} loop preload="auto" />
          <button type="button" onClick={toggleMusic} aria-label={playing ? 'Couper la musique' : 'Lancer la musique'} aria-pressed={playing}
            className="fixed z-40 h-10 w-10 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ right: 'max(14px, env(safe-area-inset-right, 0px))', bottom: 'max(14px, env(safe-area-inset-bottom, 0px))', background: `${IVORY}dd`, border: `1px solid ${G[3]}`, color: ink }}>
            <Icon name={playing ? 'volume_up' : 'volume_off'} size={19} />
          </button>
        </>
      )}

      {/* Ouverture : photo du couple en plein écran */}
      <header className="relative overflow-hidden" style={{ height: preview ? 640 : '100svh', minHeight: 560 }}>
        {hero ? (
          <motion.img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover"
            style={live ? { y: heroY } : undefined}
            initial={reduced ? false : { scale: 1.12 }} animate={stage === 'open' ? { scale: 1.04 } : {}}
            transition={{ duration: 7, ease: 'easeOut' }} />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 50% 35%, ${G[2]}, ${G[1]} 55%, ${G[3]})` }} />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${IVORY}e6 0%, ${IVORY}99 16%, ${IVORY}00 36%, ${IVORY}00 80%, ${IVORY}cc 94%, ${IVORY} 100%)` }} />
        {!reduced && <GoldDust />}
        <motion.div className="relative pt-16 px-6" style={live ? { opacity: heroFade } : undefined}>
          <motion.p className="inv-serif text-[13px]" style={caps}
            initial={reduced ? false : { opacity: 0, letterSpacing: '0.6em' }} animate={stage === 'open' ? { opacity: 1, letterSpacing: '0.24em' } : {}}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            {occasion.type === 'mariage' ? 'Nous nous marions' : 'Vous êtes invité(e)'}
          </motion.p>
          <h1 className="inv-script text-[54px] leading-[1.05] mt-1" aria-label={couple ? `${couple[0]} & ${couple[1]}` : title}>
            {(couple ? [couple[0], '&', couple[1]] : [title]).map((w, i) => (
              <motion.span key={i} aria-hidden className={`inline-block ${w === '&' ? 'text-[40px] mx-2.5' : ''}`}
                initial={reduced ? false : { opacity: 0, y: 18, filter: 'blur(10px)' }}
                animate={stage === 'open' ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                transition={{ duration: 1.1, delay: 0.5 + i * 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <Foil on={foil} color={ink} reduced={reduced} delay={i * 0.4}>{w}</Foil>
              </motion.span>
            ))}
          </h1>
          <div className="my-2 flex items-center justify-center gap-2" aria-hidden>
            <motion.span className="h-px w-14 origin-right" style={{ background: foil ? G[3] : ink, opacity: 0.7 }}
              initial={reduced ? false : { scaleX: 0 }} animate={stage === 'open' ? { scaleX: 1 } : {}} transition={{ duration: 1, delay: 1.5 }} />
            <motion.span className="h-1.5 w-1.5 rotate-45" style={{ background: foil ? G[3] : ink, opacity: 0.85 }}
              initial={reduced ? false : { scale: 0 }} animate={stage === 'open' ? { scale: 1 } : {}} transition={{ duration: 0.5, delay: 1.4 }} />
            <motion.span className="h-px w-14 origin-left" style={{ background: foil ? G[3] : ink, opacity: 0.7 }}
              initial={reduced ? false : { scaleX: 0 }} animate={stage === 'open' ? { scaleX: 1 } : {}} transition={{ duration: 1, delay: 1.5 }} />
          </div>
          <motion.p className="inv-serif text-[14px]" style={caps}
            initial={reduced ? false : { opacity: 0, y: 8 }} animate={stage === 'open' ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 1.8 }}>
            {dateLong}
          </motion.p>
        </motion.div>
        <Flora src={ROSE.blush} reduced={reduced} rotate={16} delay={2} className="z-[1] w-[40%] max-w-[230px] -left-[14%] -bottom-[6%]" />
        <Flora src={ROSE.white} reduced={reduced} rotate={-18} flip delay={2.3} className="z-[1] w-[38%] max-w-[220px] -right-[13%] -bottom-[8%]" />
        {!occasion.is_expired && (
          <motion.button type="button" onClick={toRsvp}
            className="absolute z-[2] left-1/2 -translate-x-1/2 bottom-[7%] inv-serif text-[14px] whitespace-nowrap pb-0.5 flex flex-col items-center"
            style={{ color: ink, textShadow: `0 0 12px ${IVORY}` }}
            initial={reduced ? false : { opacity: 0 }} animate={stage === 'open' ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 2.2 }}>
            <span className="pb-0.5" style={{ ...caps, borderBottom: `1px solid ${ink}66` }}>Confirmer ma présence</span>
            {!reduced && (
              <motion.span className="mt-1.5" animate={{ y: [0, 5, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }}>
                <Icon name="keyboard_arrow_down" size={18} />
              </motion.span>
            )}
          </motion.button>
        )}
      </header>

      <div className="px-5">
        <motion.p {...view(reduced)} className="inv-script text-[32px] leading-snug mt-10 px-2 whitespace-pre-line">
          {c.verse || 'Là où l’amour commence,\nl’éternité se dessine doucement.'}
        </motion.p>
        {c.verse_ref && <p className="inv-serif italic text-[13px] opacity-70">{c.verse_ref}</p>}
      </div>

      {/* Compte à rebours entre deux grandes colonnes fleuries */}
      {!occasion.is_expired && (
        <motion.section className="mt-8 grid grid-cols-[24%_1fr_24%] items-center"
          initial={reduced ? false : 'hidden'} whileInView="shown" viewport={{ once: true, amount: 0.3 }}>
          {[false, true].map(flip => (
            <div key={String(flip)} className={`relative w-full max-w-[110px] ${flip ? 'justify-self-end col-start-3 row-start-1' : 'justify-self-start'}`}>
              <motion.div variants={{ hidden: { clipPath: 'inset(100% 0 0 0)' }, shown: { clipPath: 'inset(0% 0 0 0)', transition: { duration: 1.3, ease: [0.65, 0, 0.35, 1] } } }}>
                <Column flip={flip} />
              </motion.div>
              <Flora src={flip ? ROSE.china : ROSE.white} reduced={reduced} flip={flip} rotate={flip ? -10 : 10} delay={1.1}
                className={`z-10 w-[150%] -top-[9%] ${flip ? '-right-[38%]' : '-left-[38%]'}`} />
              <Flora src={flip ? ROSE.wild : ROSE.villosa} reduced={reduced} flip={!flip} rotate={flip ? 8 : -8} delay={1.5}
                className={`z-10 w-[120%] -bottom-[4%] ${flip ? '-right-[30%]' : '-left-[30%]'}`} />
            </div>
          ))}
          <motion.div className="min-w-0 px-1 col-start-2 row-start-1"
            variants={{ hidden: { opacity: 0, y: 20 }, shown: { opacity: 1, y: 0, transition: { duration: 0.9, delay: 0.4 } } }}>
            <Heading color={ink} size={44}>Compte à rebours</Heading>
            <p className="inv-serif italic text-[14px] opacity-80 mb-5">Jusqu’au plus beau jour de notre vie</p>
            <Countdown target={date} color={ink} reduced={reduced} />
          </motion.div>
        </motion.section>
      )}

      {/* Galerie bord à bord */}
      {gallery.length > 0 && (
        <motion.section {...view(reduced)} className="mt-12">
          <Heading color={ink}>Un aperçu de nous</Heading>
          <div className="mt-4 flex items-center justify-center gap-2 overflow-hidden" data-testid="heure-doree-gallery">
            {gallery.map((src, i) => {
              const trio = gallery.length === 3
              const side = trio && i !== 1
              const cls = trio
                ? (i === 1 ? 'w-[46%] aspect-[3/4.2] shadow-md' : `w-[30%] aspect-[3/4.6] ${i === 0 ? '-ml-[6%]' : '-mr-[6%]'}`)
                : 'w-[46%] aspect-[3/4.2] shadow-md'
              return (
                <motion.button key={src} type="button" disabled={preview} onClick={() => setShown(i)} aria-label={`Agrandir la photo ${i + 1}`}
                  className={`relative shrink-0 overflow-hidden group ${cls}`}
                  initial={reduced ? false : { opacity: 0, x: side ? (i === 0 ? -40 : 40) : 0, scale: side ? 1 : 0.92 }}
                  whileInView={{ opacity: 1, x: 0, scale: 1 }} viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 1, delay: side ? 0.25 : 0, ease: [0.22, 1, 0.36, 1] }}>
                  <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {!trio || i === 1 ? <span aria-hidden className="absolute inset-[6px] pointer-events-none" style={{ border: `1px solid ${G[2]}aa` }} /> : null}
                </motion.button>
              )
            })}
          </div>
          {!preview && <p className="mt-2 inv-serif italic text-[12.5px] opacity-60">Touchez une photo pour l’agrandir</p>}
        </motion.section>
      )}

      {/* Notre histoire, sous des rideaux dorés */}
      {c.story?.length > 0 && (
        <section className="relative mt-12 pb-20 overflow-hidden" data-testid="heure-doree-story">
          {live && <TheatreCurtains />}
          <div className="relative z-20"><Valance /></div>
          <Drape side="left" /><Drape side="right" />
          <Flora src={ROSE.white} reduced={reduced} rotate={-10} className="z-[15] w-[34%] -left-[8%] -bottom-[3%]" />
          <Flora src={ROSE.china} reduced={reduced} rotate={10} flip delay={0.2} className="z-[15] w-[32%] -right-[8%] -bottom-[4%]" />
          <div className="relative px-14 sm:px-20">
            <motion.div {...view(reduced)} className="-mt-3"><Heading color={ink}>Notre histoire</Heading></motion.div>
            <ol className="mt-6 space-y-10">
              {c.story.map((s, i) => (
                <motion.li key={i} {...view(reduced, 0.05)}>
                  {s.year && <p className="inv-serif text-[13px] opacity-70" style={caps}>{s.year}</p>}
                  <p className="inv-script text-[34px] leading-tight">{s.title}</p>
                  {s.text && <p className="inv-serif text-[15px] leading-relaxed mt-1 opacity-90">{s.text}</p>}
                </motion.li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <div className="px-5 pb-8">
        {/* Déroulé de la journée, sur une carte blanche */}
        {c.program?.length > 0 && (
          <motion.section {...view(reduced)} className="mt-12">
            <Heading color={ink}>Le déroulé</Heading>
            <p className="inv-serif text-[13px] -mt-1 opacity-70" style={caps}>Notre grand jour</p>
            <div className="relative mx-auto max-w-[360px] mt-6">
            <Flora src={ROSE.blush} reduced={reduced} rotate={-160} className="w-[44%] -right-[14%] -top-[17%]" />
            <Flora src={ROSE.wild} reduced={reduced} rotate={14} flip delay={0.3} className="w-[36%] -left-[13%] -bottom-[15%]" />
            <div className="relative rounded-[4px] bg-white/90 px-6 py-7 text-left"
              style={{ boxShadow: '0 14px 34px -22px rgba(90,60,20,.35)', border: `1px solid ${G[1]}33` }}>
              <ol className="relative pl-7">
                <motion.span aria-hidden className="absolute left-[4px] top-3 bottom-3 w-px origin-top" style={{ background: `linear-gradient(180deg, ${G[3]}, ${ink}55)` }}
                  initial={reduced ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 1.6, ease: 'easeInOut' }} />
                {c.program.map((p, i) => (
                  <motion.li key={i} className="relative pb-6 last:pb-0"
                    initial={reduced ? false : { opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.6, delay: 0.04 * i }}>
                    <span aria-hidden className="absolute -left-[27px] top-[22px] h-2 w-2 rounded-full" style={{ background: ink }} />
                    <p className="inv-serif text-[12px] opacity-70" style={caps}>{p.time}</p>
                    <p className="inv-script text-[28px] leading-tight">{p.label}</p>
                    {p.note && <p className="inv-serif text-[14px] opacity-80">{p.note}</p>}
                  </motion.li>
                ))}
              </ol>
            </div>
            </div>
          </motion.section>
        )}

        {/* Détails de l'événement */}
        <motion.section {...view(reduced)} className="mt-14">
          <BaroqueFrame reduced={reduced}>
            <p className="inv-serif text-[12.5px] opacity-75" style={caps}>Rejoignez-nous pour célébrer</p>
            <h2 className="inv-script text-[44px] leading-tight">Les détails</h2>
            <p className="inv-serif text-[16px] mt-2">{dateLong}</p>
            {time && (
              <p className="inv-serif text-[14px] mt-1 flex items-center justify-center gap-1.5 opacity-90">
                <Icon name="schedule" size={16} /> {c.ceremony ? `${c.ceremony} à ${time}` : `À partir de ${time}`}
              </p>
            )}
            {occasion.location && (
              <>
                <p className="inv-script text-[32px] leading-tight mt-4">{venue.trim()}</p>
                {rest.length > 0 && <p className="inv-serif text-[14px] opacity-80">{rest.join(',').trim()}</p>}
              </>
            )}
            <div className="mt-6 flex flex-col items-center gap-2.5">
              {occasion.location && (
                <a href={mapsUrl(occasion.location)} target="_blank" rel="noreferrer"
                  className="w-full max-w-[250px] inv-serif text-[13px] py-2.5 rounded-[3px] flex items-center justify-center gap-1.5 whitespace-nowrap"
                  style={{ border: `1px solid ${ink}55` }}>
                  <Icon name="location_on" size={16} /> <span style={caps}>Ouvrir dans Google Maps</span>
                </a>
              )}
              <a href={calendarHref(token, API_BASE)} aria-label="Ajouter l'événement à mon agenda"
                className="w-full max-w-[250px] inv-serif text-[13px] py-2.5 rounded-[3px] flex items-center justify-center gap-1.5 whitespace-nowrap"
                style={{ border: `1px solid ${ink}55` }}>
                <Icon name="event" size={16} /> <span style={caps}>Ajouter à l’agenda</span>
              </a>
              {isAndroid() && (
                <a href={googleCalendarUrl(occasion, { inviteUrl: window.location.href, table: tableLabel })}
                  target="_blank" rel="noreferrer" className="inv-serif text-[13px] underline underline-offset-4 opacity-80">
                  Ou ajouter à Google Agenda
                </a>
              )}
            </div>
            {(c.dress_title || c.dress_text) && (
              <div className="mt-7 pt-5" style={{ borderTop: `1px solid ${G[3]}55` }}>
                <p className="inv-serif text-[12.5px] opacity-75" style={caps}>Tenue</p>
                {c.dress_title && <p className="inv-script text-[30px] leading-tight">{c.dress_title}</p>}
                {c.dress_text && <p className="inv-serif text-[14px] opacity-85 whitespace-pre-line">{c.dress_text}</p>}
              </div>
            )}
          </BaroqueFrame>
        </motion.section>

        {/* Réponse */}
        <motion.section {...view(reduced)} ref={rsvpRef} className="mt-16 scroll-mt-6">
          <p className="inv-serif text-[13px] opacity-75" style={caps}>Soyez notre invité</p>
          <h2 className="inv-script text-[58px] leading-none mt-1"><Foil on={foil} color={ink} reduced={reduced}>RSVP</Foil></h2>
          <Ornament />
          <p className="inv-serif text-[15px] leading-relaxed max-w-[330px] mx-auto">
            {c.intro || `${guest.name}, votre présence rendrait cette journée encore plus belle. Merci de nous confirmer votre venue.`}
          </p>
          {occasion.is_expired
            ? <p className="mt-6 inv-serif italic text-lg opacity-80">Cet événement est passé. Merci d’en avoir fait partie.</p>
            : <RsvpForm guest={guest} confirmed={confirmed} declined={declined} busy={busy} err={err} respond={respond} accent={accent} ink={ink} foil={foil} reduced={reduced} hosts={occasion.type === 'mariage' ? 'les mariés' : 'les hôtes'} />}
        </motion.section>

        {/* Pass d'accès */}
        {!occasion.is_expired && (
          <motion.section {...view(reduced)} data-testid="invitation-access" className="mt-14">
            <p className="inv-serif text-[13px] opacity-75" style={caps}>Votre pass d’accès</p>
            {guest.qr && (
              <div className="mx-auto mt-3 w-44 p-[2px] rounded-[3px]" style={{ background: t.gold }}>
                <div className="bg-white p-3 rounded-[2px]"><img src={guest.qr} alt="Votre QR d'accès" className="w-full aspect-square" /></div>
              </div>
            )}
            <p className="inv-serif italic text-[14px] mt-3 opacity-80">À présenter à l’accueil le jour J.</p>
            <p className="inv-serif text-[15px] mt-0.5">{guest.name}{tableLabel && ` · ${tableLabel}`}</p>
          </motion.section>
        )}

        {occasion.video_url && (
          <motion.section {...view(reduced)} className="mt-12">
            <Heading color={ink}>Un mot pour vous</Heading>
            <video src={occasion.video_url} className="mt-4 mx-auto w-full max-w-[280px] aspect-[9/16] object-cover rounded-[4px] bg-black" autoPlay muted loop playsInline controls />
          </motion.section>
        )}

        {c.closing && <motion.p {...view(reduced)} className="mt-12 inv-serif italic text-[15px] leading-relaxed whitespace-pre-line max-w-[340px] mx-auto">{c.closing}</motion.p>}

        <footer className="mt-12 flex flex-col items-center gap-3">
          <WaxSeal letters={sealOf(occasion)} size={62} />
          {!preview && !reduced && (
            <button onClick={() => { setStage('sealed'); window.scrollTo({ top: 0 }) }}
              className="inv-jost text-[11px] tracking-[0.22em] uppercase flex items-center gap-1.5 opacity-70">
              <Icon name="replay" size={15} /> Revoir l’ouverture
            </button>
          )}
          <p className="inv-jost text-[11px] opacity-60">Propulsé par Signiq</p>
        </footer>
      </div>
    </div>
  )
}
