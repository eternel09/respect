import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './heure-doree.css'
import { API_BASE } from '../../lib/axios'
import { calendarHref, eventNames, mapsUrl, sealOf, startOf } from '../../lib/invitationTheme'
import { downloadInvitationCard } from '../../lib/heureDoreeCard'
import HeureDoreeGallery from './HeureDoreeGallery'

/**
 * Modèle « Heure dorée » (design « Ben & Sarah ») : enveloppe au sceau de
 * cire, accueil avec les prénoms dorés et la photo en arche, citation,
 * compte à rebours sur les colonnes fleuries (aquarelle), galerie animée,
 * programme, détails dans le cadre baroque au lustre (aquarelle), réponse
 * (présence, nombre de personnes, mot) et carte d'invitation personnelle
 * avec QR, à enregistrer. Ouvert par le lien personnel de l'invité.
 */

const ART = '/invitations/heure-doree'
const EASE = [0.22, 1, 0.36, 1]
const FONTS = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&family=Playfair+Display:ital,wght@1,400&display=swap'
const GOLD_BG = 'linear-gradient(135deg,#B8924A 0%,#E6CF9A 45%,#C9A55C 55%,#9C7A3C 100%)'
const pad = (n) => String(n).padStart(2, '0')
/** QR du serveur (marine sur blanc) recoloré aux tons du design : brun sur ivoire. */
const warmQr = (src) => {
  const m = /^data:image\/svg\+xml;base64,(.+)$/.exec(src || '')
  if (!m) return src
  try {
    const svg = atob(m[1]).replace(/#1e3a5f/gi, '#2E2620').replace(/#ffffff/gi, '#FBF8F2')
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  } catch { return src }
}
const seenKey = (t) => `inv-open:${t}`
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* indisponible */ } },
}

/** Apparition au défilement : fondu + 24 px. */
function Reveal({ still, delay = 0, y = 24, className, style, children, as = 'div' }) {
  const M = as === 'li' ? motion.li : as === 'p' ? motion.p : motion.div
  return (
    <M className={className} style={style} initial={still ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8, delay, ease: EASE }}>
      {children}
    </M>
  )
}

function Divider({ width = 56, still }) {
  const line = (left) => (
    <motion.span className="block h-px" style={{ width, transformOrigin: left ? 'right' : 'left',
      background: left ? 'linear-gradient(90deg, rgba(184,146,74,0) 0%, #C9A55C 100%)' : 'linear-gradient(90deg, #C9A55C 0%, rgba(184,146,74,0) 100%)' }}
      initial={still ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE }} />
  )
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden>
      {line(true)}
      <motion.span className="block w-[5px] h-[5px] rotate-45" style={{ background: GOLD_BG }}
        initial={still ? false : { scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }} />
      {line(false)}
    </div>
  )
}

function Seal({ letters, size = 104 }) {
  return (
    <div className="flex items-center justify-center" style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 28%,#E6CF9A 0%,#C9A55C 42%,#9C7A3C 100%)',
      boxShadow: 'inset 0 0 0 7px rgba(156,122,60,0.28),inset 0 0 0 8px rgba(230,207,154,0.5)',
    }}>
      <span className="hd-script leading-none" style={{ fontSize: size * 0.31, color: 'rgba(91,81,70,0.72)', textShadow: '0 1px 0 rgba(230,207,154,0.9)' }}>
        {letters.length === 2 ? `${letters[0]} & ${letters[1]}` : letters[0]}
      </span>
    </div>
  )
}

const HALVES = ['polygon(0 0, 54% 0, 45% 24%, 57% 46%, 44% 70%, 53% 100%, 0 100%)', 'polygon(54% 0, 100% 0, 100% 100%, 53% 100%, 44% 70%, 57% 46%, 45% 24%)']

