import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Icon from '../ui/Icon'
import { API_BASE } from '../../lib/axios'
import { calendarHref, eventNames, googleCalendarUrl, isAndroid, mapsUrl, sealOf, startOf } from '../../lib/invitationTheme'

/**
 * Modèle « Heure dorée » de l'invitation en ligne : une enveloppe ivoire
 * gaufrée scellée de cire dorée ; à l'ouverture, la photo du couple en plein
 * écran, puis le compte à rebours entre deux colonnes, la galerie, l'histoire
 * du couple derrière des rideaux dorés, le déroulé de la journée, les détails
 * de l'événement dans un cadre baroque sous un lustre, et la réponse.
 * Décors dessinés en SVG (colonnes, rideaux, lustre, cadre).
 */

const IVORY = '#f8f4ec'
const BROWN = '#5b4636'
const G = ['#8a6420', '#d9b45a', '#f6e2a1', '#c99a3e', '#9a7228']
const seenKey = (token) => `inv-open:${token}`
const readSeen = (token) => { try { return localStorage.getItem(seenKey(token)) === '1' } catch { return false } }
const writeSeen = (token) => { try { localStorage.setItem(seenKey(token), '1') } catch { /* stockage indisponible */ } }

const pad = (n) => String(n).padStart(2, '0')
const caps = { fontVariantCaps: 'all-small-caps', letterSpacing: '0.22em' }
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

/** Papier ivoire gaufré : motif discret répété. */
const EMBOSS = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#e4dccb" stroke-width="1.1">'
  + '<path d="M16 10c3 4 3 8 0 12c-3-4-3-8 0-12zM12 16c4-3 8-3 12 0c-4 3-8 3-12 0z"/>'
  + '<path d="M48 42c2.5 3 2.5 6 0 9c-2.5-3-2.5-6 0-9zM44 46.5c3-2.5 6-2.5 9 0c-3 2.5-6 2.5-9 0z"/>'
  + '<circle cx="48" cy="14" r="1.6"/><circle cx="14" cy="48" r="1.6"/></svg>',
)}")`

/** Sceau de cire doré au monogramme. */
function WaxSeal({ letters, size = 104 }) {
  return (
    <div className="relative rounded-full flex items-center justify-center" style={{
      width: size, height: size,
      background: `radial-gradient(circle at 35% 30%, ${G[2]}, ${G[1]} 38%, ${G[3]} 62%, ${G[0]} 100%)`,
      boxShadow: '0 8px 18px rgba(80,55,15,.35), inset 0 2px 3px rgba(255,245,210,.6), inset 0 -4px 8px rgba(110,70,10,.45)',
      borderRadius: '50% 47% 52% 49% / 48% 52% 47% 51%',
    }}>
      <span className="absolute inset-[12%] rounded-full" style={{ border: '1.5px solid rgba(110,75,15,.35)', boxShadow: 'inset 0 1px 2px rgba(255,240,200,.5)' }} />
      <span className="inv-script leading-none" style={{ fontSize: size * 0.36, color: '#6b4a12', textShadow: '0 1px 0 rgba(255,240,200,.7)' }}>
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
      style={{ backgroundColor: IVORY, backgroundImage: EMBOSS, perspective: 1400 }}
      exit={reduced ? { opacity: 0 } : { y: '-100%', transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } }}>
      {/* Rabat en V */}
      <motion.div aria-hidden className="absolute inset-x-0 top-0 h-[52%] origin-top"
        style={{ transformStyle: 'preserve-3d', zIndex: 2 }}
        animate={{ rotateX: opening ? 165 : 0 }} transition={{ duration: 0.9, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}>
        <div className="absolute inset-0" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 8%, 50% 100%, 0 8%)',
          backgroundColor: '#f3ede1', backgroundImage: EMBOSS,
          filter: 'drop-shadow(0 6px 6px rgba(120,95,50,.18))', backfaceVisibility: 'hidden',
        }} />
      </motion.div>

      {/* Sceau */}
      <motion.button type="button" onClick={onOpen} disabled={opening} aria-label="Ouvrir l'invitation"
        className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 z-10 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
        animate={opening ? { scale: [1, 1.15, 0], opacity: [1, 1, 0] } : { scale: [1, 1.04, 1] }}
        transition={opening ? { duration: 0.45 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
        <WaxSeal letters={sealOf(occasion)} />
      </motion.button>

      <motion.div className="absolute inset-x-0 bottom-[9%] text-center px-6" style={{ color: '#8f8371' }}
        animate={{ opacity: opening ? 0 : 1 }}>
        <p className="inv-serif text-[13px]" style={caps}>Carnet mondain</p>
        <p className="inv-serif text-[13px] mt-0.5" style={caps}>Un événement à ne pas manquer</p>
        <p className="inv-script text-[24px] mt-1">
          L’union de {couple ? `${couple[0]} & ${couple[1]}` : title}
        </p>
        <p className="mt-6 inv-jost text-[11px] tracking-[0.3em] uppercase flex items-center justify-center gap-1.5 opacity-80">
          <Icon name="touch_app" size={15} /> Touchez le sceau
        </p>
      </motion.div>
    </motion.section>
  )
}

