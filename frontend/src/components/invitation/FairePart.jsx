import { motion } from 'motion/react'
import Icon from '../ui/Icon'
import { API_BASE } from '../../lib/axios'
import { PROGRAM_ICONS, calendarHref, eventNames, googleCalendarUrl, isAndroid, mapsUrl, sealOf, startOf } from '../../lib/invitationTheme'

/**
 * Modèle « faire-part » de l'invitation en ligne : un faire-part sur papier
 * aquarellé qui se lit en défilant — collage de photos, monogramme floral,
 * prénoms et verset, « Vous êtes invité(e) » au nom de l'invité, calendrier
 * avec le jour entouré, lieu (Google Maps), programme illustré, thème / dress
 * code, table de l'invité, confirmation, pass d'accès, et la photo du couple
 * en bord de papier déchiré.
 */

const CRIMSON = '#c2272d'
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const CEREMONY = { mariage: 'Mariage', gala: 'Soirée de gala', anniversaire: 'Anniversaire', concert: 'Concert', ceremonie: 'Cérémonie' }
const CELEBRATION = { mariage: 'la célébration de leur mariage', anniversaire: 'la célébration de cet anniversaire' }

/** Bord de papier déchiré (irrégulier, mais identique d'une visite à l'autre). */
const TORN = (() => {
  const pts = []
  let seed = 7
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  for (let x = 0; x <= 100; x += 2 + rnd() * 3) pts.push(`${x.toFixed(1)}% ${(1.5 + rnd() * 4.5 + (rnd() > 0.85 ? 2.5 : 0)).toFixed(1)}%`)
  return `polygon(0 4%, ${pts.join(', ')}, 100% 3%, 100% 100%, 0 100%)`
})()

const view = (reduced, delay = 0) => reduced ? {} : {
  initial: { opacity: 0, y: 26 }, whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' }, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
}

/** Brin botanique doré (tige + feuilles + fleur), en trait fin. */
function Sprig({ color, className = '', style }) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" aria-hidden>
      <path d="M12 110 C 40 80, 62 58, 104 18" />
      {[[30, 88, -40], [44, 74, 30], [58, 62, -45], [70, 50, 25], [84, 38, -50]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="9" ry="3.6" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <circle cx="104" cy="18" r="5" />
      {[0, 72, 144, 216, 288].map(a => (
        <ellipse key={a} cx="104" cy="9" rx="3.4" ry="6" transform={`rotate(${a} 104 18)`} />
      ))}
    </svg>
  )
}

/** Monogramme : initiales en didone, « & » doré, couronne florale qui se dessine. */
function Monogram({ letters, t, reduced, size = 200 }) {
  const [a, b] = letters.length === 2 ? letters : [letters[0], null]
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0" fill="none" aria-hidden>
        <motion.path d="M 46 160 A 74 74 0 1 1 164 150" stroke={t.goldInk} strokeWidth="1.4" strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.8, ease: 'easeInOut' }} />
        {[[52, 170], [62, 176], [74, 180], [150, 160], [140, 168]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill={t.goldInk} />)}
      </svg>
      <Sprig color={t.goldInk} className="absolute" style={{ width: size * 0.34, left: size * 0.02, top: size * 0.04, transform: 'scaleX(-1) rotate(-35deg)' }} />
      <Sprig color={t.goldInk} className="absolute" style={{ width: size * 0.3, right: size * 0.02, bottom: size * 0.06, transform: 'rotate(100deg)' }} />
      <div className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: t.ink }}>
        <span className="font-semibold leading-none" style={{ fontSize: size * 0.46, marginRight: b ? -size * 0.06 : 0 }}>{a}</span>
        {b && <span className="leading-none italic" style={{ fontSize: size * 0.2, color: t.goldInk, margin: `${size * 0.1}px -${size * 0.04}px 0` }}>&amp;</span>}
        {b && <span className="font-semibold leading-none" style={{ fontSize: size * 0.46, marginTop: size * 0.14 }}>{b}</span>}
      </div>
    </div>
  )
}