/** 01 · Ouverture : l'enveloppe ; au toucher, le sceau se brise, le rabat s'ouvre, l'enveloppe s'efface. */
function Envelope({ letters, guestName, reduced, onOpen, onDone }) {
  const [opening, setOpening] = useState(false)
  useEffect(() => {
    if (!opening) return
    const id = setTimeout(onDone, reduced ? 0 : 1250)
    return () => clearTimeout(id)
  }, [opening, reduced, onDone])
  const open = () => { if (opening) return; onOpen?.(); setOpening(true) }
  return (
    <motion.section className="fixed inset-0 z-[70] overflow-hidden" style={{ background: '#F8F4EC', perspective: 1200 }}
      data-testid="heure-doree-intro" exit={reduced ? { opacity: 0 } : { opacity: 0, y: -40, transition: { duration: 0.7, ease: EASE } }}>
      <div className="relative h-full mx-auto max-w-[430px]">
        <div className="absolute inset-x-0 bottom-0" style={{ height: '52.6%', background: '#EFE6D2', opacity: 0.45, clipPath: 'polygon(0 100%,50% 0,100% 100%)' }} />
        <motion.div className="absolute inset-x-0 top-0" style={{ height: '47.4%', transformOrigin: 'top', transformStyle: 'preserve-3d' }}
          animate={opening && !reduced ? { rotateX: 178 } : { rotateX: 0 }} transition={{ duration: 0.9, delay: 0.35, ease: [0.65, 0, 0.35, 1] }}>
          <div className="absolute inset-0" style={{ filter: 'drop-shadow(0 8px 12px rgba(91,81,70,0.14))', backfaceVisibility: 'hidden' }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#F8F4EC 0%,#EFE6D2 100%)', clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />
          </div>
          <div className="absolute inset-0" style={{ background: '#E9DEC6', clipPath: 'polygon(0 0,100% 0,50% 100%)', transform: 'rotateX(180deg)', backfaceVisibility: 'hidden' }} />
        </motion.div>
        <button type="button" onClick={open} disabled={opening} aria-label="Ouvrir l'invitation" data-testid="heure-doree-seal"
          className="absolute left-1/2 -ml-[52px] rounded-full" style={{ top: 'calc(47.4% - 60px)', width: 104, height: 104 }}>
          <motion.span aria-hidden className="absolute inset-[3px] rounded-full" style={{ boxShadow: '0 8px 18px rgba(91,81,70,0.22)' }} animate={{ opacity: opening ? 0 : 1 }} />
          {HALVES.map((clip, k) => (
            <motion.span key={k} className="absolute inset-0 block" style={{ clipPath: clip }}
              animate={opening && !reduced ? { x: k ? 50 : -50, y: 150, rotate: k ? 28 : -28, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.75, ease: [0.45, 0, 0.7, 1] }}>
              <motion.span className="block" animate={opening || reduced ? {} : { scale: [1, 1.04, 1] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
                <Seal letters={letters} />
              </motion.span>
            </motion.span>
          ))}
        </button>
        <motion.div className="absolute inset-x-8 text-center" style={{ top: 'calc(47.4% + 100px)' }} animate={{ opacity: opening ? 0 : 1 }}>
          <p className="hd-script hd-gold inline-block m-0 px-2 py-2" style={{ fontSize: 36, lineHeight: 1.15 }}>Pour {guestName}</p>
        </motion.div>
        <motion.p className="hd-caps absolute inset-x-0 m-0 text-center" style={{ bottom: 56 }} animate={{ opacity: opening ? 0 : [0.55, 1, 0.55] }}
          transition={opening ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity }}>
          Touchez le sceau
        </motion.p>
        <div className="hd-grain" />
      </div>
    </motion.section>
  )
}

/** Chiffre du compte à rebours : l'ancien glisse vers le bas, le nouveau arrive d'en haut. */
function Digit({ value, still }) {
  return (
    <span className="relative block overflow-hidden" style={{ height: 54 }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={value} className="block hd-gold" style={{ fontSize: 48, lineHeight: '54px' }}
          initial={still ? false : { y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Countdown({ target, still }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const m = Math.max(0, Math.floor((target.getTime() - now) / 60000))
  const parts = [[pad(Math.floor(m / 1440)), 'Jours'], [pad(Math.floor(m / 60) % 24), 'Heures'], [pad(m % 60), 'Minutes']]
  const mask = 'linear-gradient(to bottom,transparent 0%,#000 12%,#000 88%,transparent 100%)'
  return (
    <div className="relative w-full mt-4" style={{ aspectRatio: '390 / 351' }}>
      <motion.img src={`${ART}/columns-roses.webp`} alt="" aria-hidden className="absolute top-0 h-full block max-w-none"
        style={{ left: '-10.26%', width: '120.5%', WebkitMaskImage: mask, maskImage: mask }}
        initial={still ? false : { opacity: 0, scale: 1.06 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 1.6, ease: EASE }} />
      <div className="absolute top-0 bottom-0 flex items-center justify-center" style={{ left: '21.3%', width: '57.4%' }} role="timer" aria-label="Compte à rebours avant le grand jour">
        {parts.map(([v, l], i) => (
          <div key={l} className="contents">
            {i > 0 && <motion.span className="block w-px" style={{ height: 52, background: '#D9C9A3' }}
              initial={still ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5 }} />}
            <Reveal still={still} delay={0.3 + i * 0.12} className="flex flex-col items-center gap-1.5" style={{ width: '33%' }}>
              <Digit value={v} still={still} />
              <span className="hd-caps" style={{ letterSpacing: '.18em', textIndent: '.18em' }}>{l}</span>
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  )
}

function H2({ children, still, kicker, id }) {
  return (
    <Reveal still={still} className="text-center">
      {kicker && <p className="hd-caps m-0">{kicker}</p>}
      <h2 id={id} className="hd-script hd-gold inline-block m-0 mt-3 px-4 py-1.5" style={{ fontSize: 40, lineHeight: 1.2 }}>{children}</h2>
    </Reveal>
  )
}

export default function HeureDoree({ occasion, guest, token, tableLabel, confirmed, declined, busy, err, respond, rsvpRef, reduced, preview = false }) {
  const still = !!(reduced || preview)
  const [stage, setStage] = useState(() => (preview || store.get(seenKey(token)) === '1' ? 'open' : 'sealed'))
  const [playing, setPlaying] = useState(false)
  const audio = useRef(null)
  const cardRef = useRef(null)
  const c = occasion.content || {}
  const letters = sealOf(occasion)
  const { title, couple } = eventNames(occasion.name)
  const names = couple ? `${couple[0]} & ${couple[1]}` : title
  const date = startOf(occasion)
  const photos = occasion.photos || []
  const arch = occasion.cover_url || photos[0]
  const gallery = occasion.cover_url ? photos : photos.slice(1)
  const fmt = (o) => date.toLocaleDateString('fr-FR', o)
  const longDate = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, s => s.toUpperCase())
  const time = occasion.starts_at ? `${date.getHours()} h ${pad(date.getMinutes())}` : null
  const [venue, ...rest] = (occasion.location || '').split(',')
  const max = Number(c.party_max) || null
  const music = !preview && occasion.music_url
  const guestName = guest?.name || 'Marie Exemple'
  const open = stage === 'open'

  useEffect(() => {
    if (document.getElementById('hd-fonts')) return
    document.head.appendChild(Object.assign(document.createElement('link'), { id: 'hd-fonts', rel: 'stylesheet', href: FONTS }))
  }, [])

  const play = () => { audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  const opened = () => { setStage('open'); store.set(seenKey(token), '1') }

  return (
    <div className={`hd relative${reduced ? ' hd-reduced' : ''}`} data-testid="heure-doree">
      <AnimatePresence>
        {!open && !preview && <Envelope letters={letters} guestName={guestName} reduced={reduced} onOpen={music ? play : undefined} onDone={opened} />}
      </AnimatePresence>
      {music && (
        <>
          <audio ref={audio} src={occasion.music_url} loop preload="none" />
          <button type="button" onClick={() => { if (playing) { audio.current.pause(); setPlaying(false) } else play() }}
            aria-label={playing ? 'Couper la musique' : 'Lancer la musique'} aria-pressed={playing}
            className="fixed z-[60] h-11 w-11 rounded-full flex items-end justify-center gap-[2.5px] pb-[14px]"
            style={{ right: 'max(14px, calc(50% - 215px + 14px))', bottom: 'max(14px, env(safe-area-inset-bottom, 0px))', background: 'rgba(248,244,236,.9)', border: '1px solid #C9A55C', boxShadow: '0 6px 16px -8px rgba(91,81,70,.5)' }}>
            {[0, 1, 2, 3].map(i => (
              <motion.i key={i} className="block w-[2.5px] h-4 rounded-sm" style={{ background: '#9C7A3C', originY: 1 }}
                animate={playing && !reduced ? { scaleY: [0.25, 1, 0.4, 0.8, 0.25] } : { scaleY: 0.25 }}
                transition={playing ? { duration: 1.1, repeat: Infinity, delay: i * 0.15 } : { duration: 0.3 }} />
            ))}
          </button>
        </>
      )}

      {/* 02 · Accueil */}
      <section className="relative flex flex-col items-center text-center px-8 pt-16 pb-14" style={{ minHeight: preview ? 844 : '100svh' }}>
        <motion.p className="hd-caps m-0" initial={still ? false : { opacity: 0, letterSpacing: '0.6em' }}
          animate={open ? { opacity: 1, letterSpacing: '0.32em' } : {}} transition={{ duration: 1.4, delay: 0.2, ease: EASE }}>
          {occasion.type === 'mariage' ? 'Nous nous marions' : 'Vous êtes invité(e)'}
        </motion.p>
        <h1 className="m-0 mt-4 hd-script font-normal" style={{ fontSize: names.length > 14 ? 46 : 56, lineHeight: 1.15, whiteSpace: 'nowrap' }} aria-label={names}>
          {names.split(' ').map((w, i) => (
            <motion.span key={i} aria-hidden className="hd-gold inline-block px-1.5 py-2.5"
              initial={still ? false : { opacity: 0, y: 18, filter: 'blur(10px)' }} animate={open ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 1.2, delay: 0.5 + i * 0.3, ease: EASE }}>{w}</motion.span>
          ))}
        </h1>
        <div className="mt-2">{(open || preview) && <Divider still={still} />}</div>
        <motion.p className="mt-5 mb-0 font-medium" style={{ fontSize: 13, letterSpacing: '.32em', textIndent: '.32em' }}
          initial={still ? false : { opacity: 0 }} animate={open ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 1.4 }}>
          {pad(date.getDate())} · {pad(date.getMonth() + 1)} · {date.getFullYear()}
        </motion.p>
        {arch && (
          <motion.div className="hd-frame mt-9" style={{ width: '66.7%', maxWidth: 286, aspectRatio: '260 / 346', borderRadius: '50% 50% 2px 2px / 37.6% 37.6% 2px 2px' }}
            initial={still ? false : { opacity: 0, y: 40 }} animate={open ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1.3, delay: 1.1, ease: EASE }}>
            <motion.div className="w-full h-full overflow-hidden" style={{ borderRadius: '50% 50% 0 0 / 35.5% 35.5% 0 0' }}
              initial={still ? false : { clipPath: 'inset(100% 0% 0% 0%)' }} animate={open ? { clipPath: 'inset(0% 0% 0% 0%)' } : {}}
              transition={{ duration: 1.5, delay: 1.3, ease: [0.77, 0, 0.18, 1] }}>
              <motion.img src={arch} alt={names} className="w-full h-full object-cover block" style={{ objectPosition: '26% center' }}
                initial={still ? false : { scale: 1.25 }} animate={open ? { scale: 1 } : {}} transition={{ duration: 3, delay: 1.3, ease: EASE }} />
            </motion.div>
          </motion.div>
        )}
        <motion.p className="mt-9 mb-0 max-w-[280px]" style={{ fontSize: 16, lineHeight: 1.6, textWrap: 'balance' }}
          initial={still ? false : { opacity: 0, y: 12 }} animate={open ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 2 }}>
          {c.intro || `Cher(e) ${guestName}, nous serions honorés de votre présence.`}
        </motion.p>
        <div className="hd-grain" />
      </section>

      {/* 03 · Citation, compte à rebours, galerie */}
      <section className="relative flex flex-col items-center text-center pt-[120px] pb-[112px]">
        <Divider width={72} still={still} />
        <Reveal still={still} className="hd-script mx-8 my-14 max-w-[280px] whitespace-pre-line" style={{ fontSize: 30, lineHeight: 1.35, textWrap: 'balance' }}>
          {c.verse || 'Et ils choisirent de s’aimer pour toujours.'}
        </Reveal>
        <Divider width={72} still={still} />

        {!occasion.is_expired && (
          <div className="w-full mt-[136px]">
            <H2 still={still} kicker="Avant le grand jour">Compte à rebours</H2>
            <Countdown target={date} still={still} />
          </div>
        )}

        {gallery.length > 0 && (
          <div className="w-full mt-[112px]">
            <H2 still={still} kicker="Galerie">Un aperçu de nous</H2>
            <HeureDoreeGallery photos={gallery} reduced={!!reduced} preview={preview} />
          </div>
        )}
        <div className="hd-grain" />
      </section>

      {/* 04 · Programme */}
      {c.program?.length > 0 && (
        <section className="relative py-24">
          <H2 still={still} kicker={longDate}>Programme de la journée</H2>
          {/* La liste (visible) déclenche la ligne et les points : un élément écrasé à zéro n'est jamais « dans l'écran ». */}
          <motion.ol className="relative mt-16 ml-14 mr-8 mb-0 flex flex-col gap-9 list-none" style={{ paddingLeft: 36 }}
            initial={still ? false : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-80px' }}>
            <motion.span aria-hidden className="absolute block w-px" style={{ left: 3.5, top: 8, bottom: 60, transformOrigin: 'top', background: 'linear-gradient(180deg,#B8924A 0%,#E6CF9A 45%,#C9A55C 55%,#9C7A3C 100%)' }}
              variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1, transition: { duration: 2.2, ease: 'easeInOut' } } }} />
            {c.program.map((p, i) => (
              <motion.li key={i} className="relative"
                variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.15 + i * 0.22, ease: EASE } } }}>
                <motion.span aria-hidden className="absolute block w-2 h-2 rounded-full" style={{ left: -36, top: 3, background: GOLD_BG }}
                  variants={{ hidden: { scale: 0 }, shown: { scale: [0, 1.7, 1], transition: { duration: 0.7, delay: 0.3 + i * 0.22 } } }} />
                <p className="hd-time hd-gold m-0">{p.time}</p>
                <p className="hd-serif m-0 mt-1" style={{ fontSize: 23, lineHeight: 1.25 }}>{p.label}</p>
                {p.note && <p className="m-0 mt-1 italic" style={{ fontSize: 16, lineHeight: 1.55, color: '#8A7F72' }}>{p.note}</p>}
              </motion.li>
            ))}
          </motion.ol>
          <div className="hd-grain" />
        </section>
      )}

      {/* 05 · Détails, dans le cadre baroque au lustre */}
      <section className="relative w-full overflow-hidden" style={{ aspectRatio: '390 / 1000' }} aria-label="Détails de l'événement">
        <motion.img src={`${ART}/baroque-frame.webp`} alt="" aria-hidden loading="lazy" className="absolute block max-w-none"
          style={{ left: '-7.7%', top: '4%', width: '115.4%', height: '80.6%', WebkitMaskImage: 'linear-gradient(to bottom,transparent 0%,#000 6%,#000 94%,transparent 100%)', maskImage: 'linear-gradient(to bottom,transparent 0%,#000 6%,#000 94%,transparent 100%)' }}
          initial={still ? false : { opacity: 0, scale: 0.96, filter: 'blur(4px)' }} whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1.8, ease: EASE }} />
        {!still && [[49, 15.5, 0], [52.5, 17, 0.8], [46.5, 17.6, 1.5], [50.5, 19.4, 0.4], [48, 13.6, 1.9], [53.5, 14.8, 1.2]].map(([x, y, d], i) => (
          <span key={i} aria-hidden className="hd-twinkle" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />
        ))}
        <div className="absolute flex flex-col items-center text-center" style={{ left: '24.4%', width: '51.3%', top: '54%' }}>
          <Reveal still={still} delay={0.2}><p className="hd-caps m-0" style={{ lineHeight: 1.5 }}>{fmt({ weekday: 'long' })}<br />{fmt({ day: 'numeric', month: 'long', year: 'numeric' })}</p></Reveal>
          {venue && <Reveal still={still} delay={0.35}><p className="hd-script hd-gold m-0 mt-1 px-2.5 py-0.5 whitespace-nowrap" style={{ fontSize: venue.trim().length > 14 ? 32 : 40, lineHeight: 1.15 }}>{venue.trim()}</p></Reveal>}
          {rest.length > 0 && <Reveal still={still} delay={0.45}><p className="m-0" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>{rest.join(',').trim()}</p></Reveal>}
          {(time || c.reception?.time) && (
            <Reveal still={still} delay={0.55}><p className="m-0 mt-2.5" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {time && <>{c.ceremony || 'Cérémonie'} · {time}</>}
              {c.reception?.time && <><br />Réception · {c.reception.time}</>}
            </p></Reveal>
          )}
          {c.dress_title && <Reveal still={still} delay={0.65}><p className="m-0 mt-2" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>{c.dress_title}</p></Reveal>}
        </div>
        {occasion.location && (
          <Reveal still={still} delay={0.3} className="absolute" style={{ left: '8.2%', right: '8.2%', top: '88%' }}>
            <a href={mapsUrl(occasion.location)} target="_blank" rel="noreferrer" className="hd-btn hd-btn-line">Itinéraire</a>
          </Reveal>
        )}
        <div className="hd-grain" />
      </section>

      {/* 06 · RSVP */}
      <section ref={rsvpRef} className="relative flex flex-col items-center text-center px-8 pt-20 pb-16 scroll-mt-4">
        <H2 still={still} kicker="Soyez notre invité" id="hd-rsvp">RSVP</H2>
        <Reveal still={still} delay={0.15} className="mt-3 max-w-[270px]" style={{ fontSize: 16, lineHeight: 1.6, textWrap: 'balance' }}>
          {occasion.is_expired ? 'Cet événement est passé. Merci d’en avoir fait partie.'
            : c.rsvp_deadline ? `Merci de confirmer votre présence avant le ${new Date(`${c.rsvp_deadline}T12:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`
            : 'Merci de nous confirmer votre présence.'}
        </Reveal>
        {!occasion.is_expired && (
          <RsvpForm guest={guest} confirmed={confirmed} declined={declined} busy={busy} err={err} respond={respond} max={max}
            still={still} preview={preview} onConfirmed={() => setTimeout(() => cardRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), 1200)} />
        )}
        <div className="hd-grain" />
      </section>

      {/* 07 · Ma carte d'invitation */}
      {!declined && !occasion.is_expired && (
        <section ref={cardRef} className="relative flex flex-col items-center pt-6 pb-16 scroll-mt-2" data-testid="invitation-access" style={{ perspective: 1000 }}>
          <InvitationCard guest={guest} guestName={guestName} letters={letters} tableLabel={tableLabel} max={max} token={token} still={still} preview={preview} />
          <div className="hd-grain" />
        </section>
      )}

      <footer className="relative text-center pb-10 pt-2"><p className="hd-caps m-0" style={{ fontSize: 9.5, opacity: 0.6 }}>Créé avec Signiq</p></footer>
    </div>
  )
}

/** 06 · Formulaire : présence, nombre de personnes, un mot pour les mariés. */
function RsvpForm({ guest, confirmed, declined, busy, err, respond, max, still, preview, onConfirmed }) {
  const answered = confirmed || declined
  const [editing, setEditing] = useState(!answered)
  const [choice, setChoice] = useState(declined ? 'decline' : 'confirm')
  const [party, setParty] = useState(guest?.party_size || Math.min(max || 1, 2))
  const [message, setMessage] = useState(guest?.message || '')
  const n = Math.min(Math.max(1, party), max || 1)

  if (answered && !editing) {
    return (
      <motion.div className="mt-10" data-testid="rsvp-done" role="status" initial={still ? false : { opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: EASE }}>
        <p className={`hd-script m-0 inline-block px-2 ${confirmed ? 'hd-gold' : ''}`} style={{ fontSize: 40, lineHeight: 1.2 }}>
          {confirmed ? 'Merci, à très bientôt !' : 'Vous nous manquerez.'}
        </p>
        <p className="hd-caps m-0 mt-2">{confirmed ? `Présence confirmée${max ? ` · ${guest?.party_size || n} pers.` : ''}` : 'Réponse enregistrée'}</p>
        {guest?.message && <p className="m-0 mt-3 italic" style={{ fontSize: 16 }}>« {guest.message} »</p>}
        <button type="button" onClick={() => setEditing(true)} className="mt-4 italic underline underline-offset-4" style={{ fontSize: 15, color: '#8A7F72' }}>Modifier ma réponse</button>
      </motion.div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    await respond(choice, { message, ...(max && choice === 'confirm' ? { party_size: n } : {}) })
    setEditing(false)
    if (choice === 'confirm') onConfirmed()
  }

  return (
    <form onSubmit={submit} className="mt-12 w-full max-w-[326px] flex flex-col gap-10 text-left" data-testid="rsvp-form">
      <Reveal still={still} delay={0.2} className="flex flex-col gap-3.5">
        <p className="hd-caps m-0" style={{ textIndent: 0 }} id="hd-answer">Votre réponse</p>
        <div className="flex gap-3" role="radiogroup" aria-labelledby="hd-answer">
          {[['confirm', 'Avec joie'], ['decline', 'À regret']].map(([k, label]) => (
            <motion.button key={k} type="button" role="radio" aria-checked={choice === k} className="hd-pill" onClick={() => setChoice(k)}
              whileTap={{ scale: 0.96 }}>{label}</motion.button>
          ))}
        </div>
      </Reveal>
      <AnimatePresence initial={false}>
        {max > 1 && choice === 'confirm' && (
          <motion.div className="flex flex-col gap-1.5 overflow-hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <p className="hd-caps m-0" style={{ textIndent: 0 }} id="hd-party">Nombre de personnes</p>
            <div className="flex items-center justify-between h-11" style={{ borderBottom: '1px solid #C9A55C' }} role="group" aria-labelledby="hd-party">
              <button type="button" aria-label="Une personne de moins" disabled={n <= 1} onClick={() => setParty(n - 1)}
                className="w-11 h-11 flex items-center justify-start text-2xl" style={{ color: n <= 1 ? '#D9C9A3' : '#8A7F72' }}>−</button>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={n} className="text-2xl leading-none" aria-live="polite" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>{n}</motion.span>
              </AnimatePresence>
              <button type="button" aria-label="Une personne de plus" disabled={n >= max} onClick={() => setParty(n + 1)}
                className="w-11 h-11 flex items-center justify-end text-2xl" style={{ color: n >= max ? '#D9C9A3' : '#8A7F72' }}>+</button>
            </div>
            <p className="m-0" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>Votre invitation est valable pour {max} personnes au plus.</p>
          </motion.div>
        )}
      </AnimatePresence>
      <Reveal still={still} delay={0.3} className="flex flex-col gap-1.5">
        <label htmlFor="hd-msg" className="hd-caps" style={{ textIndent: 0 }}>Un mot pour les mariés</label>
        <textarea id="hd-msg" className="hd-field" rows={1} maxLength={500} value={message} placeholder="Votre message…"
          onChange={e => { setMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px` }} />
      </Reveal>
      {err && <p className="m-0 text-sm" style={{ color: '#9b4a3e' }} role="alert">{err}</p>}
      <Reveal still={still} delay={0.4}>
        <button type="submit" className="hd-btn hd-btn-gold" disabled={busy || preview}>
          {busy ? <span className="h-4 w-4 rounded-full border-2 border-[#F8F4EC] border-t-transparent animate-spin" /> : choice === 'confirm' ? 'Confirmer ma présence' : 'Envoyer ma réponse'}
        </button>
      </Reveal>
    </form>
  )
}