/** Colonne corinthienne dorée, guirlande de fleurs blanches. */
function Column({ flip }) {
  const id = `col-gold${flip ? 'r' : 'l'}`
  return (
    <svg viewBox="0 0 60 260" className="w-[52px] sm:w-[64px] h-auto shrink-0" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
      <GoldDefs id={id} />
      <path d="M6 30 Q6 18 16 20 Q14 26 20 28 L40 28 Q46 26 44 20 Q54 18 54 30 Z" fill={`url(#${id})`} />
      <circle cx="12" cy="27" r="5" fill="none" stroke={G[0]} strokeWidth="1.5" /><circle cx="48" cy="27" r="5" fill="none" stroke={G[0]} strokeWidth="1.5" />
      <rect x="4" y="14" width="52" height="6" rx="1" fill={`url(#${id})`} />
      <path d="M16 32 Q30 44 44 32 L42 40 L18 40 Z" fill={`url(#${id})`} />
      <rect x="15" y="40" width="30" height="190" fill={`url(#${id})`} />
      {[20, 25, 30, 35, 40].map(x => <line key={x} x1={x} y1="44" x2={x} y2="226" stroke={G[0]} strokeOpacity=".45" strokeWidth="1.2" />)}
      <rect x="11" y="228" width="38" height="8" rx="1" fill={`url(#${id})`} />
      <rect x="6" y="236" width="48" height="10" rx="1" fill={`url(#${id})`} />
      <rect x="3" y="246" width="54" height="10" rx="1" fill={`url(#${id})`} />
      {/* Guirlande */}
      {[[14, 46], [22, 56], [32, 66], [24, 84], [36, 98], [26, 116], [40, 132], [30, 150]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x - 6} cy={y + 4} rx="5" ry="2.2" fill="#7f9b72" transform={`rotate(-30 ${x - 6} ${y + 4})`} />
          <circle cx={x} cy={y} r={i % 3 ? 5 : 6.5} fill="#fffdf8" stroke="#e6dccb" strokeWidth=".8" />
          <circle cx={x} cy={y} r="1.6" fill="#e9d9a8" />
        </g>
      ))}
    </svg>
  )
}

