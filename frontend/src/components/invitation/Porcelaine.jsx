import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Icon from '../ui/Icon'
import MusicButton from './MusicButton'
import { API_BASE } from '../../lib/axios'
import useMusic from '../../lib/useMusic'
import { calendarHref, eventNames, googleCalendarUrl, initials, isAndroid, loadFont, mapsUrl, startOf, venueOf } from '../../lib/invitationTheme'

/**
 * Modèle « Porcelaine » (bleu de Delft) de l'invitation en ligne : un
 * faire-part en portefeuille crème noué d'un ruban de satin argenté qui
 * s'ouvre comme deux portes sur un cadre de pivoines bleues ; puis un petit
 * site : barre de navigation, compte à rebours et pyramide de coupes de
 * champagne, lieux avec carte, déroulé, dress code, liste de cadeaux (IBAN à
 * copier), réponse, questions fréquentes. Pivoines, ruban et illustrations
 * dessinés en SVG.
 */

const NAVY = '#1c2d5e'
const BLUE = '#2b4a98'
const SKY = '#6d8bcf'
const PALE = '#d6def2'
const PAPER = '#fbfaf6'
const CREAM = '#f2e9d8'
const BODONI = "'Bodoni Moda', 'Didot', 'Playfair Display', Georgia, serif"

const seenKey = (token) => `inv-open:${token}`
const readSeen = (token) => { try { return localStorage.getItem(seenKey(token)) === '1' } catch { return false } }
const writeSeen = (token) => { try { localStorage.setItem(seenKey(token), '1') } catch { /* stockage indisponible */ } }
const pad = (n) => String(n).padStart(2, '0')
const caps = { letterSpacing: '0.28em', textTransform: 'uppercase' }
const view = (reduced, delay = 0) => reduced ? {} : {
  initial: { opacity: 0, y: 26 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' }, transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] },
}

/* ── Pivoines et roses façon faïence ─────────────────────────── */

const ToileDefs = () => (
  <defs>
    <radialGradient id="pz-petal" cx=".5" cy=".35" r=".75"><stop offset="0" stopColor="#f4f7fd" /><stop offset=".55" stopColor="#a9bce6" /><stop offset="1" stopColor="#2b4a98" /></radialGradient>
    <radialGradient id="pz-deep" cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#8ea6dc" /><stop offset="1" stopColor="#1c2d5e" /></radialGradient>
    <linearGradient id="pz-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5f7fc4" /><stop offset="1" stopColor="#1f3a80" /></linearGradient>
  </defs>
)

/** Pivoine : trois couronnes de pétales, du clair au profond. */
function Peony({ x, y, s = 1, r = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
        <path key={`o${a}`} d="M0 0 C-13 -4 -16 -22 -8 -29 C-4 -32 -1 -29 0 -31 C1 -29 4 -32 8 -29 C16 -22 13 -4 0 0 Z" transform={`rotate(${a})`} fill="url(#pz-petal)" stroke={NAVY} strokeWidth=".7" strokeOpacity=".55" />
      ))}
      {[20, 80, 140, 200, 260, 320].map(a => (
        <path key={`m${a}`} d="M0 0 C-10 -3 -11 -15 -5 -19 C-2 -21 2 -21 5 -19 C11 -15 10 -3 0 0 Z" transform={`rotate(${a})`} fill="url(#pz-deep)" stroke={NAVY} strokeWidth=".6" strokeOpacity=".5" />
      ))}
      {[0, 72, 144, 216, 288].map(a => (
        <path key={`i${a}`} d="M0 0 C-4 -3 -4 -9 0 -10 C4 -9 4 -3 0 0 Z" transform={`rotate(${a})`} fill={NAVY} opacity=".85" />
      ))}
      <circle r="2.4" fill="#f4f7fd" />
      {[0, 60, 120, 180, 240, 300].map(a => <path key={`h${a}`} d="M0 -12 q3 -6 0 -12" transform={`rotate(${a})`} stroke="#f4f7fd" strokeWidth=".6" fill="none" opacity=".7" />)}
    </g>
  )
}

/** Rose épanouie : couronne profonde, cœur clair. */
function Rose({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <path key={`o${a}`} d="M0 0 C-11 -3 -13 -18 -6 -23 C-2 -25 2 -25 6 -23 C13 -18 11 -3 0 0 Z" transform={`rotate(${a})`} fill="url(#pz-deep)" stroke={NAVY} strokeWidth=".6" strokeOpacity=".6" />
      ))}
      {[30, 102, 174, 246, 318].map(a => (
        <path key={`i${a}`} d="M0 0 C-7 -4 -7 -14 0 -16 C7 -14 7 -4 0 0 Z" transform={`rotate(${a})`} fill="url(#pz-petal)" stroke={NAVY} strokeWidth=".5" strokeOpacity=".5" />
      ))}
      <path d="M-4 1 C-4 -5 4 -6 4 0 C4 4 -1 5 -2 2" fill="none" stroke={NAVY} strokeWidth="1" strokeLinecap="round" />
    </g>
  )
}