/** 07 · Carte d'invitation personnelle : nom, places, table, QR, code ; à enregistrer en PNG. */
function InvitationCard({ guest, guestName, letters, tableLabel, max, token, still, preview }) {
  const [saving, setSaving] = useState(false)
  const places = guest?.party_size || max
  const details = [places && `${places} place${places > 1 ? 's' : ''}`, tableLabel].filter(Boolean).join(' · ')
  const raw = (token || '').replace(/-/g, '')
  const code = raw ? `INV-${raw.slice(0, 4)}-${raw.slice(4, 6)}`.toUpperCase() : 'INV-XXXX-XX'
  const mono = letters.length === 2 ? `${letters[0]} & ${letters[1]}` : letters[0]
  const note = 'Présentez ce code à l’entrée. Invitation strictement personnelle.'
  const qr = warmQr(guest?.qr)
  const save = async () => {
    setSaving(true)
    try { await downloadInvitationCard({ monogram: mono, name: guestName, details, qr, code, note, fileName: `invitation-${guestName.replace(/[^\p{L}\d]+/gu, '-').toLowerCase()}.png` }) }
    finally { setSaving(false) }
  }
  const goldBorder = { border: '1px solid transparent', background: `linear-gradient(#FBF8F2,#FBF8F2) padding-box, ${GOLD_BG} border-box` }
  return (
    <>
      <motion.div className="relative flex flex-col items-center text-center rounded px-5 pt-[34px] pb-[30px]"
        style={{ width: 'min(350px, 89.7%)', background: '#FBF8F2', boxShadow: '0 1px 2px rgba(91,81,70,0.06), 0 18px 40px rgba(91,81,70,0.12)' }}
        initial={still ? false : { opacity: 0, y: 50, rotateX: 18 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: '-60px' }} transition={{ duration: 1.1, ease: EASE }}>
        <span aria-hidden className="absolute inset-2 rounded-sm pointer-events-none" style={goldBorder} />
        <p className="relative hd-script hd-gold m-0 px-3" style={{ fontSize: 34, lineHeight: 1.2 }}>{mono}</p>
        <p className="relative hd-caps m-0 mt-2.5">Invitation personnelle</p>
        <p className="relative hd-script hd-gold m-0 mt-3.5 px-3 py-1.5" style={{ fontSize: 36, lineHeight: 1.1 }}>{guestName}</p>
        {details && <p className="relative m-0 mt-2 font-medium uppercase" style={{ fontSize: 12, letterSpacing: '.2em' }}>{details}</p>}
        <div className="relative mt-6 flex items-center justify-center" style={{ width: 'min(284px, 100%)', aspectRatio: '1', ...goldBorder }}>
          {['-left-[7px] -top-[7px]', '-right-[7px] -top-[7px]', '-left-[7px] -bottom-[7px]', '-right-[7px] -bottom-[7px]'].map(pos => (
            <span key={pos} aria-hidden className={`absolute w-[13px] h-[13px] flex items-center justify-center bg-[#FBF8F2] ${pos}`}>
              <span className="block w-[7px] h-[7px] rotate-45" style={{ background: GOLD_BG }} />
            </span>
          ))}
          {['left-[5px] top-[5px] border-l border-t', 'right-[5px] top-[5px] border-r border-t', 'left-[5px] bottom-[5px] border-l border-b', 'right-[5px] bottom-[5px] border-r border-b'].map(p => (
            <span key={p} aria-hidden className={`absolute w-[18px] h-[18px] border-[#C9A55C] ${p}`} />
          ))}
          <div className="p-6 w-full h-full">
            {qr ? <img src={qr} alt={`QR code ${code}`} className="w-full h-full block" style={{ imageRendering: 'pixelated' }} />
              : <div className="w-full h-full" style={{ background: 'repeating-conic-gradient(#2E2620 0 25%, #FBF8F2 0 50%) 0 0 / 22px 22px', opacity: 0.12 }} />}
          </div>
        </div>
        <p className="relative m-0 mt-5 font-medium" style={{ fontSize: 13, letterSpacing: '.32em', textIndent: '.32em' }}>{code}</p>
        <p className="relative m-0 mt-3 max-w-[250px]" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72', textWrap: 'balance' }}>{note}</p>
      </motion.div>
      <Reveal still={still} delay={0.2} className="relative mt-[22px] flex flex-col gap-2.5" style={{ width: 'min(326px, 83.6%)' }}>
        <button type="button" className="hd-btn hd-btn-gold" onClick={save} disabled={saving || preview}>
          {saving ? 'Préparation…' : 'Enregistrer l’invitation'}
        </button>
        {token && <a href={calendarHref(token, API_BASE)} className="hd-btn hd-btn-line">Ajouter au calendrier</a>}
      </Reveal>
    </>
  )
}