/** Compte à rebours jours / heures / minutes. */
function Countdown({ target, color }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  const s = Math.max(0, Math.floor((target.getTime() - now) / 1000))
  if (!s) return <p className="inv-script text-[30px]" style={{ color }}>C’est aujourd’hui !</p>
  const parts = [[Math.floor(s / 86400), 'jours'], [Math.floor(s / 3600) % 24, 'heures'], [Math.floor(s / 60) % 60, 'minutes']]
  return (
    <div className="flex justify-center gap-5" role="timer" aria-label="Compte à rebours avant l'événement">
      {parts.map(([v, l]) => (
        <div key={l} className="text-center">
          <p className="inv-serif text-[30px] leading-none tabular-nums" style={{ color }}>{v}</p>
          <p className="inv-serif text-[11px] mt-1 opacity-70" style={caps}>{l}</p>
        </div>
      ))}
    </div>
  )
}

/** Lambrequin doré : drapé en festons et franges à pampilles. */
function Valance() {
  return (
    <svg viewBox="0 0 400 110" className="block w-full h-auto" preserveAspectRatio="none" aria-hidden>
      <GoldDefs id="val-gold" vertical />
      <rect x="0" y="0" width="400" height="10" fill="url(#val-gold)" />
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <path d={`M${i * 100} 8 Q${i * 100 + 50} 70 ${i * 100 + 100} 8 Z`} fill="url(#val-gold)" />
          <path d={`M${i * 100 + 8} 14 Q${i * 100 + 50} 56 ${i * 100 + 92} 14`} stroke={G[0]} strokeOpacity=".35" fill="none" />
          <path d={`M${i * 100 + 16} 20 Q${i * 100 + 50} 48 ${i * 100 + 84} 20`} stroke={G[2]} strokeOpacity=".6" fill="none" />
        </g>
      ))}
      {Array.from({ length: 33 }, (_, i) => {
        const x = 6 + i * 12, sw = Math.sin(((x % 100) / 100) * Math.PI)
        const y1 = 8 + sw * 58, len = 18 + (i % 3) * 10
        return (
          <g key={i}>
            <line x1={x} y1={y1} x2={x} y2={y1 + len} stroke={G[3]} strokeWidth="1" />
            <circle cx={x} cy={y1 + len + 2.5} r="2.5" fill={G[1]} />
          </g>
        )
      })}
    </svg>
  )
}