const Bud = ({ x, y, r = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <path d="M0 0 C-5 -4 -4 -13 0 -16 C4 -13 5 -4 0 0 Z" fill="url(#pz-deep)" stroke={NAVY} strokeWidth=".5" />
    <path d="M0 0 L0 12" stroke={BLUE} strokeWidth="1" />
  </g>
)

const Leaf = ({ x, y, r = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M0 0 C8 -6 22 -6 30 0 C22 6 8 6 0 0 Z" fill="url(#pz-leaf)" />
    <path d="M2 0 H28" stroke="#dfe6f7" strokeWidth=".6" opacity=".8" />
    {[8, 14, 20].map(x2 => <path key={x2} d={`M${x2} 0 l4 -3 M${x2} 0 l4 3`} stroke="#dfe6f7" strokeWidth=".5" opacity=".6" />)}
  </g>
)

/** Bouquet de pivoines, roses, boutons et feuilles. */
function Cluster({ items }) {
  return items.map(([k, ...a], i) => {
    if (k === 'p') return <Peony key={i} x={a[0]} y={a[1]} s={a[2]} r={a[3]} />
    if (k === 'r') return <Rose key={i} x={a[0]} y={a[1]} s={a[2]} />
    if (k === 'b') return <Bud key={i} x={a[0]} y={a[1]} r={a[2]} />
    return <Leaf key={i} x={a[0]} y={a[1]} r={a[2]} s={a[3]} />
  })
}

const TOP = [
  ['l', -10, 120, -20, 2.4], ['l', 70, 20, 30, 2.2], ['l', 150, 95, 200, 2], ['l', 230, 10, -30, 2.2], ['l', 300, 120, 160, 2.3], ['l', 330, 20, 20, 2],
  ['l', 20, 230, 60, 1.8], ['l', 360, 230, 120, 1.8], ['l', 110, 175, 150, 1.6], ['l', 270, 185, 30, 1.6],
  ['p', 30, 40, 2.7, 10], ['p', 170, 20, 2.2, -25], ['p', 330, 50, 2.9, 25], ['r', 100, 115, 2.1], ['r', 255, 110, 2],
  ['p', 375, 175, 2, 0], ['p', 0, 175, 2, 40], ['r', 200, 95, 1.4], ['b', 140, 170, -25], ['b', 300, 175, 30],
  ['b', 60, 235, 10], ['b', 345, 245, -15], ['r', 60, 165, 1.3],
]
const BOTTOM = [
  ['l', -10, 640, 20, 2.4], ['l', 80, 740, -10, 2.2], ['l', 160, 660, 200, 2], ['l', 250, 750, 30, 2.2], ['l', 310, 640, 150, 2.3], ['l', 370, 740, 200, 2],
  ['l', 20, 540, -50, 1.8], ['l', 360, 540, 230, 1.8], ['l', 120, 590, 210, 1.6], ['l', 280, 585, -30, 1.6],
  ['p', 40, 720, 2.8, -10], ['p', 200, 745, 2.4, 20], ['p', 350, 705, 2.7, 5], ['r', 120, 650, 2.1], ['r', 280, 655, 2],
  ['p', 10, 595, 2, 30], ['p', 380, 590, 1.9, -20], ['r', 195, 640, 1.4], ['b', 70, 580, 15], ['b', 320, 575, -20], ['r', 330, 610, 1.2],
]
const SIDES = [
  ['l', -6, 290, 80, 1.5], ['b', 14, 330, 5], ['l', -6, 380, 100, 1.4], ['r', 10, 430, 1.1], ['l', -6, 470, 70, 1.5], ['b', 16, 500, -10],
  ['l', 396, 300, 100, 1.5], ['b', 376, 345, -5], ['l', 396, 400, 80, 1.4], ['r', 380, 450, 1.1], ['l', 396, 490, 110, 1.5], ['b', 374, 505, 10],
]

/** Couverture : cadre de pivoines bleues autour d'un cartouche. */
function Cover({ occasion, reduced, playing }) {
  const { couple, title } = eventNames(occasion.name)
  const c = occasion.content || {}
  const d = startOf(occasion)
  const place = c.subtitle || (occasion.address || occasion.location || '').split(',').slice(-1)[0]?.trim()
  return (
    <section id="pz-home" className="scroll-mt-14 relative overflow-hidden" style={{ background: PAPER, minHeight: 640 }}>
      <motion.svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden
        initial={reduced ? false : { scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}>
        <ToileDefs />
        <Cluster items={TOP} /><Cluster items={SIDES} /><Cluster items={BOTTOM} />
      </motion.svg>
      <div className="relative flex items-center justify-center px-12" style={{ minHeight: 640 }}>
        <motion.div className="relative w-full max-w-[270px] text-center px-5 py-9"
          style={{ background: PAPER, color: NAVY, boxShadow: `0 0 0 1px ${BLUE}, 0 0 0 5px ${PAPER}, 0 0 0 6px ${SKY}`, borderRadius: 2 }}
          initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: playing ? 0.2 : 0.4 }}>
          <p className="text-[9.5px] leading-relaxed" style={{ ...caps, fontFamily: BODONI }}>Avec tout notre amour,<br />nous vous invitons</p>
          <h1 className="mt-4 leading-[0.95]" style={{ fontFamily: BODONI, fontSize: 50, fontWeight: 400 }}>
            {couple ? <>{couple[0]}<span className="block text-[26px] my-1 italic" style={{ color: SKY }}>&amp;</span>{couple[1]}</> : title}
          </h1>
          <p className="mt-5 text-[13px]" style={{ ...caps, fontFamily: BODONI }}>{pad(d.getDate())} · {pad(d.getMonth() + 1)} · {d.getFullYear()}</p>
          {place && <p className="inv-script text-[24px] mt-1" style={{ color: BLUE }}>{place}</p>}
          <p className="mt-5 text-[9.5px] flex flex-col items-center gap-1" style={{ ...caps, fontFamily: BODONI }}>
            Défiler
            <motion.span animate={reduced ? {} : { y: [0, 5, 0] }} transition={{ duration: 1.8, repeat: Infinity }}><Icon name="expand_more" size={16} /></motion.span>
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ── Ouverture : faire-part en portefeuille noué d'un ruban ──── */

function Ribbon({ untie }) {
  return (
    <motion.div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none" aria-hidden
      animate={untie ? { opacity: 0, scale: 1.08 } : { opacity: 1 }} transition={{ duration: 0.55 }}>
      <div className="h-[22px] w-full" style={{ background: 'linear-gradient(180deg, #f7f8fa, #c3c8d0 45%, #e9ecf0 60%, #9aa1ab)', boxShadow: '0 2px 4px rgba(60,60,70,.25)' }} />
      <svg viewBox="0 0 200 150" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] w-[150px]">
        <defs>
          <linearGradient id="pz-satin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fafbfc" /><stop offset=".45" stopColor="#bcc2cb" /><stop offset=".6" stopColor="#eef0f3" /><stop offset="1" stopColor="#8f97a2" /></linearGradient>
        </defs>
        <motion.path d="M92 70 C70 92 54 128 44 146 L62 146 C70 128 84 100 98 78 Z" fill="url(#pz-satin)" stroke="#8f97a2" strokeWidth=".6"
          animate={untie ? { y: 30, rotate: -12, opacity: 0 } : {}} transition={{ duration: 0.6 }} />
        <motion.path d="M108 70 C130 92 146 128 156 146 L138 146 C130 128 116 100 102 78 Z" fill="url(#pz-satin)" stroke="#8f97a2" strokeWidth=".6"
          animate={untie ? { y: 30, rotate: 12, opacity: 0 } : {}} transition={{ duration: 0.6 }} />
        <path d="M96 66 C70 30 22 30 26 60 C30 86 74 80 96 70 Z" fill="url(#pz-satin)" stroke="#8f97a2" strokeWidth=".7" />
        <path d="M104 66 C130 30 178 30 174 60 C170 86 126 80 104 70 Z" fill="url(#pz-satin)" stroke="#8f97a2" strokeWidth=".7" />
        <path d="M40 56 C56 46 76 52 90 64 M160 56 C144 46 124 52 110 64" stroke="#ffffff" strokeOpacity=".8" strokeWidth="2" fill="none" />
        <rect x="88" y="58" width="24" height="22" rx="7" fill="url(#pz-satin)" stroke="#8f97a2" strokeWidth=".7" />
      </svg>
    </motion.div>
  )
}

function Gatefold({ occasion, opening, onOpen, reduced }) {
  const { couple, title } = eventNames(occasion.name)
  const names = couple ? `${couple[0]} & ${couple[1]}` : title
  const panel = (side) => (
    <motion.div className={`absolute top-0 bottom-0 w-1/2 ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ transformOrigin: side === 'left' ? 'left center' : 'right center', transformStyle: 'preserve-3d', zIndex: 10 }}
      animate={{ rotateY: opening ? (side === 'left' ? -112 : 112) : 0 }}
      transition={{ duration: 1.2, delay: opening ? 0.45 : 0, ease: [0.65, 0, 0.35, 1] }}>
      <div className="absolute inset-0 overflow-hidden" style={{
        background: `linear-gradient(${side === 'left' ? 100 : 260}deg, #f6efe2, ${CREAM} 60%, #e8dcc6)`,
        boxShadow: side === 'left' ? 'inset -1px 0 0 rgba(150,130,100,.35)' : 'inset 1px 0 0 rgba(150,130,100,.35)',
        backfaceVisibility: 'hidden',
      }}>
        <svg viewBox="0 0 100 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          <path d={side === 'left' ? 'M0 0 L100 100 L0 200' : 'M100 0 L0 100 L100 200'} fill="rgba(160,140,110,.07)" stroke="rgba(150,130,100,.3)" strokeWidth=".4" />
          <path d={side === 'left' ? 'M0 22 L78 100 L0 178' : 'M100 22 L22 100 L100 178'} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".5" />
        </svg>
      </div>
    </motion.div>
  )
  return (
    <motion.section key="gatefold" className="fixed inset-0 z-30 flex items-center justify-center" data-testid="porcelaine-intro"
      style={{ background: 'radial-gradient(120% 90% at 50% 30%, #f3efe7, #ddd5c6)' }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.12, transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] } }}>
      <button type="button" onClick={onOpen} disabled={opening} aria-label="Ouvrir l'invitation"
        className="relative w-[min(84vw,380px)] aspect-[0.64] outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        style={{ perspective: 1600, filter: 'drop-shadow(0 24px 30px rgba(70,55,30,.28))' }}>
        {/* Carte de pivoines, derrière les volets */}
        <div className="absolute inset-[3%] overflow-hidden" style={{ background: PAPER }}>
          <svg viewBox="0 0 390 760" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden>
            <ToileDefs /><Cluster items={TOP} /><Cluster items={SIDES} /><Cluster items={BOTTOM} />
          </svg>
          <div className="absolute inset-x-[22%] inset-y-[30%]" style={{ background: PAPER, boxShadow: `0 0 0 1px ${BLUE}, 0 0 0 4px ${PAPER}, 0 0 0 5px ${SKY}` }} />
        </div>
        {panel('left')}{panel('right')}
        {/* Prénoms gaufrés */}
        <motion.p className="absolute inset-x-0 top-[13%] z-20 inv-script text-[30px] text-center pointer-events-none"
          style={{ color: '#e4d8c2', textShadow: '0 1px 0 rgba(255,255,255,.9), 0 -1px 0 rgba(140,120,90,.35)' }}
          animate={{ opacity: opening ? 0 : 1 }} transition={{ duration: 0.3 }}>{names}</motion.p>
        <Ribbon untie={opening} />
        <motion.p className="absolute inset-x-0 bottom-[7%] z-20 text-[10px] text-center pointer-events-none"
          style={{ ...caps, fontFamily: BODONI, color: '#a49479' }}
          animate={opening ? { opacity: 0 } : { opacity: [0.5, 1, 0.5] }} transition={opening ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity }}>
          Touchez pour ouvrir
        </motion.p>
      </button>
    </motion.section>
  )
}

