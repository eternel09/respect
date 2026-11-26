import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import './heure-doree.css'
import { eventNames, mapsUrl, startOf } from '../../lib/invitationTheme'
import { ACCESS_NOTE, EASE, accessDetails, goldBorder, invitationCode, pad, warmQr } from '../../lib/goldInvitation'
import { CardActions, Divider, H2, QrFrame, Reveal, RsvpForm } from './GoldKit'
import { Curtained, Lightbox } from './HeureDoreeGallery'

/**
 * Modèle « Save the Date » (design « Ben & Sarah ») : grande photo fondue
 * dans le papier, « Save the Date » et prénoms dorés, calendrier du mois sur
 * bandeau brun, lieu et heure, carte d'itinéraire, deux photos en arche,
 * réponse (présence, nombre de personnes, carte des boissons), accès
 * personnel avec QR et galerie. Ouvert par le lien personnel de l'invité.
 */

const FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&display=swap'
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const caps = { fontWeight: 500, fontSize: 11, letterSpacing: '.32em', textIndent: '.32em', textTransform: 'uppercase', color: '#8A7F72' }

/** Grille du mois (lundi en premier), jour J entouré d'un cercle qui se dessine. */
function Calendar({ date, still }) {
  const y = date.getFullYear(), m = date.getMonth()
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => (i >= lead && i < lead + days ? i - lead + 1 : null))
  const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, s => s.toUpperCase())
  return (
    <motion.div className="flex flex-col items-center gap-3.5" initial={still ? false : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-40px' }}
      aria-label={`${month}, le ${date.getDate()}`} role="img">
      <motion.p className="m-0" style={{ ...caps, color: '#E6CF9A' }} variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}>{month}</motion.p>
      <div className="grid gap-y-1" style={{ gridTemplateColumns: 'repeat(7, 24px)' }} aria-hidden>
        {DAYS.map((d, i) => <span key={i} className="text-center font-medium" style={{ height: 20, fontSize: 11, lineHeight: '20px', color: '#D9C9A3' }}>{d}</span>)}
        {cells.map((d, i) => {
          const sel = d === date.getDate()
          return (
            <motion.span key={i} className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}
              variants={{ hidden: { opacity: 0, scale: 0.6 }, shown: { opacity: 1, scale: 1, transition: { duration: 0.35, delay: 0.2 + i * 0.018 } } }}>
              {sel && (
                <svg className="absolute inset-0" viewBox="0 0 24 24" aria-hidden>
                  <motion.circle cx="12" cy="12" r="11.5" fill="none" stroke="#E6CF9A" strokeWidth="1" style={{ rotate: -90, transformOrigin: 'center' }}
                    variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1, transition: { duration: 1.1, delay: 1.1, ease: EASE } } }} />
                </svg>
              )}
              <span style={{ fontSize: 13, lineHeight: 1, fontWeight: sel ? 500 : 400, color: sel ? '#E6CF9A' : '#EFE6D2' }}>{d || ''}</span>
            </motion.span>
          )
        })}
      </div>
    </motion.div>
  )
}

/** Photo en arche dans un cadre doré : monte et se dévoile par le bas. */
function ArchPhoto({ src, delay, still, onOpen, position }) {
  return (
    <motion.button type="button" onClick={onOpen} aria-label="Agrandir la photo" className="block cursor-pointer"
      style={{ width: '47.5%', aspectRatio: '155 / 250', padding: 8, borderRadius: '78px 78px 2px 2px', ...goldBorder('#F8F4EC') }}
      initial={still ? false : 'hidden'} whileInView="shown" viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: { opacity: 0, y: 40 }, shown: { opacity: 1, y: 0, transition: { duration: 1, delay, ease: EASE } } }}>
      <motion.span className="block w-full h-full overflow-hidden" style={{ borderRadius: '69px 69px 0 0' }}
        variants={{ hidden: { clipPath: 'inset(100% 0% 0% 0% round 69px 69px 0 0)' }, shown: { clipPath: 'inset(0% 0% 0% 0% round 69px 69px 0 0)', transition: { duration: 1.4, delay: delay + 0.2, ease: [0.77, 0, 0.18, 1] } } }}>
        <motion.img src={src} alt="" loading="lazy" className="w-full h-full object-cover block" style={{ objectPosition: position }}
          variants={{ hidden: { scale: 1.3 }, shown: { scale: 1, transition: { duration: 2.4, delay: delay + 0.2, ease: EASE } } }} />
      </motion.span>
    </motion.button>
  )
}

