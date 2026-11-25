import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
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
 */

const IVORY = '#faf7f1'
const BEIGE = '#f1eadc'
const BROWN = '#5e4b3c'
const G = ['#8a6420', '#d9b45a', '#f6e2a1', '#c99a3e', '#9a7228']
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
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
      <stop offset="0" stopColor={G[0]} /><stop offset=".28" stopColor={G[1]} /><stop offset=".5" stopColor={G[2]} />
      <stop offset=".72" stopColor={G[3]} /><stop offset="1" stopColor={G[4]} />
    </linearGradient>
  </defs>
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

/** Enveloppe d'ouverture (plein écran). */
function Intro({ occasion, opening, onOpen, reduced }) {
  const { couple, title } = eventNames(occasion.name)
  return (
    <motion.section key="intro" className="fixed inset-0 z-30 overflow-hidden" data-testid="heure-doree-intro"
      style={{ backgroundColor: IVORY, backgroundImage: `radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(160,140,100,.12)), ${EMBOSS}`, perspective: 1400 }}
      exit={reduced ? { opacity: 0 } : { y: '-100%', transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } }}>
      {/* Rabat en V, bordé d'un fil plus sombre */}
      <motion.div aria-hidden className="absolute inset-x-0 top-0 h-[50%] origin-top"
        style={{ transformStyle: 'preserve-3d', zIndex: 2 }}
        animate={{ rotateX: opening ? 165 : 0 }} transition={{ duration: 0.9, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}>
        <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 6%, 50% 100%, 0 6%)', background: '#e6dcc8', backfaceVisibility: 'hidden' }} />
        <div className="absolute inset-0" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 5.2%, 50% 98.6%, 0 5.2%)',
          backgroundColor: '#f6f1e6', backgroundImage: EMBOSS,
          filter: 'drop-shadow(0 8px 8px rgba(120,95,50,.16))', backfaceVisibility: 'hidden',
        }} />
      </motion.div>

      {/* Sceau */}
      <motion.button type="button" onClick={onOpen} disabled={opening} aria-label="Ouvrir l'invitation"
        className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 z-10 outline-none focus-visible:ring-4 focus-visible:ring-amber-200 rounded-full"
        animate={opening ? { scale: [1, 1.15, 0], opacity: [1, 1, 0] } : { scale: [1, 1.04, 1] }}
        transition={opening ? { duration: 0.45 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
        <WaxSeal letters={sealOf(occasion)} size={112} />
      </motion.button>

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

/** Fleur blanche (roses de jardin) pour les guirlandes. */
const Bloom = ({ x, y, r = 6 }) => (
  <g>
    {[0, 72, 144, 216, 288].map(a => (
      <ellipse key={a} cx={x} cy={y - r * 0.55} rx={r * 0.55} ry={r * 0.7} fill="#fffdf8" stroke="#e8dfcf" strokeWidth=".6" transform={`rotate(${a} ${x} ${y})`} />
    ))}
    <circle cx={x} cy={y} r={r * 0.42} fill="#f4ead2" stroke="#e3d3ad" strokeWidth=".5" />
  </g>
)
const Leaf = ({ x, y, a }) => <ellipse cx={x} cy={y} rx="6" ry="2.4" fill="#86a07a" transform={`rotate(${a} ${x} ${y})`} />

/** Grande colonne corinthienne dorée, guirlande de roses blanches enroulée. */
function Column({ flip }) {
  const id = `col-gold${flip ? 'r' : 'l'}`
  const vine = [[16, 56], [36, 70], [46, 92], [26, 112], [14, 132], [34, 150], [46, 172], [24, 192], [16, 214]]
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
      {/* guirlande */}
      <path d={`M${vine.map(([x, y]) => `${x} ${y}`).join(' L')}`} stroke="#86a07a" strokeWidth="1.4" fill="none" />
      {vine.map(([x, y], i) => (
        <g key={i}>
          <Leaf x={x - 7} y={y + 5} a={-30} /><Leaf x={x + 7} y={y - 3} a={30} />
          <Bloom x={x} y={y} r={i % 3 === 0 ? 8 : 6} />
        </g>
      ))}
      <Bloom x={10} y={238} r={7} /><Bloom x={22} y={250} r={9} /><Leaf x={34} y={246} a={20} /><Bloom x={42} y={256} r={6} />
    </svg>
  )
}

/** Compte à rebours jours / heures / minutes. */
function Countdown({ target, color }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  const s = Math.max(0, Math.floor((target.getTime() - now) / 1000))
  if (!s) return <p className="inv-script text-[30px]" style={{ color }}>C’est aujourd’hui !</p>
  const parts = [[Math.floor(s / 86400), 'Jours'], [Math.floor(s / 3600) % 24, 'Heures'], [Math.floor(s / 60) % 60, 'Minutes']]
  return (
    <div className="flex justify-center gap-4" role="timer" aria-label="Compte à rebours avant l'événement">
      {parts.map(([v, l]) => (
        <div key={l} className="text-center min-w-[42px]">
          <p className="inv-serif text-[28px] leading-none tabular-nums" style={{ color }}>{v}</p>
          <p className="inv-serif text-[11px] mt-1 opacity-70" style={caps}>{l}</p>
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

/** Bouquet de roses blanches (coin bas des rideaux). */
function Bouquet({ side }) {
  return (
    <svg viewBox="0 0 70 60" aria-hidden className={`absolute bottom-0 w-[58px] ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ transform: side === 'left' ? 'scaleX(-1)' : undefined }}>
      <Leaf x={20} y={40} a={-30} /><Leaf x={44} y={22} a={40} /><Leaf x={56} y={44} a={10} />
      <Bloom x={30} y={30} r={11} /><Bloom x={50} y={36} r={9} /><Bloom x={38} y={48} r={8} /><Bloom x={18} y={48} r={7} />
    </svg>
  )
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
function BaroqueFrame({ children }) {
  return (
    <div className="relative mx-auto max-w-[390px] pt-[92px]">
      <svg viewBox="0 0 300 126" className="absolute left-1/2 top-0 -translate-x-1/2 w-[92%]" aria-hidden>
        <GoldDefs id="frame-gold" />
        <path d="M16 126 Q16 74 68 64 Q110 57 128 34 Q140 17 150 17 Q160 17 172 34 Q190 57 232 64 Q284 74 284 126"
          fill="none" stroke="url(#frame-gold)" strokeWidth="5" />
        <path d="M28 126 Q30 82 72 75 Q114 68 134 45 Q144 32 150 32 Q156 32 166 45 Q186 68 228 75 Q270 82 272 126"
          fill="none" stroke="url(#frame-gold)" strokeWidth="1.8" />
        <path d="M116 42 q-16 -18 -2 -30 q10 -7 16 5 M184 42 q16 -18 2 -30 q-10 -7 -16 5 M70 66 q-10 -14 2 -22 q8 -4 12 4 M230 66 q10 -14 -2 -22 q-8 -4 -12 4"
          fill="none" stroke="url(#frame-gold)" strokeWidth="3" strokeLinecap="round" />
        <path d="M150 4 l6 10 l-6 6 l-6 -6 Z" fill="url(#frame-gold)" />
        {/* lustre */}
        <line x1="150" y1="20" x2="150" y2="60" stroke={G[3]} strokeWidth="1.6" />
        <path d="M112 78 Q132 98 150 98 Q168 98 188 78" fill="none" stroke="url(#frame-gold)" strokeWidth="3" />
        <path d="M124 74 Q138 90 150 90 Q162 90 176 74" fill="none" stroke="url(#frame-gold)" strokeWidth="2" />
        <ellipse cx="150" cy="64" rx="10" ry="6.5" fill="url(#frame-gold)" />
        <path d="M143 98 L150 116 L157 98 Z" fill="url(#frame-gold)" />
        {[112, 124, 150, 176, 188].map((x, i) => (
          <g key={i}>
            <rect x={x - 2.4} y={i === 2 ? 66 : 62} width="4.8" height="13" rx="1" fill="#fbf4e2" stroke={G[3]} strokeWidth=".6" />
            <path d={`M${x} ${i === 2 ? 59 : 55} q3.4 4.5 0 7 q-3.4 -2.5 0 -7`} fill="#f7c45c" />
          </g>
        ))}
        {[128, 136, 164, 172].map(x => <g key={x}><line x1={x} y1="92" x2={x} y2="104" stroke={G[2]} strokeWidth=".8" /><circle cx={x} cy="106" r="2" fill={G[2]} /></g>)}
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
function RsvpForm({ guest, confirmed, declined, busy, err, respond, accent, ink, hosts }) {
  const answered = confirmed || declined
  const [editing, setEditing] = useState(!answered)
  const [choice, setChoice] = useState(confirmed ? 'confirm' : declined ? 'decline' : null)
  const [message, setMessage] = useState(guest.message || '')
  const field = { background: BEIGE, color: ink }

  if (answered && !editing) {
    return (
      <div className="mt-6">
        <p className="inv-script text-[38px] leading-none">{confirmed ? 'Merci, à très bientôt !' : 'Vous nous manquerez.'}</p>
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
    <div className="relative text-center" data-testid="heure-doree" style={{ backgroundColor: IVORY, color: ink }}>
      <AnimatePresence>
        {stage !== 'open' && !preview && <Intro occasion={occasion} opening={stage === 'opening'} onOpen={open} reduced={reduced} />}
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
            initial={reduced ? false : { scale: 1.12 }} animate={stage === 'open' ? { scale: 1 } : {}}
            transition={{ duration: 7, ease: 'easeOut' }} />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 50% 35%, ${G[2]}, ${G[1]} 55%, ${G[3]})` }} />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${IVORY}e6 0%, ${IVORY}99 16%, ${IVORY}00 36%, ${IVORY}00 80%, ${IVORY}cc 94%, ${IVORY} 100%)` }} />
        <motion.div className="relative pt-16 px-6"
          initial={reduced ? false : { opacity: 0, y: -14 }} animate={stage === 'open' ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.1, delay: 0.3 }}>
          <p className="inv-serif text-[13px]" style={caps}>{occasion.type === 'mariage' ? 'Nous nous marions' : 'Vous êtes invité(e)'}</p>
          <h1 className="inv-script text-[54px] leading-[1.05] mt-1">{couple ? <>{couple[0]} <span className="text-[40px]">&amp;</span> {couple[1]}</> : title}</h1>
          <div className="my-2 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-14" style={{ background: ink, opacity: 0.5 }} />
            <span className="h-1.5 w-1.5 rotate-45" style={{ background: ink, opacity: 0.7 }} />
            <span className="h-px w-14" style={{ background: ink, opacity: 0.5 }} />
          </div>
          <p className="inv-serif text-[14px]" style={caps}>{dateLong}</p>
        </motion.div>
        {!occasion.is_expired && (
          <button type="button" onClick={toRsvp}
            className="absolute left-1/2 -translate-x-1/2 bottom-[7%] inv-serif text-[14px] whitespace-nowrap pb-0.5"
            style={{ ...caps, color: ink, borderBottom: `1px solid ${ink}66`, textShadow: `0 0 12px ${IVORY}` }}>
            Confirmer ma présence
          </button>
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
        <motion.section {...view(reduced)} className="mt-8 grid grid-cols-[24%_1fr_24%] items-center">
          <div className="max-w-[110px] justify-self-start"><Column /></div>
          <div className="min-w-0 px-1">
            <Heading color={ink} size={44}>Compte à rebours</Heading>
            <p className="inv-serif italic text-[14px] opacity-80 mb-5">Jusqu’au plus beau jour de notre vie</p>
            <Countdown target={date} color={ink} />
          </div>
          <div className="max-w-[110px] justify-self-end"><Column flip /></div>
        </motion.section>
      )}

      {/* Galerie bord à bord */}
      {gallery.length > 0 && (
        <motion.section {...view(reduced)} className="mt-12">
          <Heading color={ink}>Un aperçu de nous</Heading>
          <div className="mt-4 flex items-center justify-center gap-2 overflow-hidden">
            {gallery.length === 3 ? (
              <>
                <img src={gallery[0]} alt="" className="w-[30%] aspect-[3/4.6] object-cover -ml-[6%] shrink-0" />
                <img src={gallery[1]} alt="" className="w-[46%] aspect-[3/4.2] object-cover shrink-0 shadow-md" />
                <img src={gallery[2]} alt="" className="w-[30%] aspect-[3/4.6] object-cover -mr-[6%] shrink-0" />
              </>
            ) : gallery.map(src => <img key={src} src={src} alt="" className="w-[46%] aspect-[3/4.2] object-cover shadow-md" />)}
          </div>
        </motion.section>
      )}

      {/* Notre histoire, sous des rideaux dorés */}
      {c.story?.length > 0 && (
        <section className="relative mt-12 pb-20 overflow-hidden" data-testid="heure-doree-story">
          <Valance />
          <Drape side="left" /><Drape side="right" />
          <Bouquet side="left" /><Bouquet side="right" />
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
            <div className="mt-6 mx-auto max-w-[360px] rounded-[4px] bg-white/85 px-6 py-7 text-left"
              style={{ boxShadow: '0 14px 34px -22px rgba(90,60,20,.35)', border: `1px solid ${G[1]}33` }}>
              <ol className="relative pl-7">
                <span aria-hidden className="absolute left-[4px] top-3 bottom-3 w-px" style={{ background: `${ink}55` }} />
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
          </motion.section>
        )}

        {/* Détails de l'événement */}
        <motion.section {...view(reduced)} className="mt-14">
          <BaroqueFrame>
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
          <h2 className="inv-script text-[58px] leading-none mt-1">RSVP</h2>
          <Ornament />
          <p className="inv-serif text-[15px] leading-relaxed max-w-[330px] mx-auto">
            {c.intro || `${guest.name}, votre présence rendrait cette journée encore plus belle. Merci de nous confirmer votre venue.`}
          </p>
          {occasion.is_expired
            ? <p className="mt-6 inv-serif italic text-lg opacity-80">Cet événement est passé. Merci d’en avoir fait partie.</p>
            : <RsvpForm guest={guest} confirmed={confirmed} declined={declined} busy={busy} err={err} respond={respond} accent={accent} ink={ink} hosts={occasion.type === 'mariage' ? 'les mariés' : 'les hôtes'} />}
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