/* ── Illustrations au trait ──────────────────────────────────── */

function ChampagneTower({ reduced }) {
  const rows = [[3], [2, 4], [1, 3, 5], [0, 2, 4, 6]]
  return (
    <svg viewBox="0 0 220 190" className="w-[230px] mx-auto" aria-hidden fill="none" stroke={BLUE} strokeWidth="1.2" strokeLinecap="round">
      {/* bouteille qui verse */}
      <g transform="translate(150 6) rotate(48)">
        <path d="M0 0 h10 v14 q8 6 8 18 v34 h-26 v-34 q0 -12 8 -18 Z" fill={PALE} />
        <path d="M-8 40 h26" />
      </g>
      <motion.path d="M140 22 C128 26 118 30 112 44" stroke={SKY} strokeWidth="1.6" strokeDasharray="4 5"
        animate={reduced ? {} : { strokeDashoffset: [0, -18] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
      {rows.map((cols, r) => cols.map(cx => {
        const x = 20 + cx * 30, y = 52 + r * 34
        return (
          <g key={`${r}-${cx}`}>
            <path d={`M${x - 13} ${y} Q${x} ${y + 14} ${x + 13} ${y}`} fill={r === 0 ? PALE : '#eef2fb'} />
            <path d={`M${x - 13} ${y} H${x + 13}`} />
            <path d={`M${x} ${y + 7} V${y + 24} M${x - 7} ${y + 25} H${x + 7}`} />
          </g>
        )
      }))}
      {!reduced && [0, 1, 2].map(i => (
        <motion.circle key={i} cx={110 + i * 4} cy={50} r="1.4" fill={SKY} stroke="none"
          animate={{ cy: [48, 160], opacity: [0, 1, 0] }} transition={{ duration: 1.6, delay: i * 0.5, repeat: Infinity }} />
      ))}
    </svg>
  )
}

function DancingCouple() {
  return (
    <svg viewBox="0 0 120 150" className="w-28 mx-auto" fill="none" stroke={BLUE} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="52" cy="24" r="8" /><circle cx="70" cy="18" r="7.5" />
      <path d="M70 26 C64 40 58 52 52 62 M70 26 C76 42 78 56 78 70 L74 140 M78 70 L84 140" />
      <path d="M52 32 C50 46 50 56 52 66 C34 96 26 120 22 140 C46 144 74 144 92 140 C84 116 72 92 60 66" fill={PALE} fillOpacity=".5" />
      <path d="M52 38 C60 34 66 32 72 34 M44 40 C38 50 40 60 52 62" />
      <path d="M30 120 C46 124 70 124 88 120" stroke={SKY} />
    </svg>
  )
}

const Corner = ({ className, flip }) => (
  <svg viewBox="0 0 120 120" className={className} style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
    <ToileDefs />
    <Leaf x={10} y={30} r={-20} s={1} /><Leaf x={30} y={60} r={40} s={.9} />
    <Peony x={34} y={34} s={.95} r={15} /><Bud x={78} y={22} r={60} /><Rose x={64} y={62} s={.7} />
  </svg>
)

const Num = ({ n, title }) => (
  <div className="text-center" style={{ color: NAVY }}>
    <p className="text-[11px]" style={{ ...caps, fontFamily: BODONI, color: SKY }}>{n}</p>
    <h2 className="mt-1 leading-tight" style={{ fontFamily: BODONI, fontSize: 34, fontWeight: 400 }}>{title}</h2>
  </div>
)

/* ── Sections ────────────────────────────────────────────────── */

function Countdown({ target }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const s = Math.max(0, Math.floor((target.getTime() - now) / 1000))
  const parts = [[Math.floor(s / 86400), 'Jours'], [Math.floor(s / 3600) % 24, 'Heures'], [Math.floor(s / 60) % 60, 'Minutes'], [s % 60, 'Secondes']]
  return (
    <div className="grid grid-cols-4 gap-2 max-w-[330px] mx-auto" role="timer" aria-label="Compte à rebours avant l'événement">
      {parts.map(([v, l]) => (
        <div key={l} className="bg-white py-3" style={{ boxShadow: `0 0 0 1px ${PALE}, 0 10px 22px -18px ${NAVY}` }}>
          <p className="tabular-nums leading-none" style={{ fontFamily: BODONI, fontSize: 28, color: NAVY }}>{pad(v)}</p>
          <p className="text-[8.5px] mt-2" style={{ ...caps, color: SKY }}>{l}</p>
        </div>
      ))}
    </div>
  )
}

function Venue({ label, name, time, address, preview }) {
  const q = [name, address].filter(Boolean).join(', ')
  return (
    <div className="text-left">
      <p className="text-[10.5px]" style={{ ...caps, color: SKY }}>{label}</p>
      <p className="mt-1 leading-tight" style={{ fontFamily: BODONI, fontSize: 26 }}>{name}</p>
      <p className="text-[14px] mt-1 opacity-80">{[time, address].filter(Boolean).join(' · ')}</p>
      <div className="mt-3 overflow-hidden" style={{ boxShadow: `0 0 0 1px ${PALE}` }}>
        {preview ? (
          <div className="h-40 flex items-center justify-center" style={{ background: '#e8eef8', color: SKY }}><Icon name="map" size={30} /></div>
        ) : (
          <iframe title={`Plan : ${name}`} src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`}
            className="block w-full h-44 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        )}
      </div>
      <a href={mapsUrl(q)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px]" style={{ ...caps, color: NAVY }}>
        Ouvrir dans Maps <Icon name="arrow_forward" size={14} />
      </a>
    </div>
  )
}

function Faq({ items }) {
  const [open, setOpen] = useState(0)
  return (
    <div className="divide-y text-left" style={{ borderTop: `1px solid ${PALE}`, borderBottom: `1px solid ${PALE}`, borderColor: PALE }}>
      {items.map((it, i) => (
        <div key={i} style={{ borderColor: PALE }}>
          <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-3 py-4 text-left" style={{ fontFamily: BODONI, fontSize: 19, color: NAVY }}>
            {it.q}
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} className="flex-shrink-0" style={{ color: SKY }}><Icon name="add" size={20} /></motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden text-[15px] leading-relaxed opacity-85 whitespace-pre-line">
                <span className="block pb-4">{it.a}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

function Gift({ c }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.gift_iban.replace(/\s+/g, '')); setCopied(true); setTimeout(() => setCopied(false), 2200) } catch { setCopied(false) }
  }
  return (
    <>
      <p className="mt-6 text-left leading-tight" style={{ fontFamily: BODONI, fontSize: 34 }}>Un cadeau pour nous</p>
      {c.gift_text && <p className="mt-3 text-left text-[15px] leading-relaxed opacity-85 whitespace-pre-line">{c.gift_text}</p>}
      {c.gift_iban && (
        <div className="mt-5 p-5 text-left" style={{ boxShadow: `0 0 0 1px ${BLUE}`, background: '#fff' }}>
          {c.gift_holder && <p className="text-[10.5px]" style={{ ...caps, color: SKY }}>{c.gift_holder}</p>}
          <p className="mt-2 text-[15px] tracking-[0.12em] break-all select-all" style={{ fontFamily: "'Jost', monospace" }}>{c.gift_iban}</p>
          <button type="button" onClick={copy} className="mt-4 px-5 py-2 text-[11px] text-white flex items-center gap-1.5" style={{ ...caps, background: NAVY }}>
            <Icon name={copied ? 'check' : 'content_copy'} size={14} /> {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      )}
    </>
  )
}

function Rsvp({ guest, confirmed, declined, busy, err, respond, hosts }) {
  const answered = confirmed || declined
  const [editing, setEditing] = useState(!answered)
  const [choice, setChoice] = useState(confirmed ? 'confirm' : declined ? 'decline' : null)
  const [message, setMessage] = useState(guest.message || '')
  if (answered && !editing) {
    return (
      <div className="mt-6">
        <p className="inv-script text-[38px] leading-none" style={{ color: BLUE }}>{confirmed ? 'Merci, à très bientôt !' : 'Vous nous manquerez.'}</p>
        <p className="mt-2 text-[11px]" style={{ ...caps, color: SKY }}>{confirmed ? 'Présence confirmée' : 'Réponse enregistrée'}</p>
        {guest.message && <p className="mt-3 italic text-[16px] max-w-[300px] mx-auto" style={{ fontFamily: BODONI }}>« {guest.message} »</p>}
        <button type="button" onClick={() => setEditing(true)} className="mt-4 text-[11px] underline underline-offset-4" style={{ ...caps }}>Modifier ma réponse</button>
      </div>
    )
  }
  const submit = async (e) => { e.preventDefault(); if (!choice) return; await respond(choice, { message }); setEditing(false) }
  return (
    <form onSubmit={submit} className="mt-6 text-left space-y-5" data-testid="rsvp-form">
      <div className="grid grid-cols-2 gap-2">
        {[['confirm', 'Oui, je serai là'], ['decline', 'Je ne pourrai pas']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setChoice(k)} aria-pressed={choice === k}
            className="py-3 text-[10.5px] transition-colors" style={{ ...caps, background: choice === k ? NAVY : '#fff', color: choice === k ? '#fff' : NAVY, boxShadow: `0 0 0 1px ${choice === k ? NAVY : PALE}` }}>
            {label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-[10.5px]" style={{ ...caps, color: SKY }}>Un mot pour {hosts}</span>
        <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={500} rows={3} placeholder="Vos vœux, une pensée…"
          className="mt-2 w-full bg-transparent border-0 border-b px-0 py-2 text-[16px] outline-none resize-none" style={{ borderColor: PALE, fontFamily: BODONI, color: NAVY }} />
      </label>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button type="submit" disabled={busy || !choice} className="px-7 py-3 text-[11px] text-white flex items-center gap-2 disabled:opacity-50" style={{ ...caps, background: NAVY }}>
        {busy && <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />} Envoyer ma réponse
      </button>
    </form>
  )
}

export default function Porcelaine({ occasion, guest, token, tableLabel, confirmed, declined, busy, err, respond, rsvpRef, t, reduced, preview = false }) {
  const [stage, setStage] = useState(() => (preview || readSeen(token) ? 'open' : 'sealed'))
  const [menu, setMenu] = useState(false)
  const [active, setActive] = useState('pz-home')
  const root = useRef(null)
  const music = useMusic(preview ? null : occasion.music_url)
  const c = occasion.content || {}
  const custom = occasion.theme?.palette && occasion.theme.palette !== 'auto'
  const ink = custom ? t.ink : NAVY
  const { title, couple } = eventNames(occasion.name)
  const date = startOf(occasion)
  const time = occasion.starts_at ? `${pad(date.getHours())}h${pad(date.getMinutes())}` : null
  const { venue, address } = venueOf(occasion)
  const hasGift = !!(c.gift_text || c.gift_iban)
  const mono = initials(occasion)

  useEffect(() => { loadFont('pz-bodoni', 'Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400') }, [])

  // Onglet actif de la barre du bas, d'après la section visible.
  useEffect(() => {
    if (preview || typeof IntersectionObserver === 'undefined') return
    const ids = ['pz-home', 'pz-lieu', 'pz-cadeaux', 'pz-rsvp']
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
    }, { rootMargin: '-45% 0px -50% 0px' })
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [preview, stage])

  const open = () => {
    if (stage !== 'sealed') return
    music.play() // le geste d'ouverture autorise la lecture
    if (reduced) { setStage('open'); writeSeen(token); return }
    setStage('opening')
    setTimeout(() => { setStage('open'); writeSeen(token) }, 1900)
  }
  const go = (id) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }) }

  const tabs = [['pz-home', 'Accueil'], ['pz-lieu', 'Lieu'], ...(hasGift ? [['pz-cadeaux', 'Cadeaux']] : []), ['pz-rsvp', 'RSVP']]
  const links = [['pz-home', 'Accueil'], ['pz-compte', 'Compte à rebours'], ['pz-lieu', 'Le lieu'],
    ...(c.program?.length ? [['pz-jour', 'Le jour J']] : []), ...((c.dress_title || c.dress_text) ? [['pz-dress', 'Dress code']] : []),
    ...(hasGift ? [['pz-cadeaux', 'Liste de cadeaux']] : []), ['pz-rsvp', 'RSVP'], ...(c.faq?.length ? [['pz-faq', 'Questions']] : [])]
  let n = 0
  const num = () => pad(++n)

  return (
    <div ref={root} className="relative" data-testid="porcelaine" style={{ background: PAPER, color: ink, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
      <AnimatePresence>
        {stage !== 'open' && !preview && <Gatefold occasion={occasion} opening={stage === 'opening'} onOpen={open} reduced={reduced} />}
      </AnimatePresence>
      <MusicButton url={music.url} playing={music.playing} onToggle={music.toggle} audioRef={music.attach} color={NAVY} background={PAPER} border={SKY} side="left" bottom={64} />

      {/* Barre du haut */}
      <header className={`${preview ? 'relative' : 'sticky top-0'} z-20 flex items-center justify-between px-4 h-14`} style={{ background: NAVY, color: '#fff' }}>
        <button type="button" onClick={() => go('pz-home')} aria-label="Revenir en haut"
          className="h-9 w-9 rounded-full flex items-center justify-center text-[11px]" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,.6)', fontFamily: BODONI }}>{mono}</button>
        <button type="button" onClick={() => setMenu(true)} aria-label="Ouvrir le menu" aria-expanded={menu}><Icon name="menu" size={24} /></button>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.nav className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5" style={{ background: NAVY, color: '#fff' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Sections de l'invitation">
            <button type="button" onClick={() => setMenu(false)} aria-label="Fermer le menu" className="absolute top-4 right-4"><Icon name="close" size={26} /></button>
            {links.map(([id, label], i) => (
              <motion.button key={id} type="button" onClick={() => go(id)} style={{ fontFamily: BODONI, fontSize: 26 }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>{label}</motion.button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

      <Cover occasion={occasion} reduced={reduced} playing={stage === 'open'} />

      {/* Compte à rebours */}
      {!occasion.is_expired && (
        <section id="pz-compte" className="scroll-mt-14 px-6 pt-16 pb-6 text-center">
          <motion.div {...view(reduced)}>
            <p className="text-[10.5px]" style={{ ...caps, color: SKY }}>Le compte à rebours</p>
            <p className="inv-script text-[40px] leading-tight mt-1" style={{ color: BLUE }}>L’éternité commence dans</p>
          </motion.div>
          <motion.div {...view(reduced, 0.1)} className="mt-6"><Countdown target={date} /></motion.div>
          <motion.div {...view(reduced, 0.15)} className="mt-8"><ChampagneTower reduced={reduced} /></motion.div>
        </section>
      )}

      {/* Le lieu */}
      <section id="pz-lieu" className="scroll-mt-14 relative px-6 pt-14 pb-10 overflow-hidden">
        <Corner className="absolute left-0 top-4 w-24 opacity-90" /><Corner className="absolute right-0 top-4 w-24 opacity-90" flip />
        <motion.div {...view(reduced)}><Num n={num()} title="Le lieu" /></motion.div>
        <motion.div {...view(reduced)} className="mt-6 text-center">
          <p className="text-[10.5px]" style={{ ...caps, color: SKY }}>Date</p>
          <p className="mt-1 italic" style={{ fontFamily: BODONI, fontSize: 30 }}>{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-[14px] opacity-75">{date.toLocaleDateString('fr-FR', { weekday: 'long' })}{time && ` · ${time}`}</p>
        </motion.div>
        {(venue || address) && (
          <motion.div {...view(reduced)} className="mt-8">
            <Venue label={c.ceremony || 'Cérémonie'} name={venue} time={time} address={address} preview={preview} />
          </motion.div>
        )}
        {c.reception?.name && (
          <motion.div {...view(reduced)} className="mt-8">
            <Venue label="Réception" name={c.reception.name} time={c.reception.time} address={c.reception.address} preview={preview} />
          </motion.div>
        )}
        {c.travel && (
          <motion.div {...view(reduced)} className="mt-8 text-left">
            <p className="text-[10.5px]" style={{ ...caps, color: SKY }}>Comment venir</p>
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line opacity-85">{c.travel}</p>
          </motion.div>
        )}
        <motion.div {...view(reduced)} className="mt-6 flex justify-center">
          <a href={calendarHref(token, API_BASE)} aria-label="Ajouter l'événement à mon agenda" className="inline-flex items-center gap-1.5 text-[11px] px-5 py-2.5"
            style={{ ...caps, boxShadow: `0 0 0 1px ${BLUE}`, color: NAVY }}>
            <Icon name="event" size={15} /> Ajouter à l’agenda
          </a>
        </motion.div>
        {isAndroid() && (
          <p className="mt-2 text-center text-[13px] opacity-75">
            <a href={googleCalendarUrl(occasion, { inviteUrl: window.location.href, table: tableLabel })} target="_blank" rel="noreferrer" className="underline underline-offset-4">Ou ajouter à Google Agenda</a>
          </p>
        )}
      </section>

      {/* Le jour J */}
      {c.program?.length > 0 && (
        <section id="pz-jour" className="scroll-mt-14 px-6 pt-12 pb-10">
          <motion.div {...view(reduced)} className="flex flex-col items-center">
            <svg viewBox="0 0 40 40" className="w-9 mb-1" aria-hidden><ToileDefs /><Peony x={20} y={22} s={.55} /></svg>
            <Num n={num()} title="Le jour J" />
          </motion.div>
          <ol className="mt-8 space-y-6 max-w-[340px] mx-auto">
            {c.program.map((p, i) => (
              <motion.li key={i} className="grid grid-cols-[64px_1fr] gap-3 text-left"
                initial={reduced ? false : { opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.6, delay: 0.05 * i }}>
                <span className="text-[11px] pt-2 tabular-nums" style={{ ...caps, letterSpacing: '0.12em', color: SKY }}>{p.time}</span>
                <span className="relative pl-4" style={{ borderLeft: `1px solid ${PALE}` }}>
                  <span aria-hidden className="absolute -left-[3.5px] top-[14px] h-1.5 w-1.5 rounded-full" style={{ background: BLUE }} />
                  <span className="block leading-tight" style={{ fontFamily: BODONI, fontSize: 22 }}>{p.label}</span>
                  {p.note && <span className="block text-[14px] opacity-75 mt-0.5">{p.note}</span>}
                </span>
              </motion.li>
            ))}
          </ol>
        </section>
      )}

      {/* Dress code */}
      {(c.dress_title || c.dress_text) && (
        <section id="pz-dress" className="scroll-mt-14 px-6 pt-12 pb-10">
          <motion.div {...view(reduced)}><DancingCouple /></motion.div>
          <motion.div {...view(reduced)} className="mt-2"><Num n={num()} title="Dress code" /></motion.div>
          {c.dress_title && <motion.p {...view(reduced)} className="mt-6 text-left leading-[0.95]" style={{ fontFamily: BODONI, fontSize: 46 }}>{c.dress_title}</motion.p>}
          {c.dress_text && <motion.p {...view(reduced)} className="mt-4 text-left text-[15px] leading-relaxed opacity-85 whitespace-pre-line">{c.dress_text}</motion.p>}
        </section>
      )}

      {/* Liste de cadeaux */}
      {hasGift && (
        <section id="pz-cadeaux" className="scroll-mt-14 relative px-6 pt-12 pb-10 overflow-hidden">
          <Corner className="absolute left-0 top-2 w-20 opacity-90" /><Corner className="absolute right-0 top-2 w-20 opacity-90" flip />
          <motion.div {...view(reduced)}><Num n={num()} title="Liste de cadeaux" /></motion.div>
          <motion.div {...view(reduced)}><Gift c={c} /></motion.div>
        </section>
      )}

      {/* Réponse */}
      <section id="pz-rsvp" ref={rsvpRef} className="scroll-mt-14 px-6 pt-12 pb-10 text-center">
        <motion.div {...view(reduced)}><Num n={num()} title="RSVP" /></motion.div>
        <motion.div {...view(reduced)} className="mt-6">
          <p className="text-[10.5px]" style={{ ...caps, color: SKY }}>Faites-le-nous savoir</p>
          <p className="inv-script text-[40px] leading-tight mt-1" style={{ color: BLUE }}>{guest.name}</p>
          <p className="text-[15px] opacity-80 mt-1 max-w-[320px] mx-auto">{c.intro || 'Votre présence compte énormément pour nous. Merci de nous répondre.'}</p>
          {occasion.is_expired
            ? <p className="mt-6 italic text-lg opacity-80">Cet événement est passé. Merci d’en avoir fait partie.</p>
            : <Rsvp guest={guest} confirmed={confirmed} declined={declined} busy={busy} err={err} respond={respond} hosts={occasion.type === 'mariage' ? 'les mariés' : 'les hôtes'} />}
        </motion.div>
        {!occasion.is_expired && (
          <motion.div {...view(reduced)} className="mt-12" data-testid="invitation-access">
            <p className="text-[10.5px]" style={{ ...caps, color: SKY }}>Votre pass d’accès</p>
            {guest.qr && <div className="mx-auto mt-3 w-44 bg-white p-3" style={{ boxShadow: `0 0 0 1px ${BLUE}, 0 0 0 5px #fff, 0 0 0 6px ${PALE}` }}><img src={guest.qr} alt="Votre QR d'accès" className="w-full aspect-square" /></div>}
            <p className="mt-3 text-[15px]">{guest.name}{tableLabel && ` · ${tableLabel}`}</p>
          </motion.div>
        )}
      </section>

      {occasion.video_url && (
        <section className="px-6 pb-10 text-center">
          <motion.video {...view(reduced)} src={occasion.video_url} className="mx-auto w-full max-w-[280px] aspect-[9/16] object-cover bg-black" autoPlay muted loop playsInline controls />
        </section>
      )}

      {/* Questions fréquentes */}
      {c.faq?.length > 0 && (
        <section id="pz-faq" className="scroll-mt-14 px-6 pt-10 pb-10">
          <motion.p {...view(reduced)} className="text-center leading-tight" style={{ fontFamily: BODONI, fontSize: 30 }}>Questions fréquentes</motion.p>
          <motion.div {...view(reduced)} className="mt-6"><Faq items={c.faq} /></motion.div>
        </section>
      )}

      {/* Pied de page */}
      <footer className="px-6 pt-14 pb-24 text-center">
        <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-[17px]" style={{ boxShadow: `0 0 0 1px ${BLUE}`, fontFamily: BODONI }}>{mono}</div>
        <p className="inv-script text-[30px] mt-5" style={{ color: BLUE }}>{c.closing || 'Avec amour'}</p>
        <p className="leading-[0.95] mt-1" style={{ fontFamily: BODONI, fontSize: 40 }}>{couple ? <>{couple[0]} &amp;<br />{couple[1]}</> : title}</p>
        <p className="mt-4 text-[11px]" style={{ ...caps, color: SKY }}>{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        {!preview && !reduced && (
          <button type="button" onClick={() => { setStage('sealed'); window.scrollTo({ top: 0 }) }} className="mt-6 text-[10px] inline-flex items-center gap-1 opacity-70" style={caps}>
            <Icon name="replay" size={14} /> Revoir l’ouverture
          </button>
        )}
        <p className="mt-3 text-[11px] opacity-60 inv-jost">Propulsé par Signiq</p>
      </footer>

      {/* Barre d'onglets */}
      <nav className={`${preview ? 'relative' : 'sticky bottom-0'} z-20 grid border-t backdrop-blur`} aria-label="Navigation"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, background: `${PAPER}ee`, borderColor: PALE, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => go(id)} className="py-3 text-[10px] relative" style={{ ...caps, color: active === id ? NAVY : SKY }}>
            {label}
            {active === id && <motion.span layoutId="pz-tab" className="absolute left-1/2 -translate-x-1/2 bottom-1.5 h-px w-8" style={{ background: NAVY }} />}
          </button>
        ))}
      </nav>
    </div>
  )
}
