import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './heure-doree.css'
import { eventNames, mapsUrl, placeOf, sealOf, startOf, venueOf } from '../../lib/invitationTheme'
import { ACCESS_NOTE, EASE, GOLD_BG, accessDetails, invitationCode, pad, warmQr } from '../../lib/goldInvitation'
import HeureDoreeGallery from './HeureDoreeGallery'
import { CardActions, Divider, H2, QrFrame, Reveal, RsvpForm } from './GoldKit'

/**
 * Modèle « Heure dorée » (design « Ben & Sarah ») : enveloppe au sceau de
 * cire, accueil avec les prénoms dorés et la photo en arche, citation,
 * compte à rebours sur les colonnes fleuries (aquarelle), galerie animée,
 * programme, détails dans le cadre baroque au lustre (aquarelle), réponse
 * (présence, nombre de personnes, mot) et carte d'invitation personnelle
 * avec QR, à enregistrer. Ouvert par le lien personnel de l'invité.
 */

const ART = '/invitations/heure-doree'
const FONTS = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&family=Playfair+Display:ital,wght@1,400&display=swap'
const seenKey = (t) => `inv-open:${t}`
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* indisponible */ } },
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
  const { venue, address } = venueOf(occasion)
  const place = placeOf(occasion)
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
          {venue && <Reveal still={still} delay={0.35}><p className="hd-script hd-gold m-0 mt-1 px-2.5 py-0.5 whitespace-nowrap" style={{ fontSize: venue.length > 14 ? 32 : 40, lineHeight: 1.15 }}>{venue}</p></Reveal>}
          {address && <Reveal still={still} delay={0.45}><p className="m-0" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>{address}</p></Reveal>}
          {(time || c.reception?.time) && (
            <Reveal still={still} delay={0.55}><p className="m-0 mt-2.5" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {time && <>{c.ceremony || 'Cérémonie'} · {time}</>}
              {c.reception?.time && <><br />Réception · {c.reception.time}</>}
            </p></Reveal>
          )}
          {c.dress_title && <Reveal still={still} delay={0.65}><p className="m-0 mt-2" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>{c.dress_title}</p></Reveal>}
        </div>
        {place && (
          <Reveal still={still} delay={0.3} className="absolute" style={{ left: '8.2%', right: '8.2%', top: '88%' }}>
            <a href={mapsUrl(place)} target="_blank" rel="noreferrer" className="hd-btn hd-btn-line">Itinéraire</a>
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
          <RsvpForm guest={guest} confirmed={confirmed} declined={declined} busy={busy} err={err} respond={respond} max={max} drinks={c.drinks || []}
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

/** 07 · Carte d'invitation personnelle : nom, places, table, QR, code ; à enregistrer en PNG. */
function InvitationCard({ guest, guestName, letters, tableLabel, max, token, still, preview }) {
  const details = accessDetails(guest?.party_size || max, tableLabel)
  const code = invitationCode(token)
  const mono = letters.length === 2 ? `${letters[0]} & ${letters[1]}` : letters[0]
  const qr = warmQr(guest?.qr)
  const card = { monogram: mono, name: guestName, details, qr, code, note: ACCESS_NOTE, fileName: `invitation-${guestName.replace(/[^\p{L}\d]+/gu, '-').toLowerCase()}.png` }
  return (
    <>
      <motion.div className="relative flex flex-col items-center text-center rounded px-5 pt-[34px] pb-[30px]"
        style={{ width: 'min(350px, 89.7%)', background: '#FBF8F2', boxShadow: '0 1px 2px rgba(91,81,70,0.06), 0 18px 40px rgba(91,81,70,0.12)' }}
        initial={still ? false : { opacity: 0, y: 50, rotateX: 18 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: '-60px' }} transition={{ duration: 1.1, ease: EASE }}>
        <span aria-hidden className="absolute inset-2 rounded-sm pointer-events-none" style={{ border: '1px solid transparent', background: `linear-gradient(#FBF8F2,#FBF8F2) padding-box, ${GOLD_BG} border-box` }} />
        <p className="relative hd-script hd-gold m-0 px-3" style={{ fontSize: 34, lineHeight: 1.2 }}>{mono}</p>
        <p className="relative hd-caps m-0 mt-2.5">Invitation personnelle</p>
        <p className="relative hd-script hd-gold m-0 mt-3.5 px-3 py-1.5" style={{ fontSize: 36, lineHeight: 1.1 }}>{guestName}</p>
        {details && <p className="relative m-0 mt-2 font-medium uppercase" style={{ fontSize: 12, letterSpacing: '.2em' }}>{details}</p>}
        <div className="relative mt-6 w-full flex justify-center"><QrFrame qr={qr} code={code} still={still} /></div>
        <p className="relative m-0 mt-5 font-medium" style={{ fontSize: 13, letterSpacing: '.32em', textIndent: '.32em' }}>{code}</p>
        <p className="relative m-0 mt-3 max-w-[250px]" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72', textWrap: 'balance' }}>{ACCESS_NOTE}</p>
      </motion.div>
      <CardActions card={card} token={token} still={still} preview={preview} style={{ marginTop: 22 }} />
    </>
  )
}