/** Rideau latéral doré (plis), à gauche ou à droite. */
function Drape({ side }) {
  const id = `drape-${side}`
  return (
    <svg viewBox="0 0 70 400" preserveAspectRatio="none" aria-hidden
      className={`absolute top-0 bottom-0 h-full w-[42px] sm:w-[58px] ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}>
      <GoldDefs id={id} />
      <path d="M0 0 H70 Q40 120 46 200 Q52 300 30 400 H0 Z" fill={`url(#${id})`} />
      {[12, 24, 36].map(x => <path key={x} d={`M${x} 0 Q${x + 10} 150 ${x - 2} 400`} stroke={G[0]} strokeOpacity=".3" fill="none" />)}
      <path d="M40 4 Q30 160 36 400" stroke={G[2]} strokeOpacity=".7" strokeWidth="2" fill="none" />
    </svg>
  )
}

/** Cadre baroque doré surmonté d'un lustre. */
function BaroqueFrame({ children }) {
  return (
    <div className="relative mx-auto max-w-[380px] pt-[86px]">
      <svg viewBox="0 0 300 120" className="absolute left-1/2 top-0 -translate-x-1/2 w-[86%]" aria-hidden>
        <GoldDefs id="frame-gold" />
        {/* crête en volutes */}
        <path d="M20 118 Q20 70 70 62 Q110 56 128 34 Q140 18 150 18 Q160 18 172 34 Q190 56 230 62 Q280 70 280 118"
          fill="none" stroke="url(#frame-gold)" strokeWidth="4" />
        <path d="M30 118 Q32 78 74 72 Q114 66 134 44 Q144 32 150 32 Q156 32 166 44 Q186 66 226 72 Q268 78 270 118"
          fill="none" stroke="url(#frame-gold)" strokeWidth="1.6" />
        <path d="M118 40 q-14 -16 -2 -26 q8 -6 14 4 M182 40 q14 -16 2 -26 q-8 -6 -14 4" fill="none" stroke="url(#frame-gold)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="150" cy="14" r="5" fill="url(#frame-gold)" />
        {/* lustre */}
        <line x1="150" y1="19" x2="150" y2="58" stroke={G[3]} strokeWidth="1.6" />
        <path d="M118 74 Q134 92 150 92 Q166 92 182 74" fill="none" stroke="url(#frame-gold)" strokeWidth="3" />
        <path d="M128 70 Q140 84 150 84 Q160 84 172 70" fill="none" stroke="url(#frame-gold)" strokeWidth="2" />
        <ellipse cx="150" cy="62" rx="9" ry="6" fill="url(#frame-gold)" />
        <path d="M144 92 L150 108 L156 92 Z" fill="url(#frame-gold)" />
        {[118, 128, 150, 172, 182].map((x, i) => (
          <g key={i}>
            <rect x={x - 2.2} y={i === 2 ? 64 : 58} width="4.4" height="12" rx="1" fill="#fbf4e2" stroke={G[3]} strokeWidth=".6" />
            <path d={`M${x} ${i === 2 ? 58 : 52} q3 4 0 6 q-3 -2 0 -6`} fill="#f7c45c" />
          </g>
        ))}
        {[132, 140, 160, 168].map(x => <circle key={x} cx={x} cy="98" r="1.8" fill={G[2]} />)}
      </svg>
      <div className="relative rounded-b-[6px] px-7 pb-9 pt-10"
        style={{ border: `3px solid ${G[3]}`, borderTop: 'none', boxShadow: `inset 0 0 0 6px ${IVORY}, inset 0 0 0 7.5px ${G[1]}, 0 18px 40px -24px rgba(90,60,20,.4)` }}>
        {children}
      </div>
    </div>
  )
}

const Ornament = () => (
  <svg viewBox="0 0 120 20" className="w-28 mx-auto my-3" aria-hidden>
    <GoldDefs id="orn-gold" />
    <path d="M4 10 H44 M76 10 H116" stroke="url(#orn-gold)" strokeWidth="1.2" />
    <path d="M60 2 Q66 10 60 18 Q54 10 60 2 Z" fill="url(#orn-gold)" />
    <path d="M48 10 q6 -7 10 0 q-4 7 -10 0 M72 10 q-6 -7 -10 0 q4 7 10 0" fill="none" stroke="url(#orn-gold)" strokeWidth="1.2" />
  </svg>
)

const Heading = ({ children, kicker, color }) => (
  <div className="text-center">
    {kicker && <p className="inv-serif text-[13px] opacity-75" style={caps}>{kicker}</p>}
    <h2 className="inv-script text-[44px] leading-tight" style={{ color }}>{children}</h2>
  </div>
)

export default function HeureDoree({ occasion, guest, token, tableLabel, confirmed, declined, busy, err, respond, rsvpRef, t, reduced, preview = false }) {
  const [stage, setStage] = useState(() => (preview || readSeen(token) ? 'open' : 'sealed'))
  const c = occasion.content || {}
  const ink = occasion.theme?.palette && occasion.theme.palette !== 'auto' ? t.ink : BROWN
  const accent = occasion.theme?.palette && occasion.theme.palette !== 'auto' ? t.main : '#8a6a3a'
  const photos = occasion.photos || []
  const hero = occasion.cover_url || photos[0]
  const gallery = photos.filter(p => p !== hero).slice(0, 3)
  const { title, couple } = eventNames(occasion.name)
  const date = startOf(occasion)
  const dateLong = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = occasion.starts_at ? `${pad(date.getHours())}h${pad(date.getMinutes())}` : null
  const [venue, ...rest] = (occasion.location || '').split(',')

  const open = () => {
    if (stage !== 'sealed') return
    if (reduced) { setStage('open'); writeSeen(token); return }
    setStage('opening')
    setTimeout(() => { setStage('open'); writeSeen(token) }, 1500)
  }
  const toRsvp = () => rsvpRef?.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })

  return (
    <div className="relative text-center" data-testid="heure-doree" style={{ backgroundColor: IVORY, color: ink }}>
      <AnimatePresence>
        {stage !== 'open' && !preview && <Intro occasion={occasion} opening={stage === 'opening'} onOpen={open} reduced={reduced} />}
      </AnimatePresence>

      {/* Ouverture : photo plein écran */}
      <header className="relative overflow-hidden" style={{ minHeight: preview ? 620 : '92svh' }}>
        {hero ? (
          <motion.img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover"
            initial={reduced ? false : { scale: 1.12 }} animate={stage === 'open' ? { scale: 1 } : {}}
            transition={{ duration: 6, ease: 'easeOut' }} />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 50% 35%, ${G[2]}, ${G[1]} 55%, ${G[3]})` }} />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${IVORY}f2 0%, ${IVORY}cc 22%, ${IVORY}00 46%, ${IVORY}00 72%, ${IVORY}e6 100%)` }} />
        <motion.div className="relative pt-14 px-6"
          initial={reduced ? false : { opacity: 0, y: -14 }} animate={stage === 'open' ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.1, delay: 0.3 }}>
          <p className="inv-serif text-[13px]" style={caps}>{occasion.type === 'mariage' ? 'Nous nous marions' : 'Vous êtes invité(e)'}</p>
          <h1 className="inv-script text-[52px] leading-[1.05] mt-1">{couple ? <>{couple[0]} <span className="text-[38px]">&amp;</span> {couple[1]}</> : title}</h1>
          <p className="my-1 text-[13px]" style={{ color: G[3] }}>✦</p>
          <p className="inv-serif text-[14px]" style={caps}>{dateLong}</p>
        </motion.div>
        {!occasion.is_expired && (
          <button type="button" onClick={toRsvp}
            className="absolute left-1/2 -translate-x-1/2 bottom-8 inv-serif text-[14px] px-6 py-2.5 rounded-full backdrop-blur-sm whitespace-nowrap"
            style={{ ...caps, background: `${IVORY}cc`, border: `1px solid ${G[3]}`, color: ink }}>
            Confirmer ma présence
          </button>
        )}
      </header>

      <div className="px-5">
        {/* Phrase + compte à rebours entre deux colonnes */}
        <motion.p {...view(reduced)} className="inv-script text-[30px] leading-snug mt-12 px-4 whitespace-pre-line">
          {c.verse || 'Là où l’amour commence,\nl’éternité se dessine doucement.'}
        </motion.p>
        {c.verse_ref && <p className="inv-serif italic text-[13px] opacity-70">{c.verse_ref}</p>}
        {!occasion.is_expired && (
          <motion.section {...view(reduced)} className="mt-8 flex items-end justify-center gap-2 max-w-[420px] mx-auto">
            <Column />
            <div className="flex-1 min-w-0 pb-6">
              <Heading color={ink}>Compte à rebours</Heading>
              <p className="inv-serif italic text-[14px] opacity-80 -mt-1 mb-5">Jusqu’au plus beau jour de notre vie</p>
              <Countdown target={date} color={ink} />
            </div>
            <Column flip />
          </motion.section>
        )}

        {/* Galerie */}
        {gallery.length > 0 && (
          <motion.section {...view(reduced)} className="mt-14">
            <Heading color={ink}>Un aperçu de nous</Heading>
            <div className="mt-5 flex items-center justify-center gap-2">
              {gallery.map((src, i) => {
                const big = gallery.length === 3 ? i === 1 : true
                return <img key={src} src={src} alt="" className={`object-cover shadow-md ${big ? 'w-[46%] aspect-[3/4]' : 'w-[24%] aspect-[3/5]'}`} />
              })}
            </div>
          </motion.section>
        )}
      </div>

      {/* Notre histoire, derrière des rideaux dorés */}
      {c.story?.length > 0 && (
        <section className="relative mt-14 pb-12 overflow-hidden" data-testid="heure-doree-story">
          <Valance />
          <Drape side="left" /><Drape side="right" />
          <div className="relative px-14 sm:px-20">
            <motion.div {...view(reduced)} className="-mt-2"><Heading color={ink}>Notre histoire</Heading></motion.div>
            <ol className="mt-6 space-y-9">
              {c.story.map((s, i) => (
                <motion.li key={i} {...view(reduced, 0.05)}>
                  {s.year && <p className="inv-serif text-[13px] opacity-70" style={caps}>{s.year}</p>}
                  <p className="inv-script text-[32px] leading-tight">{s.title}</p>
                  {s.text && <p className="inv-serif text-[15px] leading-relaxed mt-1 opacity-90">{s.text}</p>}
                </motion.li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <div className="px-5 pb-6">
        {/* Déroulé de la journée */}
        {c.program?.length > 0 && (
          <motion.section {...view(reduced)} className="mt-12">
            <Heading color={ink}>Le déroulé</Heading>
            <p className="inv-serif text-[12.5px] -mt-1 opacity-70" style={caps}>Notre grand jour</p>
            <ol className="mt-7 mx-auto max-w-[320px] text-left relative pl-7">
              <span aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: `${G[3]}88` }} />
              {c.program.map((p, i) => (
                <motion.li key={i} className="relative pb-6 last:pb-0"
                  initial={reduced ? false : { opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.6, delay: 0.04 * i }}>
                  <span aria-hidden className="absolute -left-[25px] top-[22px] h-2.5 w-2.5 rounded-full" style={{ background: G[3], boxShadow: `0 0 0 3px ${IVORY}` }} />
                  <p className="inv-serif text-[12px] opacity-70" style={caps}>{p.time}</p>
                  <p className="inv-script text-[28px] leading-tight">{p.label}</p>
                  {p.note && <p className="inv-serif text-[14px] opacity-80">{p.note}</p>}
                </motion.li>
              ))}
            </ol>
          </motion.section>
        )}

        {/* Détails de l'événement */}
        <motion.section {...view(reduced)} className="mt-14">
          <BaroqueFrame>
            <p className="inv-serif text-[12.5px] opacity-75" style={caps}>Rejoignez-nous pour célébrer</p>
            <h2 className="inv-script text-[42px] leading-tight">Les détails</h2>
            <p className="inv-serif text-[16px] mt-2">{dateLong}</p>
            {time && (
              <p className="inv-serif text-[14px] mt-1 flex items-center justify-center gap-1.5 opacity-90">
                <Icon name="schedule" size={16} /> {c.ceremony ? `${c.ceremony} à ${time}` : `À partir de ${time}`}
              </p>
            )}
            {occasion.location && (
              <>
                <p className="inv-script text-[30px] leading-tight mt-4">{venue.trim()}</p>
                {rest.length > 0 && <p className="inv-serif text-[14px] opacity-80">{rest.join(',').trim()}</p>}
              </>
            )}
            <div className="mt-5 flex flex-col items-center gap-2.5">
              {occasion.location && (
                <a href={mapsUrl(occasion.location)} target="_blank" rel="noreferrer"
                  className="inv-serif text-[13px] px-5 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap"
                  style={{ border: `1px solid ${G[3]}` }}>
                  <Icon name="location_on" size={16} /> <span style={caps}>Ouvrir dans Google Maps</span>
                </a>
              )}
              <a href={calendarHref(token, API_BASE)} aria-label="Ajouter l'événement à mon agenda"
                className="inv-serif text-[13px] px-5 py-2 rounded-full flex items-center gap-1.5 whitespace-nowrap"
                style={{ border: `1px solid ${G[3]}` }}>
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
              <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${G[3]}55` }}>
                <p className="inv-serif text-[12.5px] opacity-75" style={caps}>Tenue</p>
                {c.dress_title && <p className="inv-script text-[30px] leading-tight">{c.dress_title}</p>}
                {c.dress_text && <p className="inv-serif text-[14px] opacity-85 whitespace-pre-line">{c.dress_text}</p>}
              </div>
            )}
          </BaroqueFrame>
        </motion.section>

        {/* Réponse */}
        <motion.section {...view(reduced)} ref={rsvpRef} className="mt-14">
          <p className="inv-serif text-[13px] opacity-75" style={caps}>Soyez notre invité</p>
          <h2 className="inv-script text-[52px] leading-none mt-1">RSVP</h2>
          <Ornament />
          <p className="inv-serif text-[15px] leading-relaxed max-w-[320px] mx-auto">
            {c.intro || `${guest.name}, votre présence rendrait cette journée encore plus belle. Merci de nous confirmer votre venue.`}
          </p>
          <div className="mt-6">
            {occasion.is_expired ? (
              <p className="inv-serif italic text-lg opacity-80">Cet événement est passé. Merci d’en avoir fait partie.</p>
            ) : confirmed ? (
              <div>
                <p className="inv-script text-[38px] leading-none">Merci, à très bientôt !</p>
                <p className="inv-serif text-[14px] mt-2" style={caps}>Présence confirmée{tableLabel && ` · ${tableLabel}`}</p>
                <button onClick={() => respond('decline')} disabled={busy} className="mt-3 inv-serif text-[13px] underline underline-offset-4 opacity-70 disabled:opacity-40">
                  Finalement, je ne pourrai pas venir
                </button>
              </div>
            ) : declined ? (
              <div>
                <p className="inv-serif italic text-xl">Vous nous manquerez. Merci pour votre réponse.</p>
                <button onClick={() => respond('confirm')} disabled={busy} className="mt-3 inv-serif text-[14px] underline underline-offset-4 disabled:opacity-40" style={caps}>
                  Je serai finalement présent(e)
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 max-w-[300px] mx-auto">
                <motion.button onClick={() => respond('confirm')} disabled={busy} whileTap={{ scale: 0.97 }}
                  className="w-full rounded-md py-3 inv-serif text-[15px] text-white flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ ...caps, background: accent, boxShadow: `0 10px 24px -12px ${accent}` }}>
                  {busy && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Avec joie, je serai là
                </motion.button>
                <button onClick={() => respond('decline')} disabled={busy}
                  className="w-full rounded-md py-2.5 inv-serif text-[14px] disabled:opacity-40" style={{ ...caps, border: `1px solid ${G[3]}88` }}>
                  Je regrette, je ne pourrai pas venir
                </button>
              </div>
            )}
            {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          </div>
        </motion.section>

        {/* Pass d'accès */}
        {!occasion.is_expired && (
          <motion.section {...view(reduced)} data-testid="invitation-access" className="mt-12">
            <p className="inv-serif text-[13px] opacity-75" style={caps}>Votre pass d’accès</p>
            {guest.qr && (
              <div className="mx-auto mt-3 w-44 p-[2px] rounded-md" style={{ background: t.gold }}>
                <div className="bg-white p-3 rounded-[5px]"><img src={guest.qr} alt="Votre QR d'accès" className="w-full aspect-square" /></div>
              </div>
            )}
            <p className="inv-serif italic text-[14px] mt-3 opacity-80">À présenter à l’accueil le jour J.</p>
            <p className="inv-serif text-[15px] mt-0.5">{guest.name}{tableLabel && ` · ${tableLabel}`}</p>
          </motion.section>
        )}

        {occasion.video_url && (
          <motion.section {...view(reduced)} className="mt-12">
            <Heading color={ink}>Un mot pour vous</Heading>
            <video src={occasion.video_url} className="mt-4 mx-auto w-full max-w-[280px] aspect-[9/16] object-cover rounded-md bg-black" autoPlay muted loop playsInline controls />
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