/** Collage de photos (jusqu'à 3 en tête), celle du milieu plus haute. */
function Collage({ photos, reduced }) {
  const shown = photos.slice(0, 3)
  if (!shown.length) return null
  if (shown.length === 1) {
    return (
      <motion.img src={shown[0]} alt="" className="block w-full aspect-[4/3] object-cover"
        initial={reduced ? false : { opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }} />
    )
  }
  return (
    <div className="flex items-end gap-1 px-1">
      {shown.map((src, i) => {
        const middle = shown.length === 3 && i === 1
        return (
          <motion.img key={src} src={src} alt="" draggable={false}
            className={`block object-cover shadow-md ${middle ? 'w-[38%] aspect-[3/4.4] -mb-3 z-10' : 'flex-1 min-w-0 aspect-[3/4]'}`}
            initial={reduced ? false : { opacity: 0, y: middle ? -30 : 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 + i * 0.18, ease: [0.22, 1, 0.36, 1] }} />
        )
      })}
    </div>
  )
}

/** Semaine de l'événement, le jour entouré à la main. */
function CalendarStrip({ date, reduced }) {
  const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const days = DAYS.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
  return (
    <div className="mt-2">
      <p className="inv-cinzel text-[15px] font-semibold tracking-[0.32em] uppercase">{date.toLocaleDateString('fr-FR', { month: 'long' })}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {DAYS.map(d => <span key={d} className="inv-serif italic text-[14px] opacity-80">{d}</span>)}
        {days.map(d => {
          const on = d.toDateString() === date.toDateString()
          return (
            <span key={d.toISOString()} className="relative inv-serif text-[19px] py-1.5">
              {d.getDate()}
              {on && (
                <svg viewBox="0 0 40 46" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-11 overflow-visible" fill="none" aria-hidden>
                  <motion.path d="M 22 3 C 6 2, 2 18, 4 28 C 6 40, 24 45, 33 36 C 41 27, 38 8, 24 5 C 18 4, 12 7, 10 10"
                    stroke={CRIMSON} strokeWidth="1.8" strokeLinecap="round"
                    initial={reduced ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                    transition={{ duration: 1.1, delay: 0.3, ease: 'easeInOut' }} />
                </svg>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Programme : ligne verticale, étapes en alternance gauche / droite. */
function Program({ items, t, reduced }) {
  if (!items?.length) return null
  return (
    <div className="relative mt-8 mx-auto max-w-[340px]">
      <motion.span aria-hidden className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 origin-top" style={{ background: t.ink, opacity: 0.55 }}
        initial={reduced ? false : { scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 1.4, ease: 'easeInOut' }} />
      <ol className="relative space-y-5">
        {items.map((it, i) => {
          const left = i % 2 === 1
          const [icon] = PROGRAM_ICONS[it.icon] || PROGRAM_ICONS.start
          return (
            <motion.li key={i} className={`relative flex items-center gap-3 w-1/2 ${left ? 'pr-6 flex-row-reverse text-right' : 'ml-auto pl-6 text-left'}`}
              initial={reduced ? false : { opacity: 0, x: left ? -24 : 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.7, delay: 0.05 * i }}>
              <span aria-hidden className={`absolute top-1/2 h-px w-5 ${left ? 'right-0' : 'left-0'}`} style={{ background: t.ink, opacity: 0.55 }} />
              <Icon name={icon} size={30} weight={200} className="flex-shrink-0" style={{ color: t.ink }} />
              <span className="min-w-0">
                <span className="block inv-cinzel text-[13px] font-semibold tracking-[0.08em]">{it.time}</span>
                <span className="block inv-serif text-[13.5px] leading-tight" style={{ fontVariantCaps: 'small-caps' }}>{it.label}</span>
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}

/** Silhouettes costume / robe du dress code. */
function DressIcons({ color }) {
  return (
    <svg viewBox="0 0 64 34" className="w-16 mx-auto mt-3" fill={color} aria-hidden>
      <path d="M8 4 L14 2 L18 8 L22 2 L28 4 L30 32 L6 32 Z" />
      <path d="M16 9 L18 14 L20 9 Z" fill="#fff" />
      <path d="M44 2 L50 2 L51 8 L58 32 L36 32 L43 8 Z" />
    </svg>
  )
}

/** Ligne pointillée à compléter (nom de l'invité, table), écrite à la main. */
function Dotted({ label, value, t }) {
  return (
    <div className="mt-2">
      {label && <p className="inv-serif text-[14px]" style={{ fontVariantCaps: 'small-caps' }}>{label}</p>}
      <p className="relative mx-auto max-w-[300px] min-h-[42px] border-b-2 border-dotted pb-0.5" style={{ borderColor: `${t.ink}66` }}>
        <span className="inv-script text-[34px] leading-none" style={{ color: t.ink }}>{value || ' '}</span>
      </p>
    </div>
  )
}

export default function FairePart({ occasion, guest, token, tableLabel, confirmed, declined, busy, err, respond, rsvpRef, t, reduced }) {
  const c = occasion.content || {}
  const photos = occasion.photos?.length ? occasion.photos : (occasion.cover_url ? [occasion.cover_url] : [])
  const closingPhoto = photos.length > 3 ? photos[3] : photos[photos.length - 1]
  const { title, couple } = eventNames(occasion.name)
  const date = startOf(occasion)
  const time = occasion.starts_at ? `${String(date.getHours()).padStart(2, '0')} H ${String(date.getMinutes()).padStart(2, '0')}'` : null
  const [venue, ...rest] = (occasion.location || '').split(',')
  const address = rest.join(',').trim()
  const families = c.families || (couple ? `${couple[0]} & ${couple[1]}` : occasion.organization)
  const sc = { fontVariantCaps: 'small-caps' }

  return (
    <main className="relative z-10 mx-auto max-w-[480px] overflow-hidden text-center shadow-[0_0_60px_rgba(0,0,0,.08)]"
      data-testid="faire-part"
      style={{
        color: t.ink,
        background: `radial-gradient(60% 40% at 10% 8%, rgba(120,116,110,.10), transparent 70%),
          radial-gradient(50% 35% at 95% 30%, rgba(120,116,110,.09), transparent 70%),
          radial-gradient(70% 40% at 0% 62%, rgba(120,116,110,.08), transparent 70%),
          radial-gradient(60% 40% at 100% 85%, rgba(120,116,110,.10), transparent 70%), #fbfaf7`,
      }}>
      {/* Décor floral en tête */}
      <div className="relative pt-6">
        <Sprig color={t.goldInk} className="absolute left-3 top-2 w-16 opacity-70" style={{ transform: 'scaleX(-1)' }} />
        <Sprig color={t.goldInk} className="absolute right-3 top-2 w-16 opacity-70" />
        <div className={photos.length ? 'pt-10' : 'pt-4'}><Collage photos={photos} reduced={reduced} /></div>
      </div>

      <div className="px-6 pb-4">
        <motion.div {...view(reduced)} className="mt-8"><Monogram letters={sealOf(occasion)} t={t} reduced={reduced} /></motion.div>

        <motion.h1 {...view(reduced, 0.1)} className="mt-2 inv-serif text-[30px] leading-tight">
          {couple ? <>{couple[0]} <span className="inv-script text-[26px] align-middle" style={{ color: t.goldInk }}>&amp;</span> {couple[1]}</> : title}
        </motion.h1>
        {c.verse && (
          <motion.p {...view(reduced, 0.15)} className="mt-2 inv-serif italic text-[14.5px] leading-snug px-2">
            “ {c.verse} ”{c.verse_ref && <b className="block not-italic font-semibold text-[13px] mt-0.5">{c.verse_ref}</b>}
          </motion.p>
        )}

        <motion.div {...view(reduced)} className="mt-8">
          <p className="inv-script text-[46px] leading-none">Vous êtes invité(e)</p>
          <div className="mt-5"><Dotted label="Mr, Mme, Couple" value={guest.name} t={t} /></div>
        </motion.div>

        <motion.div {...view(reduced)} className="mt-7 inv-serif text-[15px] leading-relaxed space-y-4 px-1" style={sc}>
          <p className="whitespace-pre-line">{c.intro || 'Un jour mémorable, venez célébrer avec nous ;\nnous avons dit oui à l’amour.'}</p>
          <p>
            C’est avec beaucoup de joie qu’ensemble avec leurs familles,
            <b className="block text-[17px] font-semibold my-0.5">{families}</b>
            ont l’honneur de vous inviter à {CELEBRATION[occasion.type] || 'cet événement'},
          </p>
          <p>et aimeraient partager ce bonheur avec vous lors de cette occasion spéciale.</p>
        </motion.div>

        {/* Date et lieu */}
        <motion.section {...view(reduced)} className="mt-9">
          <p className="inv-script text-[44px] leading-none">{c.ceremony || CEREMONY[occasion.type] || title}</p>
          <CalendarStrip date={date} reduced={reduced} />
          {occasion.location && (
            <div className="relative mt-6">
              <Icon name="location_on" size={28} fill={1} style={{ color: CRIMSON }} />
              <p className="inv-cinzel text-[30px] font-semibold leading-none mt-1 tracking-wide">{venue.trim()}</p>
              {address && <p className="inv-serif text-[14px] mt-1.5 px-6" style={sc}>{address}</p>}
              {time && <p className="inv-cinzel text-[17px] font-semibold mt-2">{time}</p>}
              <a href={mapsUrl(occasion.location)} target="_blank" rel="noreferrer"
                className="mt-2 inline-flex items-end gap-1 inv-serif text-[13px] font-semibold underline underline-offset-2" style={sc}>
                <svg viewBox="0 0 60 30" className="w-11 mb-1" fill="none" stroke={t.ink} strokeWidth="1.3" strokeLinecap="round" aria-hidden>
                  <path d="M2 10 C 14 2, 26 4, 30 12 C 33 20, 22 22, 22 14 C 22 6, 40 4, 52 22" /><path d="M46 20 L52 23 L54 16" />
                </svg>
                Cliquez ici pour Google Maps
              </a>
            </div>
          )}
        </motion.section>

        <Program items={c.program} t={t} reduced={reduced} />

        {(c.dress_title || c.dress_text) && (
          <motion.section {...view(reduced)} className="mt-12">
            <p className="inv-cinzel text-[20px] font-semibold tracking-[0.12em]">THÈME</p>
            {c.dress_title && <p className="inv-script text-[42px] leading-tight">{c.dress_title}</p>}
            <DressIcons color={t.ink} />
            {c.dress_text && <p className="mt-3 inv-serif text-[14px] leading-relaxed whitespace-pre-line px-2" style={sc}>{c.dress_text}</p>}
          </motion.section>
        )}

        <motion.section {...view(reduced)} className="mt-10">
          <p className="inv-serif text-[17px] font-semibold" style={sc}>Votre table</p>
          <Dotted value={tableLabel} t={t} />
        </motion.section>

        <motion.p {...view(reduced)} className="mt-8 inv-serif text-[14.5px] leading-relaxed whitespace-pre-line px-1" style={sc}>
          {c.closing || 'Nous sommes ravis de vous convier à cette fête et vous remercions chaleureusement de votre présence.\nVotre soutien et votre amour sont essentiels pour nous.'}
        </motion.p>

        {/* Réponse */}
        <motion.section {...view(reduced)} ref={rsvpRef} className="mt-10">
          {occasion.is_expired ? (
            <p className="inv-serif italic text-lg opacity-80">Cet événement est passé. Merci d’en avoir fait partie.</p>
          ) : confirmed ? (
            <div>
              <p className="inv-script text-[38px] leading-none">Merci, à très bientôt !</p>
              <p className="inv-serif text-[14px] mt-2" style={sc}>Présence confirmée{tableLabel && ` · ${tableLabel}`}</p>
              <button onClick={() => respond('decline')} disabled={busy} className="mt-3 inv-serif text-[13px] underline underline-offset-4 disabled:opacity-50 opacity-70">
                Finalement, je ne pourrai pas venir
              </button>
            </div>
          ) : declined ? (
            <div>
              <p className="inv-serif italic text-xl">Vous nous manquerez. Merci pour votre réponse.</p>
              <button onClick={() => respond('confirm')} disabled={busy} className="mt-3 inv-serif text-[14px] font-semibold underline underline-offset-4 disabled:opacity-50" style={sc}>
                Je serai finalement présent(e)
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="inv-serif text-[17px] font-semibold" style={sc}>Confirmez votre présence</p>
              <motion.button onClick={() => respond('confirm')} disabled={busy} whileTap={{ scale: 0.96 }}
                className="rounded-full px-8 py-3 inv-cinzel text-[13px] font-semibold tracking-[0.18em] text-white disabled:opacity-70 flex items-center gap-2"
                style={{ background: t.ink, boxShadow: `0 0 0 1.5px ${t.goldInk}, 0 10px 22px -10px ${t.ink}` }}>
                {busy && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                JE SERAI PRÉSENT(E)
              </motion.button>
              <button onClick={() => respond('decline')} disabled={busy} className="inv-serif text-[13.5px] underline underline-offset-4 disabled:opacity-50 opacity-75">
                Je ne pourrai pas venir
              </button>
            </div>
          )}
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
        </motion.section>

        {/* Pass d'accès */}
        {!occasion.is_expired && (
          <motion.section {...view(reduced)} data-testid="invitation-access" className="mt-10">
            <p className="inv-cinzel text-[13px] font-semibold tracking-[0.28em]" style={{ color: t.goldInk }}>VOTRE PASS D’ACCÈS</p>
            {guest.qr && (
              <div className="mx-auto mt-4 w-48 p-[2px]" style={{ background: t.gold }}>
                <div className="bg-white p-3"><img src={guest.qr} alt="Votre QR d'accès" className="w-full aspect-square" /></div>
              </div>
            )}
            <p className="inv-serif italic text-[15px] mt-3 opacity-80">À présenter à l’accueil le jour J.</p>
            <div className={`mt-5 grid gap-3 ${occasion.location ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <a href={calendarHref(token, API_BASE)} aria-label="Ajouter l'événement à mon agenda"
                className="rounded-full py-2.5 inv-cinzel text-[12px] font-semibold tracking-[0.14em] flex items-center justify-center gap-1.5 text-white"
                style={{ background: t.ink }}>
                <Icon name="event" size={17} /> AGENDA
              </a>
              {occasion.location && (
                <a href={mapsUrl(occasion.location)} target="_blank" rel="noreferrer"
                  className="rounded-full py-2.5 inv-cinzel text-[12px] font-semibold tracking-[0.14em] flex items-center justify-center gap-1.5"
                  style={{ border: `1px solid ${t.ink}55` }}>
                  <Icon name="near_me" size={17} /> ITINÉRAIRE
                </a>
              )}
            </div>
            {isAndroid() && (
              <p className="mt-3 inv-serif text-[13px] leading-relaxed opacity-80">
                Appuyez sur « Ouvrir » une fois le fichier téléchargé : votre agenda s’ouvre avec l’événement.{' '}
                <a href={googleCalendarUrl(occasion, { inviteUrl: window.location.href, table: tableLabel })}
                  target="_blank" rel="noreferrer" className="underline underline-offset-4 font-semibold">Ou ajouter à Google Agenda</a>
              </p>
            )}
          </motion.section>
        )}

        {occasion.video_url && (
          <motion.section {...view(reduced)} className="mt-10">
            <p className="inv-cinzel text-[13px] font-semibold tracking-[0.28em]" style={{ color: t.goldInk }}>UN MOT POUR VOUS</p>
            <video src={occasion.video_url} className="mt-4 mx-auto w-full max-w-[280px] aspect-[9/16] object-cover bg-black" autoPlay muted loop playsInline controls />
          </motion.section>
        )}

        <motion.div {...view(reduced)} className="mt-12"><Monogram letters={sealOf(occasion)} t={t} reduced={reduced} size={150} /></motion.div>
      </div>

      {/* Photo finale en bord de papier déchiré */}
      {closingPhoto && (
        <motion.div {...view(reduced)} className="relative -mt-6">
          <img src={closingPhoto} alt="" className="block w-full aspect-[4/5] object-cover"
            style={{ clipPath: TORN }} />
          <span aria-hidden className="absolute right-6 top-[12%] w-1.5 h-1.5 rounded-full bg-white/80" />
          <span aria-hidden className="absolute right-10 top-[16%] w-1 h-1 rounded-full bg-white/70" />
          <span aria-hidden className="absolute right-4 top-[20%] w-2 h-2 rounded-full bg-white/60" />
        </motion.div>
      )}
      <p className="py-4 inv-jost text-[11px] opacity-60">Propulsé par Signiq</p>
    </main>
  )
}