/** Galerie : une photo large, deux côte à côte, une large… chacune dévoilée en rideau ; plein écran au toucher. */
function Gallery({ photos, reduced, preview, onOpen }) {
  const rows = []
  for (let i = 0, wide = true; i < photos.length; wide = !wide) {
    if (wide || i === photos.length - 1) { rows.push([photos[i]]); i += 1 } else { rows.push([photos[i], photos[i + 1]]); i += 2 }
  }
  let wides = 0
  return (
    <div className="mx-auto mt-10 flex flex-col gap-4" style={{ width: 'min(326px, 83.6%)' }} data-testid="std-gallery">
      {rows.map((row, r) => row.length === 1
        ? <Curtained key={r} src={row[0]} ratio="326 / 217" from={wides++ % 2 ? 'right' : 'left'} plain reduced={reduced} preview={preview} onOpen={onOpen} objectPosition="center 40%" />
        : (
          <div key={r} className="grid grid-cols-2 gap-4">
            {row.map((src, k) => <Curtained key={src + k} src={src} ratio="155 / 226" from="bottom" delay={k * 0.18} plain reduced={reduced} preview={preview} onOpen={onOpen} objectPosition="center 25%" />)}
          </div>
        ))}
    </div>
  )
}

export default function SaveTheDate({ occasion, guest, token, tableLabel, confirmed, declined, busy, err, respond, rsvpRef, reduced, preview = false }) {
  const still = !!(reduced || preview)
  const c = occasion.content || {}
  const { title, couple } = eventNames(occasion.name)
  const names = couple ? `${couple[0]} & ${couple[1]}` : title
  const date = startOf(occasion)
  const photos = occasion.photos || []
  const hero = occasion.cover_url || photos[0]
  const rest = occasion.cover_url ? photos : photos.slice(1)
  const band = rest[0]
  const arches = rest.slice(1, 3)
  const gallery = rest.length > 3 ? rest.slice(3) : rest
  const max = Number(c.party_max) || null
  const guestName = guest?.name || 'Marie Exemple'
  const [venue, ...addr] = (occasion.location || '').split(',').map(s => s.trim())
  const time = occasion.starts_at ? `${date.getHours()} h ${pad(date.getMinutes())}` : null
  const longDate = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const music = !preview && occasion.music_url
  const audio = useRef(null)
  const cardRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState(null) // { list, index } de la visionneuse
  const closeBox = useCallback(() => setOpen(null), [])
  const show = (list) => (src) => !preview && setOpen({ list, index: Math.max(0, list.indexOf(src)) })

  // Parallaxe douce de la grande photo.
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])

  useEffect(() => {
    if (document.getElementById('std-fonts')) return
    document.head.appendChild(Object.assign(document.createElement('link'), { id: 'std-fonts', rel: 'stylesheet', href: FONTS }))
  }, [])

  // Musique : démarre au premier geste de l'invité (les navigateurs l'exigent).
  const play = useCallback(() => { audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }, [])
  useEffect(() => {
    if (!music) return
    const first = () => play()
    window.addEventListener('pointerdown', first, { once: true })
    return () => window.removeEventListener('pointerdown', first)
  }, [music, play])

  const code = invitationCode(token)
  const qr = warmQr(guest?.qr)
  const details = accessDetails(guest?.party_size || max, tableLabel)
  const letters = couple ? `${couple[0][0]} & ${couple[1][0]}` : (title[0] || '')
  const card = { monogram: letters, name: guestName, details, qr, code, note: ACCESS_NOTE, fileName: `invitation-${guestName.replace(/[^\p{L}\d]+/gu, '-').toLowerCase()}.png` }
  const enter = (delay, from = { opacity: 0, y: 18 }) => ({
    initial: still ? false : from, animate: { opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)' },
    transition: { duration: 1.1, delay, ease: EASE },
  })

  return (
    <div className={`hd relative flex flex-col items-center text-center pb-24${reduced ? ' hd-reduced' : ''}`} data-testid="save-the-date">
      {music && (
        <>
          <audio ref={audio} src={occasion.music_url} loop preload="none" />
          <button type="button" onClick={(e) => { e.stopPropagation(); if (playing) { audio.current.pause(); setPlaying(false) } else play() }}
            onPointerDown={e => e.stopPropagation()}
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

      {/* 01 · Photo fondue dans le papier, « Save the Date », prénoms */}
      {/* Le fondu est porté par le cadre : la photo glisse dedans (parallaxe) sans jamais laisser de bord net. */}
      <div ref={heroRef} className="relative w-full overflow-hidden"
        style={{ aspectRatio: '390 / 540', WebkitMaskImage: 'linear-gradient(to bottom,#000 0%,#000 58%,transparent 100%)', maskImage: 'linear-gradient(to bottom,#000 0%,#000 58%,transparent 100%)' }}>
        {hero && (
          <motion.img src={hero} alt={names} className="absolute left-0 w-full object-cover block"
            style={{ top: 0, height: '112%', objectPosition: '26% center', y: still ? 0 : heroY }}
            initial={still ? false : { opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.6, ease: EASE }} />
        )}
      </div>
      <div className="relative flex flex-col items-center" style={{ marginTop: hero ? -96 : 72 }} aria-label="Save the date">
        <motion.p className="m-0 uppercase" style={{ fontSize: 64, lineHeight: 0.95, letterSpacing: '.04em' }} {...enter(0.5, { opacity: 0, x: -36 })}>Save</motion.p>
        <motion.p className="m-0 hd-script hd-gold px-3" style={{ fontSize: 40, lineHeight: 1, margin: '-6px 0 -2px' }} {...enter(0.9, { opacity: 0, scale: 0.6, filter: 'blur(8px)' })}>the</motion.p>
        <motion.p className="m-0 uppercase" style={{ fontSize: 64, lineHeight: 0.95, letterSpacing: '.04em' }} {...enter(0.7, { opacity: 0, x: 36 })}>Date</motion.p>
      </div>
      <h1 className="m-0 mt-5 hd-script font-normal" style={{ fontSize: names.length > 14 ? 46 : 56, lineHeight: 1.15, whiteSpace: 'nowrap' }} aria-label={names}>
        {names.split(' ').map((w, i) => (
          <motion.span key={i} aria-hidden className="hd-gold inline-block px-1.5 py-2"
            initial={still ? false : { opacity: 0, y: 18, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 1.3 + i * 0.3, ease: EASE }}>{w}</motion.span>
        ))}
      </h1>
      <motion.p className="m-0 mt-10" style={caps} {...enter(2.2)}>{guestName}</motion.p>
      <motion.span className="block mt-5 h-px" style={{ width: 160, background: 'linear-gradient(90deg,rgba(184,146,74,0) 0%,#C9A55C 50%,rgba(184,146,74,0) 100%)' }}
        initial={still ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: 2.4, ease: EASE }} />
      <motion.p className="m-0 mt-6 mx-8 max-w-[290px]" style={{ fontSize: 16, lineHeight: 1.6, textWrap: 'pretty' }} {...enter(2.6)}>
        {c.intro || `Accompagnés de leurs familles, ${couple ? `${couple[0]} et ${couple[1]} ont` : `${title} a`} le plaisir de vous inviter à la célébration de leur ${occasion.type === 'mariage' ? 'mariage' : 'fête'}, le ${longDate}.`}
      </motion.p>

      {/* 02 · Calendrier sur bandeau brun, photo à droite */}
      <motion.div className="w-full flex overflow-hidden" style={{ marginTop: 96, height: 260, background: '#5B5146' }}
        initial={still ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.9 }}>
        <div className="flex-1 min-w-0 flex items-center justify-center"><Calendar date={date} still={still} /></div>
        {band && (
          <motion.button type="button" onClick={() => show(photos)(band)} aria-label="Agrandir la photo" className="block h-full overflow-hidden cursor-pointer" style={{ width: '43.6%' }}
            initial={still ? false : { clipPath: 'inset(0% 0% 0% 100%)' }} whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }} viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.77, 0, 0.18, 1] }}>
            <motion.img src={band} alt="" loading="lazy" className="w-full h-full object-cover block" style={{ objectPosition: 'center 25%' }}
              initial={still ? false : { scale: 1.25 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 2.4, delay: 0.3, ease: EASE }} />
          </motion.button>
        )}
      </motion.div>

      {/* 03 · Le lieu, l'heure */}
      {(venue || time) && (
        <div className="flex flex-col items-center" style={{ marginTop: 96 }}>
          <Divider still={still} />
          {venue && (
            <>
              <Reveal still={still} delay={0.1} className="mt-7" style={caps}>Le lieu</Reveal>
              <Reveal still={still} delay={0.2}><p className="hd-script hd-gold m-0 mt-2 px-4 py-1" style={{ fontSize: venue.length > 18 ? 32 : 40, lineHeight: 1.2 }} data-testid="std-venue">{venue}</p></Reveal>
              {addr.length > 0 && <Reveal still={still} delay={0.3}><p className="m-0 mt-1 mx-8" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72' }}>{addr.join(', ')}</p></Reveal>}
            </>
          )}
          {time && (
            <>
              <Reveal still={still} delay={0.1} className="mt-12" style={caps}>L’heure</Reveal>
              <Reveal still={still} delay={0.25}><p className="hd-gold m-0 mt-2.5 px-2" style={{ fontSize: 48, lineHeight: 1.05 }}>{time}</p></Reveal>
            </>
          )}
        </div>
      )}

      {/* 04 · Itinéraire */}
      {occasion.location && (
        <div className="flex flex-col items-center w-full" style={{ marginTop: 56 }}>
          <Reveal still={still} style={caps}>Itinéraire</Reveal>
          <Reveal still={still} delay={0.15} className="mt-4" style={{ width: 'min(326px, 83.6%)', height: 200, padding: 8, ...goldBorder('#F8F4EC') }}>
            {preview
              ? <div className="w-full h-full" style={{ background: 'repeating-linear-gradient(45deg,#EFE6D2 0 12px,#E9DEC6 12px 24px)' }} />
              : <iframe title={`Carte : ${occasion.location}`} src={`https://www.google.com/maps?q=${encodeURIComponent(occasion.location)}&z=16&output=embed`}
                  loading="lazy" className="block w-full h-full border-0" style={{ background: '#EFE6D2' }} />}
          </Reveal>
          <Reveal still={still} delay={0.25} className="mt-4" style={{ width: 'min(326px, 83.6%)' }}>
            <a href={mapsUrl(occasion.location)} target="_blank" rel="noopener noreferrer" className="hd-btn hd-btn-line">Ouvrir dans Maps</a>
          </Reveal>
        </div>
      )}

      {/* 05 · Deux photos en arche */}
      {arches.length > 0 && (
        <div className="flex justify-center gap-4" style={{ marginTop: 96, width: 'min(326px, 83.6%)' }}>
          {arches.map((src, k) => <ArchPhoto key={src + k} src={src} delay={k * 0.2} still={still} position={k ? 'center 20%' : 'center 15%'} onOpen={() => show(photos)(src)} />)}
        </div>
      )}

      {/* 06 · Confirmation de présence */}
      <section ref={rsvpRef} className="w-full flex flex-col items-center scroll-mt-4" style={{ marginTop: 96 }}>
        <H2 still={still} kicker="Soyez notre invité" id="std-rsvp">Confirmation<br />de présence</H2>
        <Reveal still={still} delay={0.15} className="mt-3 max-w-[270px]" style={{ fontSize: 16, lineHeight: 1.6, textWrap: 'balance' }}>
          {occasion.is_expired ? 'Cet événement est passé. Merci d’en avoir fait partie.'
            : c.rsvp_deadline ? `Merci de répondre avant le ${new Date(`${c.rsvp_deadline}T12:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`
            : 'Merci de nous confirmer votre présence.'}
        </Reveal>
        {!occasion.is_expired && (
          <RsvpForm guest={guest} confirmed={confirmed} declined={declined} busy={busy} err={err} respond={respond} max={max} drinks={c.drinks || []}
            withMessage={false} still={still} preview={preview}
            onConfirmed={() => setTimeout(() => cardRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), 1200)} />
        )}
      </section>

      {/* 07 · Accès personnel : QR et code */}
      {!declined && !occasion.is_expired && (
        <section ref={cardRef} className="w-full flex flex-col items-center scroll-mt-4" style={{ marginTop: 96 }} data-testid="invitation-access">
          <H2 still={still} kicker="Invitation personnelle">Votre accès</H2>
          {details && <Reveal still={still} delay={0.15}><p className="m-0 mt-2 font-medium uppercase whitespace-nowrap" style={{ fontSize: 12, letterSpacing: '.2em', textIndent: '.2em' }}>{details}</p></Reveal>}
          <motion.div className="mt-8 w-full flex justify-center" initial={still ? false : { opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }} transition={{ duration: 1, ease: EASE }}>
            <QrFrame qr={qr} code={code} cornerBg="#F8F4EC" still={still} animated />
          </motion.div>
          <Reveal still={still} delay={0.2}><p className="m-0 mt-5 font-medium" style={{ fontSize: 13, letterSpacing: '.32em', textIndent: '.32em' }}>{code}</p></Reveal>
          <Reveal still={still} delay={0.3}><p className="m-0 mt-3 max-w-[250px] mx-auto" style={{ fontSize: 13, lineHeight: 1.5, color: '#8A7F72', textWrap: 'balance' }}>{ACCESS_NOTE}</p></Reveal>
          <CardActions card={card} token={token} still={still} preview={preview} style={{ marginTop: 28 }} />
        </section>
      )}

      {/* 08 · Galerie */}
      {gallery.length > 0 && (
        <section className="w-full" style={{ marginTop: 96 }}>
          <H2 still={still} kicker="Galerie">Nos plus beaux instants</H2>
          <Gallery photos={gallery} reduced={!!reduced} preview={preview} onOpen={show(gallery)} />
        </section>
      )}

      <footer className="mt-20"><p className="hd-caps m-0" style={{ fontSize: 9.5, opacity: 0.6 }}>Créé avec Signiq</p></footer>
      <div className="hd-grain" />
      <AnimatePresence>{open && <Lightbox photos={open.list} start={open.index} onClose={closeBox} />}</AnimatePresence>
    </div>
  )
}
